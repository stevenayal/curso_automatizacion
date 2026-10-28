import { After, AfterAll, Before, Status } from '@cucumber/cucumber';
import { chromium, type Browser } from '@playwright/test';
import { TransferenciasFixture } from '../../../grupos/grupo-04-transferencias-pagos/fixtures/TransferenciasFixture';
import { SandboxLoginPage } from '../../../grupos/grupo-04-transferencias-pagos/playwright/pages/SandboxLoginPage';
import type { G04World } from '../steps/transferencias.steps';

// Navegador propio de @grupo-04 (como ahorros.hooks.ts); se lanza al primer escenario @web.
let browser: Browser | undefined;

// Todos los escenarios de G04 corren sobre un cliente propio: ninguno toca datos compartidos.
Before({ tags: '@grupo-04 and not @wip', timeout: 120_000 }, async function (this: G04World) {
  this.g04 = { fixture: new TransferenciasFixture() };
  await this.g04.fixture.crearCliente();
});

Before({ tags: '@grupo-04 and @web and not @wip', timeout: 120_000 }, async function (this: G04World) {
  browser ??= await chromium.launch({ headless: process.env.HEADED !== '1' });
  this.browser = browser;
  this.context = await browser.newContext({
    baseURL: process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app',
  });
  this.page = await this.context.newPage();
  await new SandboxLoginPage(this.page).ingresarCurso2(process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com');
});

After({ tags: '@grupo-04 and @web and not @wip', timeout: 120_000 }, async function (this: G04World, { result }) {
  try {
    if (result?.status === Status.FAILED && this.page) {
      await this.attach(await this.page.screenshot(), 'image/png');
    }
  } finally {
    await this.context?.close();
  }
});

After({ tags: '@grupo-04 and not @wip', timeout: 120_000 }, async function (this: G04World) {
  await this.g04?.fixture.limpiar();
});

AfterAll(async () => {
  await browser?.close();
});
