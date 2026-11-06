import { expect, type Locator, type Page } from '@playwright/test';

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

  /** Verifica que el préstamo exista en el listado, sin abrir el detalle. */
  async expectLoanListed(id: number): Promise<void> {
    const loanLink = await this.locateInList(id);
    await expect(loanLink).toBeVisible();
  }

  async openLoan(id: number): Promise<void> {
    const loanLink = await this.locateInList(id);
    await loanLink.click();
    await expect(this.page.getByRole('heading', { name: `Préstamo N° ${id}` })).toBeVisible();
  }

  async expectLoanApproved(): Promise<void> {
    await expect(this.page.getByTestId('v2-prestamos-detail-estado')).toHaveText('Aprobado');
  }

  async expectOutstandingBalance(balance: string): Promise<void> {
    await expect(this.page.getByTestId('v2-prestamos-detail-saldo')).toHaveText(balance);
  }

  /**
   * La UI paga en orden: solo la primera cuota pendiente tiene el botón "Pagar".
   * Se localiza esa fila por el botón en lugar de fijar un número de cuota.
   */
  async expectNextPendingInstallment(): Promise<void> {
    const installmentWithPayButton = this.page
      .getByTestId('v2-prestamos-cuotas-list')
      .locator('tr')
      .filter({ has: this.page.getByRole('button', { name: 'Pagar' }) });

    await expect(installmentWithPayButton).toHaveCount(1);
    await expect(installmentWithPayButton).toContainText('Pendiente');
  }

  /**
   * Recorre el listado paginado hasta encontrar el préstamo.
   * Se entra siempre por URL para partir de la página 1 y evitar que la
   * navegación SPA deje filas de la página anterior mientras recarga.
   */
  private async locateInList(id: number): Promise<Locator> {
    await this.page.goto('/v2/prestamos');

    const loanLink = this.page.locator(`table tbody a[href="/v2/prestamos/${id}"]`).first();
    const pageIndicator = this.page.getByText(/^Página \d+ de \d+$/).first();
    const nextPage = this.page.getByRole('button', { name: 'Siguiente' });
    const firstLoanLink = this.page.locator('table tbody a[href^="/v2/prestamos/"]').first();

    await expect(pageIndicator).toHaveText(/^Página 1 de \d+$/);

    for (;;) {
      if ((await loanLink.count()) > 0) return loanLink;
      if (await nextPage.isDisabled()) break;

      // Espera a que la tabla reemplace las filas de la página actual antes
      // de volver a buscar, no solo a que cambie el indicador de página.
      const previousFirstHref = await firstLoanLink.getAttribute('href');
      await nextPage.click();
      await expect(firstLoanLink).not.toHaveAttribute('href', previousFirstHref ?? '');
    }

    throw new Error(`No se encontró el préstamo ${id} en el listado.`);
  }
}
