// cucumber.js — perfiles cucumber-js para arquitectura BDD + POM.
// El formatter JSON alimenta scripts/classify-failures.mjs (detecta formato cucumber solo).
// Generado por skill playwright-ai-agents · aiquaa.com

const common = {
  paths: ['features/**/*.feature'],
  require: ['steps/**/*.ts', 'support/**/*.ts'],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
  // Sin retry: el JSON de cucumber no distingue flaky; un retry escondería el fallo al classifier.
  retry: 0,
};

module.exports = {
  default: {
    ...common,
    format: ['progress', 'json:results/cucumber-report.json'],
    parallel: 4,
  },
  smoke: {
    ...common,
    format: ['progress', 'json:results/cucumber-report.json'],
    tags: '@smoke',
  },
  // PR: tags calculados por Test Impact Analysis → CUCUMBER_TAGS="@smoke or @transferencias"
  pr: {
    ...common,
    format: ['progress', 'json:results/cucumber-report.json'],
    tags: process.env.CUCUMBER_TAGS || '@smoke',
    parallel: 4,
  },
  // Generator: valida que cada step del .feature tenga definición, sin abrir browser ni gastar IA.
  dryrun: {
    ...common,
    dryRun: true,
    format: ['progress', 'usage:results/cucumber-usage.txt'],
  },
};
