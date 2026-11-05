// world.ts — contexto por escenario: page + Page Objects (lazy) + API helper.
// Los steps nunca instancian Page Objects ni tocan `page`: piden this.transfers, this.home...
// Generado por skill playwright-ai-agents · aiquaa.com

import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { TransfersPage } from '../../pages/TransfersPage';

export class HomePage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await this.page.goto('/home');
    await expect(this.page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
  }
}

export class BankingApi {
  constructor(private readonly request: APIRequestContext) {}

  async setBalance(account: string, available: number): Promise<void> {
    const response = await this.request.post('/api/test-data/balance', { data: { account, available } });
    expect(response.ok()).toBeTruthy();
  }

  async balanceOf(account: string): Promise<number> {
    const response = await this.request.get(`/api/accounts/${account}/balance`);
    expect(response.status()).toBe(200);
    return ((await response.json()) as { available: number }).available;
  }
}

export class PlaywrightWorld extends World {
  context!: BrowserContext;
  page!: Page;
  request!: APIRequestContext;

  private cache = new Map<string, unknown>();

  constructor(options: IWorldOptions) {
    super(options);
  }

  private lazy<T>(key: string, create: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, create());
    return this.cache.get(key) as T;
  }

  get home(): HomePage {
    return this.lazy('home', () => new HomePage(this.page));
  }

  get transfers(): TransfersPage {
    return this.lazy('transfers', () => new TransfersPage(this.page));
  }

  get api(): BankingApi {
    return this.lazy('api', () => new BankingApi(this.request));
  }
}

setWorldConstructor(PlaywrightWorld);
