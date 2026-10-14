// Falla si el reporte JSON de Cucumber no tiene escenarios ejecutados.
// Cucumber termina en verde con 0 escenarios cuando todo está @wip: eso no es cobertura.
//
// Uso: node ci/check-cucumber-report.mjs [ruta-del-reporte]
import { readFileSync, existsSync, appendFileSync } from 'node:fs';

const ruta = process.argv[2] ?? 'newman/cucumber-report.json';

if (!existsSync(ruta)) {
  console.error(`::error::No existe el reporte de Cucumber en ${ruta}.`);
  process.exit(1);
}

const features = JSON.parse(readFileSync(ruta, 'utf8'));
const escenarios = features.flatMap((f) => (f.elements ?? []).filter((e) => e.type === 'scenario'));
const porFeature = features
  .map((f) => ({ uri: f.uri, total: (f.elements ?? []).filter((e) => e.type === 'scenario').length }))
  .filter((f) => f.total > 0);

const resumen = [
  `Escenarios BDD ejecutados: ${escenarios.length}`,
  ...porFeature.map((f) => `- ${f.uri}: ${f.total}`),
].join('\n');
console.log(resumen);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Cucumber\n\n${resumen}\n`);

if (escenarios.length === 0) {
  console.error('::error::Cucumber no ejecutó ningún escenario (¿todos los features siguen @wip?).');
  process.exit(1);
}
