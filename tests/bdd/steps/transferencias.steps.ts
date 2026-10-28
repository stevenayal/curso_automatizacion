import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import {
  CUENTA_INEXISTENTE_ID,
  type CuentaFixture,
  type EstadoCuenta,
  type RespuestaApi,
  TransferenciasFixture,
} from '../../../grupos/grupo-04-transferencias-pagos/fixtures/TransferenciasFixture';
import { BeneficiariosPage } from '../../../grupos/grupo-04-transferencias-pagos/playwright/pages/BeneficiariosPage';
import { TransferenciasPage } from '../../../grupos/grupo-04-transferencias-pagos/playwright/pages/TransferenciasPage';
import type { LoansWorld } from '../support/loans.world';

/** Estado del escenario de G04: el fixture y lo que cada paso deja para el siguiente. */
interface EstadoG04 {
  fixture: TransferenciasFixture;
  origen?: CuentaFixture;
  destino?: CuentaFixture;
  saldoOrigenInicial?: number;
  saldoDestinoInicial?: number;
  transferenciasPrevias?: number;
  monto?: number;
  respuestas?: RespuestaApi[];
  beneficiarioId?: number;
  numeroCuenta?: string;
  beneficiarios?: BeneficiariosPage;
  transferencias?: TransferenciasPage;
}

export type G04World = LoansWorld & { g04: EstadoG04 };

const SALDO_SUFICIENTE = 1_000_000;
const IMPORTE_VALIDO = 150_000;

// ---------- Precondiciones (cuentas del cliente aislado) ----------

async function origenConSaldo(world: G04World, saldo: number): Promise<void> {
  const g04 = world.g04;
  g04.origen = await g04.fixture.crearCuenta({ saldo });
  g04.saldoOrigenInicial = saldo;
  g04.transferenciasPrevias = 0;
}

Given('que el cliente tiene dos cuentas activas con saldo suficiente', async function (this: G04World) {
  await origenConSaldo(this, SALDO_SUFICIENTE);
  this.g04.destino = await this.g04.fixture.crearCuenta();
  this.g04.saldoDestinoInicial = 0;
});

Given('que el cliente tiene una cuenta activa para transferir', async function (this: G04World) {
  await origenConSaldo(this, SALDO_SUFICIENTE);
});

Given('que el cliente tiene una cuenta origen activa con saldo suficiente', async function (this: G04World) {
  await origenConSaldo(this, SALDO_SUFICIENTE);
});

Given('que el cliente tiene una cuenta activa con saldo suficiente', async function (this: G04World) {
  await origenConSaldo(this, SALDO_SUFICIENTE);
});

Given('que el cliente tiene una cuenta activa con saldo insuficiente', async function (this: G04World) {
  await origenConSaldo(this, 50_000);
  this.g04.destino = await this.g04.fixture.crearCuenta();
});

Given('la cuenta destino se encuentra en estado {string}', async function (this: G04World, estado: string) {
  this.g04.destino = await this.g04.fixture.crearCuenta({ estado: estado as EstadoCuenta });
});

// ---------- Acciones (API) ----------

async function transferir(world: G04World, monto: number, cuentaDestinoId: number): Promise<void> {
  const g04 = world.g04;
  g04.monto = monto;
  const res = await g04.fixture.transferir({ cuentaOrigenId: g04.origen!.id, cuentaDestinoId, monto });
  g04.respuestas = [...(g04.respuestas ?? []), res];
}

When('transfiere un importe válido de una cuenta a la otra', async function (this: G04World) {
  await transferir(this, IMPORTE_VALIDO, this.g04.destino!.id);
});

When('intenta transferir a esa misma cuenta', async function (this: G04World) {
  await transferir(this, IMPORTE_VALIDO, this.g04.origen!.id);
});

When('intenta transferir un importe válido hacia esa cuenta', async function (this: G04World) {
  await transferir(this, IMPORTE_VALIDO, this.g04.destino!.id);
});

When('intenta transferir un importe mayor al saldo disponible', async function (this: G04World) {
  await transferir(this, this.g04.saldoOrigenInicial! + 1, this.g04.destino!.id);
});

When('intenta transferir a un número de cuenta que no existe', async function (this: G04World) {
  await transferir(this, IMPORTE_VALIDO, CUENTA_INEXISTENTE_ID);
});

When('intenta transferir un monto menor o igual a cero', async function (this: G04World) {
  this.g04.destino = await this.g04.fixture.crearCuenta();
  await transferir(this, 0, this.g04.destino.id);
  await transferir(this, -1_000, this.g04.destino.id);
});

// ---------- Verificaciones (API) ----------

Then('la transferencia queda registrada en estado exitoso', async function (this: G04World) {
  const { fixture, origen, destino, monto, respuestas } = this.g04;
  const [res] = respuestas!;
  expect(res.status).toBe(201);
  expect(res.body?.data?.estado).toBe('completada');
  expect(Number(res.body?.data?.monto)).toBe(monto);
  expect(await fixture.saldo(origen!.id)).toBe(this.g04.saldoOrigenInicial! - monto!);
  expect(await fixture.saldo(destino!.id)).toBe(this.g04.saldoDestinoInicial! + monto!);
  expect(await fixture.transferenciasDesde(origen!.id)).toBe(1);
});

async function esperarRechazo(world: G04World): Promise<void> {
  for (const res of world.g04.respuestas!) {
    expect(res.status, JSON.stringify(res.body)).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body?.error?.code).toBeTruthy();
  }
}

async function sinTransferenciaRegistrada(world: G04World): Promise<void> {
  const { fixture, origen } = world.g04;
  expect(await fixture.transferenciasDesde(origen!.id)).toBe(world.g04.transferenciasPrevias);
}

Then('el sistema rechaza la operación y no registra la transferencia', async function (this: G04World) {
  await esperarRechazo(this);
  await sinTransferenciaRegistrada(this);
  expect(await this.g04.fixture.saldo(this.g04.origen!.id)).toBe(this.g04.saldoOrigenInicial);
});

Then('el sistema rechaza la operación y no descuenta el monto', async function (this: G04World) {
  await esperarRechazo(this);
  expect(this.g04.respuestas![0].status).toBe(409);
  expect(await this.g04.fixture.saldo(this.g04.origen!.id)).toBe(this.g04.saldoOrigenInicial);
});

Then('la transferencia no queda registrada', async function (this: G04World) {
  await sinTransferenciaRegistrada(this);
});

Then('el sistema rechaza la operación y muestra un error de monto inválido', async function (this: G04World) {
  for (const res of this.g04.respuestas!) {
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  }
  await sinTransferenciaRegistrada(this);
});

// ---------- Beneficiarios (UI) ----------

Given('que el usuario se encuentra en el sector de {string}', async function (this: G04World, _sector: string) {
  this.g04.beneficiarios = new BeneficiariosPage(this.page);
  await this.g04.beneficiarios.abrirAlta(this.g04.fixture.usuarioId);
});

Given('el usuario cuenta con un beneficiario con Nro de cuenta {string}', async function (this: G04World, numero: string) {
  await this.g04.fixture.crearBeneficiario({ numeroCuenta: numero });
  this.g04.beneficiarios = new BeneficiariosPage(this.page);
  await this.g04.beneficiarios.abrirAlta(this.g04.fixture.usuarioId);
});

async function completarAlta(world: G04World, numeroCuenta: string): Promise<void> {
  const pagina = world.g04.beneficiarios!;
  const [banco] = await pagina.bancosDisponibles();
  world.g04.numeroCuenta = numeroCuenta;
  await pagina.completar({ nombre: 'Tercero BDD G04', banco, numeroCuenta });
  await pagina.guardar();
}

When('completa el formulario con los datos y confirma la operación', async function (this: G04World) {
  await completarAlta(this, String(Date.now()).slice(-12));
});

When('completa el formulario con datos que no existen', async function (this: G04World) {
  // Un número de cuenta con letras no existe en ningún banco: la UI lo rechaza antes del request.
  await completarAlta(this, 'CTA-INEXISTENTE');
});

When('completa el formulario con Nro de cuenta {string} ya existente', async function (this: G04World, numero: string) {
  await completarAlta(this, numero);
});

Then('el nuevo contacto debe aparecer en la lista de cuentas guardadas', async function (this: G04World) {
  await expect(this.page).toHaveURL(/\/v2\/beneficiarios\/\d+$/);
  const guardados = await this.g04.fixture.beneficiariosDelCliente();
  const nuevo = guardados.find((b) => b.numero_cuenta === this.g04.numeroCuenta);
  expect(nuevo, 'el beneficiario no figura en la API').toBeTruthy();
  this.g04.fixture.registrarBeneficiario(nuevo!.id);
});

Then('el sistema rechaza la operación y no registra el contacto', async function (this: G04World) {
  await expect(this.g04.beneficiarios!.errorDe('numeroCuenta')).toBeVisible();
  await this.g04.beneficiarios!.sigueEnElAlta();
  expect(await this.g04.fixture.beneficiariosDelCliente()).toHaveLength(0);
});

Then('el sistema lanza una validación de dato redundante y no duplica el contacto', async function (this: G04World) {
  await expect(this.g04.beneficiarios!.errorDe('numeroCuenta')).toHaveText('Ya tenés un beneficiario con este número de cuenta.');
  await this.g04.beneficiarios!.sigueEnElAlta();
  const iguales = (await this.g04.fixture.beneficiariosDelCliente()).filter((b) => b.numero_cuenta === this.g04.numeroCuenta);
  expect(iguales).toHaveLength(1);
});

// ---------- Límite diario a terceros (UI) ----------

Given(
  'que el cliente tiene una cuenta activa con saldo suficiente y su límite diario de transferencia a terceros es de Gs.50,000,000',
  async function (this: G04World) {
    // Saldo por encima del tope: así el rechazo solo puede venir del límite diario, no del saldo.
    await origenConSaldo(this, 60_000_000);
    const tercero = await this.g04.fixture.crearBeneficiario({ numeroCuenta: String(Date.now()).slice(-10) });
    this.g04.beneficiarioId = tercero.id;
  },
);

When('intenta transferir un importe de Gs.51,000,000 a un tercero', async function (this: G04World) {
  const pagina = new TransferenciasPage(this.page);
  this.g04.transferencias = pagina;
  await pagina.abrirNuevaPara(this.g04.fixture.usuarioId, 'beneficiario');
  await pagina.elegirOrigen(this.g04.origen!.id);
  await pagina.elegirBeneficiario(this.g04.beneficiarioId!);
  await pagina.avanzar();
  await pagina.ingresarMonto('51000000');
  await pagina.avanzar();
});

Then(
  'el sistema rechaza la operación por superar el límite diario y el saldo disponible de la cuenta origen no se altera',
  async function (this: G04World) {
    const pagina = this.g04.transferencias!;
    await expect(pagina.errorDeMonto()).toContainText('Supera tu tope diario');
    await expect(pagina.pasoActual()).toContainText('Monto');
    expect(await this.g04.fixture.saldo(this.g04.origen!.id)).toBe(this.g04.saldoOrigenInicial);
    expect(await this.g04.fixture.transferenciasDesde(this.g04.origen!.id)).toBe(0);
  },
);
