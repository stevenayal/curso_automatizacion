import type { Page } from '@playwright/test';
import { BasePage } from '../../../../playwright/pages/BasePage';

export class SandboxAccessPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async iniciarSesion(email: string): Promise<number> {
    await this.page.goto('/curso');
    await this.page.getByRole('radio', { name: /Curso 2/ }).check();
    await this.page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await this.page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await this.page.getByRole('heading', { name: /Bienvenido/ }).waitFor();
    const id = Number(await this.page.getByRole('textbox', { name: 'Ir a cliente (id)', exact: true }).inputValue());
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('La sesión no identificó un cliente válido del curso 2.');
    }
    return id;
  }
}
