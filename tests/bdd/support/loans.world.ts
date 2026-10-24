import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { LoansPage } from '../../../playwright/pages/LoansPage';
import { CuentasPage } from "../../../grupos/grupo-01-cuentas-bancarias/playwright/pages/CuentasPage";
export class LoansWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  loans!: LoansPage;
  cuentas!: CuentasPage;
  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(LoansWorld);


