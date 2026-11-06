import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import {
  PrestamosFixture,
  type Prestamo,
  type RespuestaApi,
} from '../../../grupos/grupo-03-prestamos/fixtures/PrestamosFixture';
import type { LoansWorld } from '../support/loans.world';

/**
 * Steps @api de G03: cada escenario crea su propio usuario y préstamo.
 * Las verificaciones combinan la respuesta REST con una consulta SQL de solo
 * lectura, igual que el patrón dinámico de la colección Postman.
 */
interface EstadoG03 {
  fixture: PrestamosFixture;
  respuestas: RespuestaApi[];
  prestamoId?: number;
  monto?: number;
  tasa?: number;
  plazo?: number;
  cuota?: number;
  saldoAntes?: number;
  pagadasAntes?: number;
  montoCuota?: number;
}

export type G03World = LoansWorld & { g03: EstadoG03 };

const FIXTURE_TIMEOUT = { timeout: 120_000 };
const MONTO = 1_200_000;
const TASA = 12;
const PLAZO = 6;

const ultima = (world: G03World) => world.g03.respuestas[world.g03.respuestas.length - 1];

function prestamoId(world: G03World): number {
  if (!world.g03.prestamoId) throw new Error('El escenario no tiene un préstamo creado por el fixture.');
  return world.g03.prestamoId;
}

async function solicitar(world: G03World, monto: number, tasa = TASA, plazo = PLAZO): Promise<void> {
  world.g03.monto = monto;
  world.g03.tasa = tasa;
  world.g03.plazo = plazo;
  const res = await world.g03.fixture.solicitar(monto, tasa, plazo);
  world.g03.respuestas.push(res);
  if (res.status === 201) world.g03.prestamoId = Number(res.body!.data!.id);
}

async function aprobar(world: G03World): Promise<void> {
  const res = await world.g03.fixture.aprobar(prestamoId(world));
  world.g03.respuestas.push(res);
}

/** Foto del saldo y de las cuotas pagadas antes de una operación. */
async function fotoSaldo(world: G03World): Promise<void> {
  const fila = await world.g03.fixture.filaSaldo(prestamoId(world));
  world.g03.saldoAntes = Number(fila.saldo_pendiente);
  world.g03.pagadasAntes = Number(fila.pagadas);
}

async function pagar(world: G03World, numeroCuota: number): Promise<void> {
  await fotoSaldo(world);
  const cuota = await world.g03.fixture.cuota(prestamoId(world), numeroCuota);
  world.g03.montoCuota = cuota ? Number(cuota.monto) : undefined;
  const res = await world.g03.fixture.pagar(prestamoId(world), numeroCuota);
  world.g03.respuestas.push(res);
}

async function crearPrestamoAprobado(world: G03World, plazo = PLAZO): Promise<void> {
  await solicitar(world, MONTO, TASA, plazo);
  expect(ultima(world).status, JSON.stringify(ultima(world).body)).toBe(201);
  await aprobar(world);
  expect(ultima(world).status, JSON.stringify(ultima(world).body)).toBe(200);
  world.g03.respuestas = [];
}

// ── Precondiciones ──────────────────────────────────────────────────────────

Given('un usuario de prueba sin préstamos', FIXTURE_TIMEOUT, async function (this: G03World) {
  expect(await this.g03.fixture.contarPrestamos()).toBe(0);
});

Given(
  'un préstamo solicitado de {int} a {int} % en {int} meses',
  FIXTURE_TIMEOUT,
  async function (this: G03World, monto: number, tasa: number, plazo: number) {
    await solicitar(this, monto, tasa, plazo);
    expect(ultima(this).status, JSON.stringify(ultima(this).body)).toBe(201);
    // La acción del escenario es la aprobación; se limpia la respuesta de la precondición.
    this.g03.respuestas = [];
  },
);

Given('un préstamo aprobado con {int} cuotas pendientes', FIXTURE_TIMEOUT, async function (this: G03World, plazo: number) {
  await crearPrestamoAprobado(this, plazo);
  const cuotas = await this.g03.fixture.cuotas(prestamoId(this));
  expect(cuotas).toHaveLength(plazo);
});

Given('un préstamo aprobado con la cuota 1 pagada', FIXTURE_TIMEOUT, async function (this: G03World) {
  await crearPrestamoAprobado(this);
  await pagar(this, 1);
  expect(ultima(this).status, JSON.stringify(ultima(this).body)).toBe(200);
  // El escenario vuelve a intentar el pago: la foto debe ser la posterior al primer pago.
  await fotoSaldo(this);
  this.g03.cuota = 1;
  this.g03.respuestas = [];
});

// ── Acciones ────────────────────────────────────────────────────────────────

When(
  'solicita un préstamo por {int} a {int} % en {int} meses',
  FIXTURE_TIMEOUT,
  async function (this: G03World, monto: number, tasa: number, plazo: number) {
    await solicitar(this, monto, tasa, plazo);
  },
);

When('aprueba el préstamo', FIXTURE_TIMEOUT, async function (this: G03World) {
  await aprobar(this);
});

When('paga la cuota {int}', FIXTURE_TIMEOUT, async function (this: G03World, numeroCuota: number) {
  await pagar(this, numeroCuota);
});

When('intenta pagar nuevamente la cuota {int}', FIXTURE_TIMEOUT, async function (this: G03World, numeroCuota: number) {
  await pagar(this, numeroCuota);
});

// ── Verificaciones REST ─────────────────────────────────────────────────────

Then(
  'la API de préstamos responde {int} con estado {string}',
  FIXTURE_TIMEOUT,
  async function (this: G03World, status: number, estado: string) {
    const res = ultima(this);
    expect(res.status, JSON.stringify(res.body)).toBe(status);
    expect(res.body?.data?.estado).toBe(estado);
  },
);

Then('la API de préstamos responde {int}', FIXTURE_TIMEOUT, async function (this: G03World, status: number) {
  const res = ultima(this);
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  if (status >= 400) {
    expect(res.body?.error?.code).toEqual(expect.any(String));
    expect(res.body?.error?.message).toEqual(expect.any(String));
    expect(res.body!.error!.code).not.toHaveLength(0);
    expect(res.body!.error!.message).not.toHaveLength(0);
  }
});

Then('la API de préstamos responde 400 o 409', FIXTURE_TIMEOUT, async function (this: G03World) {
  const res = ultima(this);
  expect([400, 409], JSON.stringify(res.body)).toContain(res.status);
  expect(res.body?.error?.code).toEqual(expect.any(String));
  expect(res.body?.error?.message).toEqual(expect.any(String));
});

// ── Verificaciones SQL ──────────────────────────────────────────────────────

Then('la base de datos registra el préstamo con los datos enviados', FIXTURE_TIMEOUT, async function (this: G03World) {
  const [fila] = await this.g03.fixture.sql<Prestamo>(
    'SELECT id, usuario_id, monto_solicitado, tasa_interes, plazo_meses, estado FROM prestamos WHERE id = $1',
    [prestamoId(this)],
  );
  expect(fila, 'no se encontró el préstamo en la base de datos').toBeTruthy();
  expect(Number(fila.usuario_id)).toBe(this.g03.fixture.usuarioId);
  expect(Number(fila.monto_solicitado)).toBe(this.g03.monto);
  expect(Number(fila.tasa_interes)).toBe(this.g03.tasa);
  expect(Number(fila.plazo_meses)).toBe(this.g03.plazo);
  expect(fila.estado).toBe('solicitado');
});

Then('la base de datos no registra un nuevo préstamo', FIXTURE_TIMEOUT, async function (this: G03World) {
  expect(await this.g03.fixture.contarPrestamos()).toBe(0);
});

Then(
  'la base de datos registra {int} cuotas pendientes sin fecha de pago',
  FIXTURE_TIMEOUT,
  async function (this: G03World, plazo: number) {
    const cuotas = await this.g03.fixture.cuotas(prestamoId(this));
    expect(cuotas).toHaveLength(plazo);
    for (const cuota of cuotas) {
      expect(cuota.estado).toBe('pendiente');
      expect(cuota.fecha_pago).toBeNull();
    }
  },
);

Then('el saldo pendiente en la base de datos es mayor a cero', FIXTURE_TIMEOUT, async function (this: G03World) {
  const fila = await this.g03.fixture.filaSaldo(prestamoId(this));
  expect(Number(fila.saldo_pendiente)).toBeGreaterThan(0);
});

Then(
  'la base de datos marca la cuota {int} como pagada con fecha de pago',
  FIXTURE_TIMEOUT,
  async function (this: G03World, numeroCuota: number) {
    const cuota = await this.g03.fixture.cuota(prestamoId(this), numeroCuota);
    expect(cuota, `no se encontró la cuota ${numeroCuota}`).toBeTruthy();
    expect(cuota!.estado).toBe('pagada');
    expect(cuota!.fecha_pago).not.toBeNull();
  },
);

Then('el saldo pendiente baja exactamente el monto de la cuota', FIXTURE_TIMEOUT, async function (this: G03World) {
  const fila = await this.g03.fixture.filaSaldo(prestamoId(this));
  expect(this.g03.montoCuota, 'no se pudo leer el monto de la cuota').toBeDefined();
  const esperado = this.g03.saldoAntes! - this.g03.montoCuota!;
  expect(Number(fila.saldo_pendiente)).toBeCloseTo(esperado, 1);
});

Then('la base de datos conserva el saldo y las cuotas pagadas', FIXTURE_TIMEOUT, async function (this: G03World) {
  const fila = await this.g03.fixture.filaSaldo(prestamoId(this));
  expect(Number(fila.saldo_pendiente)).toBeCloseTo(this.g03.saldoAntes!, 1);
  expect(Number(fila.pagadas)).toBe(this.g03.pagadasAntes);
});
