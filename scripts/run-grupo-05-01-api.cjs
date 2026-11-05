// Ejecuta la misma coleccion en Windows y en Actions sin imprimir la API key.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });

const apiKey = process.env.API_KEY;
if (!apiKey || !apiKey.trim()) {
  console.error('Falta API_KEY. Configurar .env local o el secret API_KEY de GitHub.');
  process.exit(1);
}

const group = path.join(root, 'grupos/grupo-05-01-ahorros-depositos/postman');
const output = path.join(root, 'newman/grupo-05-01');
fs.mkdirSync(output, { recursive: true });

const redact = (value) => value.split(apiKey).join('[REDACTED]');
const newman = require('newman');
newman.run({
  collection: path.join(group, 'grupo-05-ahorros-y-depositos.postman_collection.json'),
  environment: path.join(group, 'E_GRUPO_05_AHORROS_DEPOSITOS.postman_environment.json'),
  envVar: [
    { key: 'apiKey', value: apiKey },
    { key: 'baseUrl', value: process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app' },
  ],
  // Incluye los 9 escenarios en orden y sus consultas SQL en pre/post scripts.
  delayRequest: 2500,
  timeoutRequest: 15000,
  timeoutScript: 30000,
  reporters: ['cli', 'junit'],
  reporter: { junit: { export: path.join(output, 'newman-junit.xml') } },
}, (error, summary) => {
  try {
    if (summary) {
      // Mismo formato que el reporter JSON de Newman; omitir su cola de exports.
      const { exports: unused, ...results } = summary;
      fs.writeFileSync(path.join(output, 'newman-results.json'), JSON.stringify(
        results, (key, value) => typeof value === 'string' ? redact(value) : value, 2,
      ));
    }
    const junit = path.join(output, 'newman-junit.xml');
    if (fs.existsSync(junit)) {
      fs.writeFileSync(junit, redact(fs.readFileSync(junit, 'utf8')));
    }
  } catch (reportError) {
    console.error('No se pudieron guardar los reportes:', redact(reportError.message));
    process.exitCode = 1;
  }
  if (error) console.error('Newman:', redact(error.message));
  if (error || !summary || summary.run.error || summary.run.failures.length) {
    process.exitCode = 1;
  }
});
