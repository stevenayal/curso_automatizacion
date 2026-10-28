import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { LoansPage } from '../../../playwright/pages/LoansPage';
import { CuentasPage } from "../../../grupos/grupo-01-cuentas-bancarias/playwright/pages/CuentasPage";
import { DepositosPage } from '../../../playwright/pages/DepositosPage';
export class LoansWorld extends World {
  depositos!: DepositosPage;
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


