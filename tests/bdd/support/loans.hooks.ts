import { After, AfterAll, Before, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, type Browser } from '@playwright/test';
import { LoansPage } from '../../../playwright/pages/LoansPage';
import { CuentasPage } from '../../../grupos/grupo-01-cuentas-bancarias/playwright/pages/CuentasPage';
import { LoansWorld } from './loans.world';

// El arranque de Chromium y los flujos de navegación reales superan el
// default de 5s de Cucumber para hooks y steps.
setDefaultTimeout(60_000);

let browser: Browser | undefined;

// Se lanza al primer escenario que realmente usa el navegador. Así los
// perfiles de solo API (por ejemplo `npm run test:bdd:g03-api`) no requieren
// tener Chromium instalado.
async function getBrowser(): Promise<Browser> {
  // HEADED=1 abre la ventana en local; en CI (HEADED=0 o sin definir) corre sin ventana.
  browser ??= await chromium.launch({ headless: process.env.HEADED !== '1' });
  return browser;
}

Before({ tags: '@grupo-03 and @web and not @wip' }, async function (this: LoansWorld) {
  this.browser = await getBrowser();
  this.context = await this.browser.newContext({
    baseURL: process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app',
  });
  this.page = await this.context.newPage();
  this.loans = new LoansPage(this.page);
});

After({ tags: '@grupo-03 and @web and not @wip' }, async function (this: LoansWorld, { result }) {
  if (result?.status === Status.FAILED && this.page) {
    await this.attach(await this.page.screenshot(), 'image/png');
  }
  await this.context?.close();
});

Before({ tags: '@grupo-01' }, async function (this: LoansWorld) {
  this.browser = await getBrowser();
  this.context = await this.browser.newContext({
    baseURL: process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app',
  });
  this.page = await this.context.newPage();
  this.cuentas = new CuentasPage(this.page);
});

After({ tags: '@grupo-01' }, async function (this: LoansWorld, { result }) {
  try {
    if (result?.status === Status.FAILED && this.page) {
      await this.attach(await this.page.screenshot(), 'image/png');
    }
  } finally {
    await this.context?.close();
  }
});

AfterAll(async () => {
  await browser?.close();
});
