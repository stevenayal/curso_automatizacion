// Lee el JSON de cucumber-js, resume los escenarios y falla si no se ejecuto ninguno.
//
// Uso: node scripts/check-cucumber-results.mjs results/cucumber.json
//
// - Exit 1 si el archivo no existe o si hay 0 escenarios: un job sin pruebas no es cobertura.
// - No cambia el resultado de los escenarios: eso lo decide el paso de Cucumber.
// - En GitHub Actions agrega el resumen a $GITHUB_STEP_SUMMARY (version, ejecucion, escenarios).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const file = process.argv[2] || 'results/cucumber.json';

if (!existsSync(file)) {
  console.error(`No existe ${file}: Cucumber no genero resultados.`);
  process.exit(1);
}

const features = JSON.parse(readFileSync(file, 'utf8'));
const rows = [];
for (const feature of features) {
  for (const element of feature.elements ?? []) {
    if (element.type !== 'scenario') continue;
    const statuses = (element.steps ?? []).map((step) => step.result?.status);
    const status = statuses.find((s) => s !== 'passed') ?? 'passed';
    const tags = (element.tags ?? []).map((t) => t.name).join(' ');
    rows.push({ feature: feature.name, scenario: element.name, tags, status, uri: feature.uri });
  }
}

const passed = rows.filter((r) => r.status === 'passed').length;
const failed = rows.length - passed;

const lines = [
  '## Evidencia BDD + POM',
  '',
  `- Commit: \`${process.env.GITHUB_SHA ?? 'local'}\``,
  `- Rama: \`${process.env.GITHUB_REF_NAME ?? 'local'}\``,
  `- Ejecucion: ${process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : 'local'}`,
  `- Ambiente: \`${process.env.BASE_URL ?? 'default'}\``,
  `- Escenarios: ${rows.length} ejecutados, ${passed} ok, ${failed} con fallo`,
  '',
  '| Resultado | Feature | Escenario | Tags |',
  '| --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.status} | ${r.feature} | ${r.scenario} | ${r.tags} |`),
  '',
];
const summary = lines.join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

if (rows.length === 0) {
  console.error('Cero escenarios ejecutados: revisar tags @wip o el filtro CUCUMBER_TAGS.');
  process.exit(1);
}
