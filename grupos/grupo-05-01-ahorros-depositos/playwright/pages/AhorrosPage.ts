import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../../../playwright/pages/BasePage';

export interface DatosMetaGrupo0501 {
  nombreMeta: string;
  metaMonto: number;
  aporteMensual: number;
}

export class AhorrosGrupo0501Page extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get formulario(): Locator {
    return this.page.getByTestId('v2-ahorros-form');
  }

  get erroresCreacion(): Locator {
    return this.formulario.getByRole('alert').filter({ hasText: /\S/ });
  }

  get errorAporte(): Locator {
    return this.page.getByTestId('v2-ahorros-aporte-form').getByRole('alert').filter({ hasText: /\S/ });
  }

  get eliminarMeta(): Locator {
    return this.page.getByRole('button', { name: 'Eliminar meta', exact: true });
  }

  get bloqueoEliminacion(): Locator {
    return this.page.getByText('Un plan activo con dinero ahorrado no se puede eliminar.', { exact: true });
  }

  async abrirFormulario(usuarioId: number): Promise<void> {
    await this.page.goto('/v2/ahorros/new');
    await this.formulario.waitFor();
    await this.page.getByRole('combobox', { name: 'Titular', exact: true }).selectOption(String(usuarioId));
    const cuentas = this.page.getByRole('combobox', { name: 'Debitar aportes de', exact: true });
    await cuentas.locator('option').filter({ hasText: /PYG/ }).first().waitFor({ state: 'attached' });
    await cuentas.selectOption({ index: 1 });
  }

  private async completarImporte(campo: Locator, monto: number): Promise<void> {
    // El campo cambia de formato al recibir foco; enfocarlo antes de reemplazar
    // evita que el rerender de CurrencyInput conserve el importe anterior.
    await campo.click();
    await campo.fill(String(monto));
    await campo.press('Tab');
  }

  async intentarCrearMeta(datos: DatosMetaGrupo0501): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Nombre de la meta', exact: true }).fill(datos.nombreMeta);
    await this.completarImporte(this.page.getByRole('textbox', { name: 'Meta', exact: true }), datos.metaMonto);
    await this.completarImporte(this.page.getByRole('textbox', { name: 'Aporte mensual', exact: true }), datos.aporteMensual);
    await this.page.getByRole('button', { name: 'Crear meta', exact: true }).click();
    await this.erroresCreacion.first().waitFor();
  }

  async abrirPlan(planId: number): Promise<void> {
    await this.page.goto(`/v2/ahorros/${planId}`);
    await this.page.getByTestId('v2-ahorros-detail').waitFor();
  }

  async abrirPlanParaAporte(planId: number): Promise<void> {
    await this.abrirPlan(planId);
    await this.page.getByTestId('v2-ahorros-aporte-field-monto-hint').waitFor();
  }

  async intentarEliminarPlanConSaldo(): Promise<void> {
    await this.eliminarMeta.waitFor();
    // Si una regresión habilita el botón, el intento sigue protegido por la
    // guarda de red. No se fuerza un clic sobre un control deshabilitado.
    if (await this.eliminarMeta.isEnabled()) await this.eliminarMeta.click();
    else await this.eliminarMeta.hover();
  }

  async intentarAportar(monto: number): Promise<void> {
    await this.completarImporte(this.page.getByRole('textbox', { name: 'Monto del aporte', exact: true }), monto);
    await this.page.getByRole('button', { name: 'Aportar', exact: true }).click();
    await this.errorAporte.first().waitFor();
  }
}
