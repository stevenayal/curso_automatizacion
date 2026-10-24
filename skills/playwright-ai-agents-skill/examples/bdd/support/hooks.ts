// hooks.ts — ciclo de vida: 1 browser por proceso, 1 context por escenario con storageState.
// Evidencias solo en fallo (trace + screenshot) — misma política que playwright.config.ts.
// Generado por skill playwright-ai-agents · aiquaa.com

import { AfterAll, After, BeforeAll, Before, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import type { PlaywrightWorld } from './world';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4200';
const STORAGE_STATE = process.env.STORAGE_STATE ?? 'playwright/.auth/user.json';

setDefaultTimeout(30_000);

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({ headless: !!process.env.CI });
});

Before(async function (this: PlaywrightWorld, { pickle }) {
  // @sin-sesion → escenarios de login: no cargar storageState.
  const anonymous = pickle.tags.some((t) => t.name === '@sin-sesion');
  this.context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: anonymous ? undefined : STORAGE_STATE,
  });
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.request = await request.newContext({
    baseURL: BASE_URL,
    storageState: anonymous ? undefined : STORAGE_STATE,
  });
});

After(async function (this: PlaywrightWorld, { pickle, result }) {
  const failed = result?.status === Status.FAILED;
  if (failed) {
    this.attach(await this.page.screenshot(), 'image/png');
    const name = pickle.name.replace(/[^\w-]+/g, '_');
    await this.context.tracing.stop({ path: `results/traces/${name}.zip` });
  } else {
    await this.context.tracing.stop();
  }
  await this.request.dispose();
  await this.context.close();
});

AfterAll(async function () {
  await browser?.close();
});
