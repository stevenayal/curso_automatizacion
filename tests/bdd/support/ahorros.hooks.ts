import { After, AfterAll, Before, Status } from '@cucumber/cucumber';
import { chromium, type Browser } from '@playwright/test';
import { DepositosPage } from '../../../playwright/pages/DepositosPage';
import { LoansWorld } from './loans.world';

// Navegador propio de @grupo-05 (el de loans.hooks.ts no se exporta); se lanza al primer escenario.
let browser: Browser | undefined;

Before({ tags: '@grupo-05 and @web and not @wip' }, async function (this: LoansWorld) {
  browser ??= await chromium.launch({ headless: process.env.HEADED !== '1' });
  this.browser = browser;
  this.context = await browser.newContext({
    baseURL: process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app',
  });
  this.page = await this.context.newPage();
  this.depositos = new DepositosPage(this.page);
});

After({ tags: '@grupo-05 and @web and not @wip' }, async function (this: LoansWorld, { result }) {
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
