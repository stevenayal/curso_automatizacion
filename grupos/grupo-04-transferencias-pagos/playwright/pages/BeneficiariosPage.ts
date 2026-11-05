import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../../../../playwright/pages/BasePage';

export interface DatosBeneficiario {
  nombre: string;
  banco: string;
  numeroCuenta: string;
  alias?: string;
}

/**
 * Alta `/v2/beneficiarios/new`. `guardar()` crea el registro: usarlo solo con
 * un cliente del fixture aislado (issue #28), nunca con clientes compartidos.
 */
export class BeneficiariosPage extends BasePage {
  private readonly form = this.page.getByTestId('v2-beneficiarios-form');

  async abrirAlta(usuarioId?: number): Promise<void> {
    await this.navigate(usuarioId ? `/v2/beneficiarios/new?usuarioId=${usuarioId}` : '/v2/beneficiarios/new');
    await expect(this.page.getByRole('heading', { name: 'Agregar beneficiario' })).toBeVisible();
  }

  async completar(datos: Partial<DatosBeneficiario>): Promise<void> {
    if (datos.nombre !== undefined) await this.campo('nombre').fill(datos.nombre);
    if (datos.banco !== undefined) await this.campo('banco').selectOption(datos.banco);
    if (datos.numeroCuenta !== undefined) await this.campo('numeroCuenta').fill(datos.numeroCuenta);
    if (datos.alias !== undefined) await this.campo('alias').fill(datos.alias);
  }

  async bancosDisponibles(): Promise<string[]> {
    return this.campo('banco').locator('option:not([value=""])').allTextContents();
  }

  async guardar(): Promise<void> {
    await this.page.getByTestId('v2-beneficiarios-submit').click();
  }

  errorDe(campo: keyof DatosBeneficiario | 'usuarioId'): Locator {
    return this.page.getByTestId(`v2-beneficiarios-field-${campo}-error`);
  }

  async sigueEnElAlta(): Promise<void> {
    await expect(this.page).toHaveURL(/\/v2\/beneficiarios\/new/);
    await expect(this.form).toBeVisible();
  }

  private campo(nombre: string): Locator {
    return this.form.getByTestId(`v2-beneficiarios-field-${nombre}`);
  }
}
