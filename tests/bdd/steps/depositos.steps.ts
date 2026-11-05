import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import {
  DEPOSITO_INEXISTENTE_ID,
  type Deposito,
  DepositosFixture,
  type RespuestaApi,
} from '../../../grupos/grupo-05-ahorros-depositos/fixtures/DepositosFixture';
import type { LoansWorld } from '../support/loans.world';

/**
 * Steps @fixture de G05: los @api llaman a la API v2 y los @web escriben por la
 * pantalla, siempre sobre el cliente que creó el fixture. Los @web de solo
 * lectura siguen en ahorros.steps.ts, con la guarda de red activa.
 */
interface EstadoG05 {
  fixture: DepositosFixture;
  respuestas: RespuestaApi[];
  cuentaId?: number;
  cuentaCompartidaId?: number;
  saldoPrevio?: string;
  monto?: number;
  deposito?: Deposito;
}

export type G05World = LoansWorld & { g05: EstadoG05 };

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';
const MONTO_MINIMO_UI = 1_000_000;

const ultima = (world: G05World) => world.g05.respuestas[world.g05.respuestas.length - 1];

async function cuentaConSaldo(world: G05World, saldo: number): Promise<void> {
  world.g05.cuentaId = await world.g05.fixture.crearCuenta(saldo);
  world.g05.saldoPrevio = await world.g05.fixture.saldo(world.g05.cuentaId);
}

async function constituirPorApi(world: G05World, monto: number, tasa = 10, plazo = 30): Promise<void> {
  world.g05.monto = monto;
  const res = await world.g05.fixture.constituir(world.g05.cuentaId!, monto, tasa, plazo);
  world.g05.respuestas.push(res);
  if (res.status === 201) world.g05.deposito = res.body!.data!;
}

// ── Pantalla: escrituras sobre el cliente del fixture ───────────────────────

Given('que el cliente tiene saldo suficiente', async function (this: G05World) {
  await cuentaConSaldo(this, 5_000_000);
  await this.depositos.signInAsAdmin(adminEmail, { allowWrites: true });
  await this.depositos.openNewDepositFormFor(this.g05.fixture.usuarioId, this.g05.cuentaId!);
});

When('constituye un depósito por el importe mínimo permitido', async function (this: G05World) {
  this.g05.monto = MONTO_MINIMO_UI;
  await this.depositos.selectTerm(30);
  await this.depositos.enterAmount(MONTO_MINIMO_UI);
  await this.depositos.submitForm();
});

Given('que el cliente tiene una cuenta de ahorro activa', async function (this: G05World) {
  await cuentaConSaldo(this, 2_500_000);
  await this.depositos.signInAsAdmin(adminEmail, { allowWrites: true });
});

Given('el saldo disponible es igual al importe del depósito', async function (this: G05World) {
  this.g05.monto = Number(this.g05.saldoPrevio);
  await this.depositos.openNewDepositFormFor(this.g05.fixture.usuarioId, this.g05.cuentaId!);
});

When('constituye el depósito a plazo', async function (this: G05World) {
  await this.depositos.selectTerm(30);
  await this.depositos.enterAmount(this.g05.monto!);
  await this.depositos.submitForm();
});

Then('el sistema registra el depósito correctamente', async function (this: G05World) {
  const id = await this.depositos.expectDepositCreated();
  this.g05.fixture.registrarDeposito(id);
  const [deposito] = await this.g05.fixture.depositosDelCliente();
  expect(deposito.id).toBe(id);
  expect(deposito.estado).toBe('activo');
  expect(Number(deposito.monto)).toBe(this.g05.monto);
  expect(Number(await this.g05.fixture.saldo(this.g05.cuentaId!))).toBe(Number(this.g05.saldoPrevio) - this.g05.monto!);
});

Then('el saldo disponible de la cuenta queda en cero', async function (this: G05World) {
  expect(await this.g05.fixture.saldo(this.g05.cuentaId!)).toBe('0.00');
});

Given('que el cliente tiene un depósito a plazo vigente propio', async function (this: G05World) {
  await cuentaConSaldo(this, 3_000_000);
  await constituirPorApi(this, 2_000_000, 10, 90);
  expect(ultima(this).status).toBe(201);
  await this.depositos.signInAsAdmin(adminEmail, { allowWrites: true });
});

When('cancela el depósito antes de la fecha de vencimiento', async function (this: G05World) {
  await this.depositos.cancelDepositEarly(this.g05.deposito!.id);
});

Then('el sistema procesa la cancelación anticipada', async function (this: G05World) {
  await this.depositos.expectDepositStatus('cancelado');
});

Then('acredita el capital más los intereses prorrateados en la cuenta del cliente', async function (this: G05World) {
  // Constituido hoy: 0 días transcurridos, interés prorrateado 0; vuelve exactamente el capital.
  const res = await this.g05.fixture.request('GET', `/api/v2/depositos/${this.g05.deposito!.id}`);
  expect(res.body?.data?.interes_generado).toBe('0.00');
  expect(await this.g05.fixture.saldo(this.g05.cuentaId!)).toBe(this.g05.saldoPrevio);
});

// ── API: precondiciones ─────────────────────────────────────────────────────

Given('que el cliente usa la API del Curso 2', async function (this: G05World) {
  // El fixture ya creó un cliente con la API_KEY: la key es válida para el Curso 2.
  expect(this.g05.fixture.usuarioId).toBeGreaterThan(0);
});

Given('una cuenta activa con saldo {int}', async function (this: G05World, saldo: number) {
  await cuentaConSaldo(this, saldo);
});

Given('una cuenta activa con saldo suficiente', async function (this: G05World) {
  await cuentaConSaldo(this, 5_000_000);
});

Given('una cuenta activa con saldo menor al importe del depósito', async function (this: G05World) {
  await cuentaConSaldo(this, 100_000);
});

Given('un depósito existente', async function (this: G05World) {
  await cuentaConSaldo(this, 2_000_000);
  await constituirPorApi(this, 1_000_000);
  expect(ultima(this).status).toBe(201);
  this.g05.respuestas = [];
});

Given('un depósito constituido hoy por {int}', async function (this: G05World, monto: number) {
  await cuentaConSaldo(this, monto + 1_000_000);
  await constituirPorApi(this, monto, 10, 90);
  expect(ultima(this).status).toBe(201);
  this.g05.respuestas = [];
});

// Solo lectura sobre el seed: un depósito vencido no se puede crear por API (la fecha la fija el servidor).
Given('un depósito en estado {string}', async function (this: G05World, estado: string) {
  const res = await this.g05.fixture.request('GET', `/api/v2/depositos?estado=${estado}`);
  const [deposito] = res.body?.data ?? [];
  expect(deposito, `el sandbox no tiene depósitos en estado ${estado}`).toBeTruthy();
  this.g05.deposito = deposito;
  this.g05.cuentaCompartidaId = Number(deposito.cuenta_id);
  this.g05.saldoPrevio = await this.g05.fixture.saldo(this.g05.cuentaCompartidaId);
});

Given(
  /^el depósito sembrado (\d+) de (\d+) al ([\d,]+) % por (\d+) días$/,
  async function (this: G05World, id: string, monto: string, tasa: string, plazo: string) {
    const res = await this.g05.fixture.request('GET', `/api/v2/depositos/${id}`);
    expect(res.status).toBe(200);
    const deposito = res.body!.data as Deposito & { tasa_anual: string; plazo_dias: number };
    expect(Number(deposito.monto)).toBe(Number(monto));
    expect(Number(deposito.tasa_anual)).toBe(Number(tasa.replace(',', '.')));
    expect(Number(deposito.plazo_dias)).toBe(Number(plazo));
    this.g05.deposito = deposito;
  },
);

// ── API: acciones ───────────────────────────────────────────────────────────

When(
  'constituye un depósito de {int} al {int} % de tasa anual por {int} días',
  async function (this: G05World, monto: number, tasa: number, plazo: number) {
    await constituirPorApi(this, monto, tasa, plazo);
  },
);

When('constituye un depósito por {int} días', async function (this: G05World, plazo: number) {
  await constituirPorApi(this, 1_000_000, 10, plazo);
});

When('constituye un depósito por un monto positivo inferior a 1000000', async function (this: G05World) {
  await constituirPorApi(this, 500_000);
});

When('intenta constituir por API un depósito a plazo', async function (this: G05World) {
  await constituirPorApi(this, 1_000_000);
});

When('consulta por API un depósito a plazo que no existe', async function (this: G05World) {
  this.g05.respuestas.push(await this.g05.fixture.request('GET', `/api/v2/depositos/${DEPOSITO_INEXISTENTE_ID}`));
});

When('consulta por API el detalle de ese depósito', async function (this: G05World) {
  const res = await this.g05.fixture.request('GET', `/api/v2/depositos/${this.g05.deposito!.id}`);
  this.g05.respuestas.push(res);
  this.g05.deposito = res.body?.data;
});

When('envía PUT o DELETE sobre ese depósito', async function (this: G05World) {
  const ruta = `/api/v2/depositos/${this.g05.deposito!.id}`;
  this.g05.respuestas.push(await this.g05.fixture.request('PUT', ruta, { monto: 1 }));
  this.g05.respuestas.push(await this.g05.fixture.request('DELETE', ruta));
});

When('lista los depósitos con estado {string}', async function (this: G05World, estado: string) {
  this.g05.respuestas.push(await this.g05.fixture.request('GET', `/api/v2/depositos?estado=${estado}`));
});

When('cancela el depósito', async function (this: G05World) {
  const res = await this.g05.fixture.request('POST', `/api/v2/depositos/${this.g05.deposito!.id}/cancelar`);
  this.g05.respuestas.push(res);
  if (res.status === 200) this.g05.deposito = res.body!.data;
});

// ── API: verificaciones ─────────────────────────────────────────────────────

// "la API responde 201", "la API responde 400 VALIDATION_ERROR", "la API responde 405"...
Then(/^la API responde (\d{3})(?: ([A-Z_]+))?$/, async function (this: G05World, status: string, codigo?: string) {
  expect(this.g05.respuestas.length).toBeGreaterThan(0);
  for (const res of this.g05.respuestas) {
    expect(res.status, JSON.stringify(res.body)).toBe(Number(status));
    if (codigo) expect(res.body?.error?.code).toBe(codigo);
  }
});

Then('la API responde {int} con estado {string}', async function (this: G05World, status: number, estado: string) {
  const res = ultima(this);
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  expect(res.body?.data?.estado).toBe(estado);
});

Then(
  'la API responde {int} {word} con el mensaje {string}',
  async function (this: G05World, status: number, codigo: string, mensaje: string) {
    const res = ultima(this);
    expect(res.status).toBe(status);
    expect(res.body?.error).toEqual({ code: codigo, message: mensaje });
  },
);

Then('interes_proyectado es {string}', async function (this: G05World, interes: string) {
  expect(this.g05.deposito?.interes_proyectado).toBe(interes);
});

Then('dias_restantes es {int}', async function (this: G05World, dias: number) {
  expect(this.g05.deposito?.dias_restantes).toBe(dias);
});

Then('dias_transcurridos es {int}', async function (this: G05World, dias: number) {
  expect(Number((this.g05.deposito as Deposito & { dias_transcurridos: number }).dias_transcurridos)).toBe(dias);
});

Then('interes_generado es {string}', async function (this: G05World, interes: string) {
  expect(this.g05.deposito?.interes_generado).toBe(interes);
});

Then('el saldo de la cuenta es {string}', async function (this: G05World, saldo: string) {
  expect(await this.g05.fixture.saldo(this.g05.cuentaId!)).toBe(saldo);
});

Then('el saldo de la cuenta no cambia', async function (this: G05World) {
  expect(await this.g05.fixture.saldo(this.g05.cuentaId!)).toBe(this.g05.saldoPrevio);
});

Then('el saldo de la cuenta vuelve al valor previo a la constitución', async function (this: G05World) {
  expect(await this.g05.fixture.saldo(this.g05.cuentaId!)).toBe(this.g05.saldoPrevio);
});

Then('la cuenta no vuelve a acreditarse', async function (this: G05World) {
  expect(await this.g05.fixture.saldo(this.g05.cuentaCompartidaId!)).toBe(this.g05.saldoPrevio);
});
