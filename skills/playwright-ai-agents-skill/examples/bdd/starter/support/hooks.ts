import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, request, type Browser } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { startDemoServer } from './demo-server';
import type { PlaywrightWorld } from './world';

setDefaultTimeout(30_000);
let browser: Browser | undefined;
let server: Awaited<ReturnType<typeof startDemoServer>> | undefined;
let baseURL: string;

BeforeAll(async () => {
  if (process.env.BASE_URL) baseURL = process.env.BASE_URL;
  else {
    server = await startDemoServer();
    baseURL = server.baseURL;
  }
  try {
    browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
  } catch (error) {
    await server?.close();
    server = undefined;
    throw error;
  }
});

Before(async function (this: PlaywrightWorld, { pickle }) {
  if (!browser) throw new Error('Chromium no fue inicializado');
  const anonymous = pickle.tags.some(tag => tag.name === '@sin-sesion');
  this.context = await browser.newContext({
    baseURL,
    storageState: anonymous ? undefined : process.env.STORAGE_STATE,
  });
  this.context.setDefaultTimeout(10_000);
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  if (process.env.SANDBOX_API_KEY) {
    this.api = await request.newContext({
      baseURL: process.env.SANDBOX_API_URL ?? 'https://aiquaa-sandbox-api.vercel.app',
      extraHTTPHeaders: { 'x-api-key': process.env.SANDBOX_API_KEY },
    });
  }
});

After(async function (this: PlaywrightWorld, { result }) {
  try {
    if (result?.status === Status.FAILED && this.context) {
      await mkdir('results/traces', { recursive: true });
      const path = `results/traces/${randomUUID()}.zip`;
      try {
        if (this.page && !this.page.isClosed()) {
          await this.attach(await this.page.screenshot({ timeout: 5_000 }), 'image/png');
        }
      } finally {
        await this.context.tracing.stop({ path });
        await this.attach(`Trace: ${path}`, 'text/plain');
      }
    } else {
      await this.context?.tracing.stop();
    }
  } finally {
    await this.api?.dispose();
    await this.context?.close();
  }
});

AfterAll(async () => {
  try { await browser?.close(); }
  finally { await server?.close(); }
});
