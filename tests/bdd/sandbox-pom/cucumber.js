// Configuracion aislada de la suite BDD + POM contra la sandbox (Semana 7).
//
// Se ejecuta desde la raiz del repo:
//   npx cucumber-js --config tests/bdd/sandbox-pom/cucumber.js --profile dryrun
//   npx cucumber-js --config tests/bdd/sandbox-pom/cucumber.js --profile sandbox
//
// sandbox : ejecuta los escenarios activos (sin @wip) y deja results/cucumber.{html,json}.
// dryrun  : revisa enlaces Gherkin -> steps sin abrir el navegador ni tocar el sitio real.
const { mkdirSync } = require('node:fs');
mkdirSync('results', { recursive: true });

const common = {
  paths: ['features/**/*.feature', 'grupos/**/features/**/*.feature'],
  require: ['tests/bdd/**/*.ts'],
  requireModule: ['ts-node/register'],
  tags: process.env.CUCUMBER_TAGS || 'not @wip',
  retry: 0,
  formatOptions: { snippetInterface: 'async-await' },
};

module.exports = {
  sandbox: {
    ...common,
    format: ['progress', 'html:results/cucumber.html', 'json:results/cucumber.json'],
  },
  dryrun: {
    ...common,
    dryRun: true,
    strict: true,
    format: ['progress', 'json:results/cucumber-dryrun.json'],
  },
};
