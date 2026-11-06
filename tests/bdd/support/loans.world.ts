import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { LoansPage } from '../../../playwright/pages/LoansPage';
import { CuentasPage } from '../../../grupos/grupo-01-cuentas-bancarias/playwright/pages/CuentasPage';
import { DepositosPage } from '../../../playwright/pages/DepositosPage';

export class LoansWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  loans!: LoansPage;
  cuentas!: CuentasPage;
  depositos!: DepositosPage;

  /** Usuario de prueba documentado para la sandbox (se puede sobreescribir por env). */
  readonly adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';

  /** Préstamo abierto por el escenario actual (útil para futuros pasos de detalle). */
  currentLoanId?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(LoansWorld);
