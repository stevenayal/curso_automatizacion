import { expect } from '@playwright/test';
import { BasePage } from '../../../../playwright/pages/BasePage';

/**
 * Ingreso al sandbox (Curso 2 · Productos Bancarios).
 * El admin no tiene productos propios: en cada formulario hay que elegir el
 * cliente con el que se opera (ver `TransferenciasPage.seleccionarCliente`).
 */
export class SandboxLoginPage extends BasePage {
  async ingresarCurso2(email: string): Promise<void> {
    await this.navigate('/');
    await this.page.getByRole('radio', { name: /Curso 2/ }).check();
    await this.page.getByRole('button', { name: 'Continuar' }).click();
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(this.page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
  }
}
