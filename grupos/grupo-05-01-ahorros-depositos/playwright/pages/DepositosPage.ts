import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../../../playwright/pages/BasePage';

export class DepositosGrupo0501Page extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get formulario(): Locator {
    return this.page.getByTestId('v2-depositos-form');
  }

  get tasaAnual(): Locator {
    return this.page.getByRole('textbox', { name: 'Tasa anual (%)', exact: true });
  }

  get errorMonto(): Locator {
    return this.formulario.getByRole('alert');
  }

  async abrirFormulario(): Promise<void> {
    await this.page.goto('/v2/depositos/new');
    await this.formulario.waitFor();
  }

  async seleccionarTitular(usuarioId: number): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Titular', exact: true }).selectOption(String(usuarioId));
    await this.page.getByRole('combobox', { name: 'Debitar de la cuenta', exact: true })
      .locator('option').filter({ hasText: /PYG/ }).first().waitFor({ state: 'attached' });
  }

  async opcionesDeCuenta(): Promise<{ id: number; descripcion: string }[]> {
    return this.page.getByRole('combobox', { name: 'Debitar de la cuenta', exact: true }).locator('option')
      .evaluateAll(options => options
        .filter(option => (option as HTMLOptionElement).value)
        .map(option => ({ id: Number((option as HTMLOptionElement).value), descripcion: option.textContent || '' })));
  }

  async abrirConCuenta(usuarioId: number, cuentaId: number): Promise<void> {
    await this.abrirFormulario();
    await this.seleccionarTitular(usuarioId);
    await this.page.getByRole('combobox', { name: 'Debitar de la cuenta', exact: true }).selectOption(String(cuentaId));
  }

  async abrirConCuentaElegible(usuarioId: number, saldoMinimo: number): Promise<number> {
    await this.abrirFormulario();
    await this.page.getByRole('combobox', { name: 'Titular', exact: true }).selectOption(String(usuarioId));
    const cuentas = this.page.getByRole('combobox', { name: 'Debitar de la cuenta', exact: true });
    await cuentas.locator('option').filter({ hasText: /PYG/ }).first().waitFor({ state: 'attached' });
    const opciones = await cuentas.locator('option').evaluateAll(elements => elements.map(element => ({
      id: (element as HTMLOptionElement).value,
      texto: element.textContent || '',
    })));
    const candidatas = opciones.map(opcion => {
      const importe = opcion.texto.match(/PYG\s+([\d.,]+)/)?.[1];
      return { id: opcion.id, saldo: importe ? Number(importe.replace(/\./g, '').replace(',', '.')) : NaN };
    });
    const cuenta = candidatas.find(opcion => opcion.id && opcion.saldo >= saldoMinimo);
    if (!cuenta) {
      throw new Error('DATA: el cliente de prueba no dispone de una cuenta elegible con saldo suficiente.');
    }
    await cuentas.selectOption(cuenta.id);
    return cuenta.saldo;
  }

  async intentarConstituir(monto: number): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Monto', exact: true }).fill(String(monto));
    await this.page.getByRole('button', { name: 'Constituir depósito', exact: true }).click();
    await this.errorMonto.waitFor();
  }

  async plazosDisponibles(): Promise<number[]> {
    return this.page.getByRole('combobox', { name: 'Plazo', exact: true }).locator('option')
      .evaluateAll(options => options.map(option => Number((option as HTMLOptionElement).value)));
  }

  async seleccionarPlazo(dias: number): Promise<void> {
    await this.page.getByRole('combobox', { name: 'Plazo', exact: true }).selectOption(String(dias));
  }
}
