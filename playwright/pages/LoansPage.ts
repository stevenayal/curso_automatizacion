import { expect, type Page } from '@playwright/test';

export class LoansPage {
  constructor(private readonly page: Page) {}

  async signInAsAdmin(email: string): Promise<void> {
    await this.page.goto('/');
    await this.page.getByRole('radio', { name: /Curso 2/ }).check();
    await this.page.getByRole('button', { name: 'Continuar' }).click();
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(this.page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
  }

  async openLoan(id: number): Promise<void> {
    await this.page.getByRole('link', { name: 'Préstamos' }).first().click();

    const loanLink = this.page.getByRole('link', { name: String(id), exact: true });
    const pageIndicator = this.page.getByText(/Página \d+ de \d+/).first();
    const nextPage = this.page.getByRole('button', { name: 'Siguiente' });

    await expect(pageIndicator).toBeVisible();
    const indicator = await pageIndicator.textContent();
    const totalPages = Number(indicator?.match(/de (\d+)/)?.[1] ?? 1);

    for (let page = 1; page <= totalPages; page += 1) {
      if ((await loanLink.count()) > 0) {
        await loanLink.first().click();
        await expect(this.page.getByRole('heading', { name: `Préstamo N° ${id}` })).toBeVisible();
        return;
      }

      if (page < totalPages) {
        await nextPage.click();
        await expect(pageIndicator).toContainText(`Página ${page + 1} de ${totalPages}`);
      }
    }

    throw new Error(`No se encontró el préstamo ${id} en el listado.`);
  }

  async expectLoanApproved(): Promise<void> {
    const detail = this.page.getByTestId('v2-prestamos-detail');
    await expect(detail.getByText('Estado', { exact: true })).toBeVisible();
    await expect(detail.getByText('Aprobado', { exact: true })).toBeVisible();
  }

  async expectOutstandingBalance(balance: string): Promise<void> {
    const detail = this.page.getByTestId('v2-prestamos-detail');
    await expect(detail.getByText('Saldo pendiente', { exact: true })).toBeVisible();
    await expect(detail.getByText(balance, { exact: true })).toBeVisible();
  }

  async expectNextPendingInstallment(): Promise<void> {
    const nextInstallment = this.page.getByTestId('v2-prestamos-cuotas-row-6');
    await expect(nextInstallment).toContainText('Pendiente');
  }
}
