import { expect, type Locator } from '@playwright/test';
import { BasePage } from '../../../../playwright/pages/BasePage';

/** Cuenta tal como la expone el `<option>` del select (`data-saldo`, `data-moneda`). */
export interface CuentaOpcion {
  id: string;
  saldo: number;
  moneda: string;
}

/**
 * Wizard `/v2/transferencias/new`: Destino → Monto → Confirmación → Comprobante.
 * Selectores: `data-testid` con la convención `v2-transferencias-*` del sandbox.
 * Los métodos de este Page Object no confirman la transferencia: los flujos
 * que mueven saldo necesitan el fixture aislado del issue #28.
 */
export class TransferenciasPage extends BasePage {
  private readonly cliente = this.page.getByTestId('v2-transferencias-field-usuarioId');
  private readonly origen = this.page.getByTestId('v2-transferencias-field-cuentaOrigenId');
  private readonly destino = this.page.getByTestId('v2-transferencias-field-cuentaDestinoId');
  private readonly monto = this.page.getByTestId('v2-transferencias-field-monto');
  private readonly continuar = this.page.getByTestId('v2-transferencias-step-next');

  async abrirNueva(): Promise<void> {
    await this.navigate('/v2/transferencias/new');
    await expect(this.page.getByRole('heading', { name: 'Nueva transferencia' })).toBeVisible();
    // Los clientes llegan de la API del sandbox, que a veces tarda más que el timeout por defecto.
    await expect(this.cliente.locator('option[value]:not([value=""])').first()).toBeAttached({ timeout: 15_000 });
  }

  async seleccionarCliente(usuarioId: number): Promise<void> {
    await this.cliente.selectOption(String(usuarioId));
    // Las cuentas llegan después del cambio de cliente: esperar a que haya opciones reales.
    await expect(this.origen.locator('option[data-saldo]').first()).toBeAttached({ timeout: 15_000 });
    await expect(this.origen).toBeEnabled();
  }

  /** Cuentas origen ofrecidas (solo activas, según la regla de la UI). */
  async cuentasOrigen(): Promise<CuentaOpcion[]> {
    return leerCuentas(this.origen);
  }

  /** Primera cuenta activa con saldo que tenga otra cuenta activa en la misma moneda. */
  async elegirOrigenConDestinoPropio(): Promise<CuentaOpcion> {
    const cuentas = await this.cuentasOrigen();
    const origen = cuentas.find((c) => c.saldo > 0 && cuentas.some((d) => d.id !== c.id && d.moneda === c.moneda));
    if (!origen) throw new Error('El cliente no tiene dos cuentas activas en la misma moneda con saldo: revisar el fixture.');
    await this.origen.selectOption(origen.id);
    return origen;
  }

  async cuentasDestino(): Promise<CuentaOpcion[]> {
    await expect(this.destino).toBeEnabled();
    return leerCuentas(this.destino);
  }

  async elegirDestino(id: string): Promise<void> {
    await this.destino.selectOption(id);
  }

  async avanzar(): Promise<void> {
    await this.continuar.click();
  }

  pasoActual(): Locator {
    return this.page.locator('[data-testid^="v2-transferencias-step-"][aria-current="step"]');
  }

  async saldoDisponible(): Promise<number> {
    return Number(await this.page.getByTestId('v2-transferencias-saldo').getAttribute('data-value'));
  }

  async ingresarMonto(valor: string): Promise<void> {
    await this.monto.fill(valor);
  }

  errorDeMonto(): Locator {
    return this.page.getByTestId('v2-transferencias-field-monto-error');
  }
}

async function leerCuentas(select: Locator): Promise<CuentaOpcion[]> {
  return select.locator('option[data-saldo]').evaluateAll((options) =>
    options.map((o) => ({
      id: (o as HTMLOptionElement).value,
      saldo: Number(o.getAttribute('data-saldo')),
      moneda: o.getAttribute('data-moneda') ?? '',
    })),
  );
}
