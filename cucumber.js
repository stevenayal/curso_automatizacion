// Perfiles de Cucumber.
//
// default : lo que corre `npm run test:bdd` y el CI. Excluye los escenarios con tag @wip.
// wip     : dry-run de los escenarios pendientes, para ver los snippets de los steps faltantes.
const paths = ['features/**/*.feature', 'grupos/**/features/**/*.feature'];
const require_ = ['tests/bdd/**/*.js', 'tests/bdd/**/*.ts'];

module.exports = {
  default: {
    paths,
    require: require_,
    requireModule: ['ts-node/register'],
    tags: 'not @wip',
    format: ['progress', 'json:newman/cucumber-report.json', 'html:newman/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
  },
  wip: {
    paths,
    require: require_,
    requireModule: ['ts-node/register'],
    tags: '@wip',
    dryRun: true,
    format: ['progress'],
    formatOptions: { snippetInterface: 'async-await' },
  },
};
