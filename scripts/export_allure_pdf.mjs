#!/usr/bin/env node
/**
 * Exporta el informe Allure HTML a PDF usando Playwright.
 *
 * Flujo:
 *   1. Sirve allure-report/ con un servidor HTTP local efímero
 *   2. Playwright abre el reporte y navega las páginas principales
 *   3. Exporta PDF a ci-evidence/INFORME_ALLURE.pdf
 */

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const REPORT_DIR = resolve(process.cwd(), 'allure-report');
const OUTPUT_DIR = resolve(process.cwd(), 'ci-evidence');
const OUTPUT_PDF = join(OUTPUT_DIR, 'INFORME_ALLURE.pdf');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = join(REPORT_DIR, urlPath);
      const ext = extname(filePath).toLowerCase();

      try {
        if (existsSync(filePath)) {
          res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
          res.end(readFileSync(filePath));
        } else {
          // SPA fallback — allure usa hash routing
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(readFileSync(join(REPORT_DIR, 'index.html')));
        }
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function exportPdf() {
  if (!existsSync(REPORT_DIR)) {
    console.error(`[export_allure_pdf] allure-report/ no encontrado en ${REPORT_DIR}`);
    console.error('[export_allure_pdf] Ejecutar: npx allure generate allure-results --clean -o allure-report');
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('[export_allure_pdf] Iniciando servidor local...');
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  console.log(`[export_allure_pdf] Servidor en ${base}`);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Página resumen (overview)
    console.log('[export_allure_pdf] Cargando resumen...');
    await page.goto(base, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3000); // gráficos SVG/Chart.js

    await page.pdf({
      path: OUTPUT_PDF,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:8px;width:100%;text-align:center;color:#555;margin-top:4mm;">
          Informe Allure — BDD + Playwright
        </div>`,
      footerTemplate: `
        <div style="font-size:8px;width:100%;text-align:center;color:#555;margin-bottom:4mm;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
    });

    console.log(`[export_allure_pdf] PDF generado: ${OUTPUT_PDF}`);
  } finally {
    await browser.close();
    server.close();
  }
}

exportPdf().catch((err) => {
  console.error('[export_allure_pdf] Error:', err.message);
  process.exit(1);
});
