#!/usr/bin/env node
// classify-failures.mjs — Failure Classifier determinístico para resultados Playwright.
// Generado por skill playwright-ai-agents · aiquaa.com
//
// Lee el reporter JSON de Playwright (results/playwright-results.json) o el formatter JSON de
// cucumber-js (results/cucumber-report.json) — detecta el formato solo — y etiqueta cada test o
// escenario fallido como PRODUCT_BUG | TEST_BUG | ENVIRONMENT | DATA | NETWORK | UNKNOWN.
// Sin dependencias, sin LLM. Solo TEST_BUG con confianza "high" habilita el Healer.
//
// Uso:
//   node scripts/classify-failures.mjs --input results/playwright-results.json --out CLASIF_PORTAL.json
//   node scripts/classify-failures.mjs --input results/cucumber-report.json   --out CLASIF_BDD_PORTAL.json
//
// Exit code: 0 siempre que el input sea legible (el gate de CI es el step de tests, no este).
//            2 si el input no existe o no es JSON válido.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CATEGORIES = ['PRODUCT_BUG', 'TEST_BUG', 'ENVIRONMENT', 'DATA', 'NETWORK', 'UNKNOWN'];

// Orden = prioridad. La primera regla que coincide gana.
// Mantener sincronizado 1:1 con references/failure-taxonomy.md.
// No usar "waiting for getBy..." como señal: aparece en el call log de TODA aserción sobre
// locator (incluido toHaveText con elemento presente) y clasificaría mal cambios de contenido.
export const RULES = [
  {
    id: 'step-undefined-or-pending',
    category: 'TEST_BUG',
    confidence: 'medium',
    pattern: /^(Undefined|Pending) step:/,
  },
  {
    id: 'step-ambiguous',
    category: 'TEST_BUG',
    confidence: 'medium',
    pattern: /^Ambiguous step:|Multiple step definitions match/,
  },
  {
    id: 'network-error',
    category: 'NETWORK',
    confidence: 'high',
    pattern: /net::ERR_|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up/i,
  },
  {
    id: 'browser-or-runner-setup',
    category: 'ENVIRONMENT',
    confidence: 'high',
    pattern: /Executable doesn't exist|browserType\.launch|Error reading storage state|ENOENT[^\n]*\.auth|Missing required env(ironment)? var/i,
  },
  {
    id: 'navigation-timeout',
    category: 'ENVIRONMENT',
    confidence: 'medium',
    pattern: /page\.goto: Timeout \d+ms exceeded/,
  },
  {
    id: 'http-gateway-error',
    category: 'ENVIRONMENT',
    confidence: 'medium',
    pattern: /Expected:\s*[1-4]\d\d\s+Received:\s*50[234]\b/,
  },
  {
    id: 'http-5xx',
    category: 'PRODUCT_BUG',
    confidence: 'medium',
    pattern: /Expected:\s*[1-4]\d\d\s+Received:\s*5\d\d\b|Internal Server Error/,
  },
  {
    id: 'data-conflict',
    category: 'DATA',
    confidence: 'medium',
    pattern: /Expected:\s*2\d\d\s+Received:\s*409\b|duplicate key|already exists|unique constraint|insufficient test data|seed data missing/i,
  },
  {
    id: 'locator-not-found',
    category: 'TEST_BUG',
    confidence: 'high',
    pattern: /strict mode violation|locator\.\w+: Timeout \d+ms exceeded|element\(s\) not found|element is not attached to the DOM/,
  },
  {
    id: 'element-state-sync',
    category: 'TEST_BUG',
    confidence: 'medium',
    pattern: /Expected: (visible|enabled|editable|checked)\s+Received: (hidden|disabled|readonly|unchecked)|element is outside of the viewport/,
  },
  {
    id: 'ui-text-changed',
    category: 'TEST_BUG',
    confidence: 'medium',
    pattern: /\.(toHaveText|toContainText|toHaveValue|toHaveTitle|toHaveURL)\(/,
  },
  {
    id: 'business-value-mismatch',
    category: 'PRODUCT_BUG',
    confidence: 'medium',
    pattern: /expect\(received\)\.(toBe|toEqual|toStrictEqual|toBeCloseTo|toBeGreaterThan(OrEqual)?|toBeLessThan(OrEqual)?)\(/,
  },
  {
    id: 'test-timeout',
    category: 'UNKNOWN',
    confidence: 'medium',
    pattern: /Test timeout of \d+ms exceeded|function timed out, ensure the promise resolves within \d+ milliseconds/,
  },
];

const ANSI = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

export function classifyMessage(rawMessage) {
  const message = String(rawMessage ?? '').replace(ANSI, '');
  const rule = RULES.find((r) => r.pattern.test(message));
  const category = rule ? rule.category : 'UNKNOWN';
  const confidence = rule ? rule.confidence : 'low';
  return {
    category,
    confidence,
    matchedRule: rule ? rule.id : null,
    healerAllowed: category === 'TEST_BUG' && confidence === 'high',
  };
}

function firstLine(message) {
  return String(message ?? '').replace(ANSI, '').split('\n').find((l) => l.trim()) ?? '';
}

function* walkSuites(suites, file) {
  for (const suite of suites ?? []) {
    const suiteFile = suite.file ?? file;
    for (const spec of suite.specs ?? []) yield { spec, file: spec.file ?? suiteFile };
    yield* walkSuites(suite.suites, suiteFile);
  }
}

// Playwright Test JSON reporter: { suites: [{ specs: [{ tests: [{ status, results }] }], suites }] }
function collectPlaywright(report) {
  const failed = [];
  const flaky = [];
  let total = 0;

  for (const { spec, file } of walkSuites(report.suites)) {
    for (const test of spec.tests ?? []) {
      total += 1;
      const results = test.results ?? [];
      const last = results[results.length - 1];
      const entry = { file, title: spec.title, project: test.projectName ?? '' };

      if (test.status === 'flaky') {
        flaky.push({ ...entry, retries: results.length - 1 });
        continue;
      }
      if (test.status !== 'unexpected' || !last) continue;

      failed.push({ entry, message: last.error?.message ?? last.errors?.[0]?.message ?? '' });
    }
  }
  return { total, failed, flaky };
}

// cucumber-js JSON formatter: [{ uri, elements: [{ type, name, steps: [{ keyword, name, result }] }] }]
// Estados undefined/ambiguous/pending no traen mensaje útil: se sintetiza un prefijo estable
// ("Undefined step:", ...) para que las reglas sigan siendo regex sobre texto.
const CUCUMBER_STATUS_PREFIX = { undefined: 'Undefined step', ambiguous: 'Ambiguous step', pending: 'Pending step' };

function collectCucumber(features) {
  const failed = [];
  let total = 0;

  for (const feature of features) {
    for (const scenario of feature.elements ?? []) {
      if (scenario.type === 'background') continue;
      total += 1;
      const step = (scenario.steps ?? []).find((s) => s.result?.status && s.result.status !== 'passed' && s.result.status !== 'skipped');
      if (!step) continue;

      const stepText = `${step.keyword ?? ''}${step.name ?? ''}`.trim();
      const prefix = CUCUMBER_STATUS_PREFIX[step.result.status];
      const message = prefix
        ? `${prefix}: ${stepText}\n${step.result.error_message ?? ''}`
        : step.result.error_message ?? '';
      failed.push({ entry: { file: feature.uri, title: scenario.name, project: 'cucumber', step: stepText }, message });
    }
  }
  return { total, failed, flaky: [] };
}

export function classifyReport(report) {
  const { total, failed, flaky } = Array.isArray(report) ? collectCucumber(report) : collectPlaywright(report);
  const failures = failed.map(({ entry, message }) => ({ ...entry, ...classifyMessage(message), error: firstLine(message) }));

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const f of failures) byCategory[f.category] += 1;

  return {
    summary: {
      total,
      failed: failures.length,
      flaky: flaky.length,
      byCategory,
      healerCandidates: failures.filter((f) => f.healerAllowed).length,
      maxHealAttempts: Number(process.env.AI_MAX_HEAL_ATTEMPTS ?? 2),
    },
    failures,
    flaky,
  };
}

function parseArgs(argv) {
  const args = { input: 'results/playwright-results.json', out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

function main() {
  const { input, out } = parseArgs(process.argv.slice(2));
  let report;
  try {
    report = JSON.parse(readFileSync(input, 'utf8'));
  } catch (err) {
    console.error(`classify-failures: no se pudo leer ${input} — ${err.message}`);
    process.exit(2);
  }

  const result = { source: basename(input), ...classifyReport(report) };
  const outFile = out ?? 'CLASIF_RESULTADOS.json';
  writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);

  const { summary } = result;
  console.log(`tests=${summary.total} failed=${summary.failed} flaky=${summary.flaky} healer=${summary.healerCandidates}`);
  for (const f of result.failures) {
    console.log(`${f.category.padEnd(11)} ${f.confidence.padEnd(6)} ${f.healerAllowed ? 'HEAL ' : 'HUMAN'} ${f.file} › ${f.title} [${f.project}]${f.step ? ` › ${f.step}` : ''}`);
  }
  console.log(`→ ${outFile}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
