import { After, AfterAll, Before, BeforeAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, type Browser } from '@playwright/test';
import { LoansPage } from '../../../playwright/pages/LoansPage';
import { LoansWorld } from './loans.world';

// El default de Cucumber (5 s) no alcanza para el login contra la sandbox desplegada.
setDefaultTimeout(30_000);

let browser: Browser;

BeforeAll(async () => {
  // HEADED=1 abre la ventana en local; en CI (HEADED=0 o sin definir) corre sin ventana.
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});

Before({ tags: '@grupo-03 and @web and not @wip' }, async function (this: LoansWorld) {
  this.browser = browser;
  this.context = await browser.newContext({
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

AfterAll(async () => {
  await browser?.close();
});
