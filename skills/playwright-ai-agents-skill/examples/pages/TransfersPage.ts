import { expect, type Locator, type Page } from '@playwright/test';

// Page Object como compresión semántica: el Generator razona con transfer({...}),
// no con 10 líneas de getByRole. Locators siguiendo la jerarquía role → label → text → testid.
// Los data-testid son del contrato con desarrollo (ver PLAN_TRANSFERENCIAS.md).
// Mismo Page Object para Playwright Test (T_*.spec.ts) y Cucumber (bdd/steps/*.steps.ts):
// la capa POM no sabe quién la llama.

export interface TransferInput {
  origin: string;
  destination: string;
  amount: number;
}

export class TransfersPage {
  readonly origin: Locator;
  readonly destination: Locator;
  readonly amount: Locator;
  readonly submit: Locator;
  readonly confirm: Locator;
  readonly success: Locator;
  readonly rejection: Locator;

  constructor(private readonly page: Page) {
    this.origin = page.getByTestId('transfer-account-origin');
    this.destination = page.getByTestId('transfer-account-target');
    this.amount = page.getByLabel('Monto');
    this.submit = page.getByRole('button', { name: 'Transferir' });
    this.confirm = page.getByRole('button', { name: 'Confirmar transferencia' });
    this.success = page.getByTestId('transfer-success');
    this.rejection = page.getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/transferencias');
    await expect(this.submit).toBeVisible();
  }

  async transfer({ origin, destination, amount }: TransferInput): Promise<void> {
    await this.origin.selectOption({ label: origin });
    await this.destination.selectOption({ label: destination });
    await this.amount.fill(String(amount));
    await this.submit.click();
    await this.confirm.click();
  }
}
