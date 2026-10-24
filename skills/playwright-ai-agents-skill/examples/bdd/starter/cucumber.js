const { mkdirSync } = require('node:fs');
mkdirSync('results', { recursive: true });

const common = {
  paths: ['features/**/*.feature'],
  requireModule: ['ts-node/register'],
  require: ['support/world.ts', 'support/hooks.ts', 'steps/**/*.steps.ts'],
  retry: 0,
  formatOptions: { snippetInterface: 'async-await' },
};
const execution = {
  ...common,
  format: ['progress', 'json:results/cucumber-report.json', 'html:results/cucumber-report.html'],
};
module.exports = {
  default: { ...execution, tags: 'not @sandbox' },
  smoke: { ...execution, tags: '@smoke and not @sandbox' },
  sandbox: { ...execution, tags: '@sandbox' },
  pr: { ...execution, tags: process.env.CUCUMBER_TAGS || '@smoke and not @sandbox', parallel: 2 },
  dryrun: { ...common, dryRun: true, format: ['progress', 'usage:results/cucumber-usage.txt'] },
};
