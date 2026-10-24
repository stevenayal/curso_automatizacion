const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

if (!process.env.SANDBOX_API_KEY) {
  throw new Error('Definí SANDBOX_API_KEY antes de ejecutar el E2E del sandbox.');
}

const cucumber = join(__dirname, '../node_modules/@cucumber/cucumber/bin/cucumber-js');
const result = spawnSync(
  process.execPath,
  ['--use-system-ca', cucumber, '--profile', 'sandbox'],
  {
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: 'https://aiquaa-sandbox-web.vercel.app' },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
