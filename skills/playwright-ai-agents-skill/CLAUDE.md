# playwright-ai-agents-skill — CLAUDE.md

## Project

AI-agent governance skill on top of Playwright, owned by aiquaa-labs. Implements a
low-token strategy: AI plans, generates and repairs tests; Playwright Test executes them with
zero model calls. Sits above `playwright-skill` (which owns specs, Page Objects, config, CI and
the PDF reporter) and never duplicates its generation logic. Supports two execution
architectures with the same Planner/Generator/Classifier/Healer: Playwright Test + POM
(default) and Cucumber (BDD) + Playwright + POM (`examples/bdd/`,
`references/bdd-pom-architecture.md`).

## Structure

```
skills/playwright-ai-agents/   ← main skill (intake, plan, generate, classify, heal, budget, impact, pipeline)
scripts/classify-failures.mjs  ← deterministic failure classifier (Node ≥18, no deps, no LLM)
references/                    ← estrategia-ia.md (source doc), failure-taxonomy.md, healing-guardrails.md,
                                  model-routing.md, metrics.md
examples/                      ← PLAN_, T_ + pages/, seed, HEALER_PROMPT, sample results → CLASIF_, .env.ai, Y_
examples/bdd/                   ← F_*.feature, S_*.steps.ts, support/{world,hooks}.ts, cucumber.js,
                                  cucumber-report.sample.json → CLASIF_BDD_EJEMPLO.json (reuses examples/pages/)
docs/                          ← usage guide in Spanish
.github/workflows/             ← CI for the skill package itself
```

## Key rules

- No AI during test execution or in CI. The generated `Y_*_playwright_ai.yml` contains zero
  model calls; the Healer runs outside CI, on demand.
- Failure classification is rule-based (`RULES` array in `scripts/classify-failures.mjs`).
  `references/failure-taxonomy.md` documents the same rules in the same order — change the
  script first, then the doc. LLM re-reading of `UNKNOWN` never flips `healerAllowed`.
- `healerAllowed = category === 'TEST_BUG' && confidence === 'high'`. `TEST_BUG/medium` needs
  explicit human confirmation. Flaky tests never go to the Healer.
- Do not use `waiting for getBy…` as a locator-failure signal — it appears in the call log of
  every locator assertion, including content mismatches.
- `scripts/classify-failures.mjs` auto-detects input shape: an object with `suites` is a
  Playwright Test JSON reporter, an array is a cucumber-js JSON formatter. Cucumber `undefined`/
  `pending`/`ambiguous` steps get a synthesized message prefix (`Undefined step:`, ...) so the
  same regex rules apply; both map to `TEST_BUG/medium` (never Healer — resolved via
  `/pw-ia:generate --bdd` or by unifying step expressions, not by repairing a locator).
  Cucumber JSON has no flaky concept — the example `cucumber.js` profiles set `retry: 0`.
- Healer budget: `AI_MAX_HEAL_ATTEMPTS` default 2 (max 3); exhausted → `HUMAN_REVIEW_REQUIRED`.
  Tier escalation consumes an attempt.
- Healer blacklist (never auto-modified): business expected results, calculations, balances,
  accounting/regulatory rules, functional HTTP status, permissions, monetary limits.
- Healer prompt: `[STATIC]` block first and byte-identical across calls (prompt caching);
  only `[DYNAMIC]` varies. Send only the failing `test()`, used locators, ≤20 error lines and a
  relevant accessibility fragment — never full spec, DOM, trace or video.
- Generation always goes through `../playwright-skill/skills/playwright/SKILL.md`.
- BDD layering (`features/` → `steps/` → `support/world.ts` → `pages/`): the Healer may only
  touch `pages/` and technical fixtures in `support/`. It never edits a `.feature` file or the
  Cucumber expression of a step, and never touches an `expect` inside a `Then`. Same
  `pages/*Page.ts` Page Object is shared between the Playwright Test spec and the Cucumber
  steps — one POM, two glue layers.
- Never commits, pushes or merges — delivery via `course-pr-skill`.
- Provider-agnostic: tiers (económico/intermedio/avanzado), never hardcoded model IDs.

## File naming convention

- Planner output: `PLAN_<FEATURE>.md` under `specs/<domain>/`
- Classifier output: `CLASIF_<NAME>.json`
- Healer output: `HEAL_<TEST>.md`
- Pipeline: `Y_<NAME>_playwright_ai.yml`
- Specs keep `playwright-skill` convention: `T_<FLOW>.spec.ts`
- BDD: `F_<DOMAIN>.feature` under `features/<domain>/`, `S_<domain>.steps.ts` under `steps/`

## Verification

```bash
node scripts/classify-failures.mjs --input examples/playwright-results.sample.json --out /tmp/c.json
diff <(node -e "console.log(JSON.stringify(require('/tmp/c.json')))") \
     <(node -e "console.log(JSON.stringify(require('./examples/CLASIF_EJEMPLO.json')))")

node scripts/classify-failures.mjs --input examples/bdd/cucumber-report.sample.json --out /tmp/cb.json
diff <(node -e "console.log(JSON.stringify(require('/tmp/cb.json')))") \
     <(node -e "console.log(JSON.stringify(require('./examples/bdd/CLASIF_BDD_EJEMPLO.json')))")
```
