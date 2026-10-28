import { test, expect } from '@playwright/test';
import { SandboxLoginPage } from '../../playwright/pages/SandboxLoginPage';
import { TransferenciasPage } from '../../playwright/pages/TransferenciasPage';
import { BeneficiariosPage } from '../../playwright/pages/BeneficiariosPage';
import { TransferenciasFixture } from '../../fixtures/TransferenciasFixture';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';
// Cliente de lectura con dos cuentas activas en PYG (Ana Torres en el seed del sandbox).
const usuarioId = Number(process.env.TEST_G04_USUARIO_ID || 1);

/**
 * Smoke UI no destructivo del Grupo 04: valida las reglas del wizard sin
 * confirmar transferencias ni crear beneficiarios. Los flujos que mueven saldo
 * están más abajo y corren sobre el fixture aislado (issue #28).
 */
test.describe('Grupo 04 — Transferencias (smoke no destructivo) @smoke @grupo-04', () => {
  let transferencias: TransferenciasPage;

  test.beforeEach(async ({ page }) => {
    await new SandboxLoginPage(page).ingresarCurso2(adminEmail);
    transferencias = new TransferenciasPage(page);
    await transferencias.abrirNueva();
    await transferencias.seleccionarCliente(usuarioId);
  });

  test('solo ofrece cuentas destino distintas al origen y en la misma moneda', async () => {
    const origen = await transferencias.elegirOrigenConDestinoPropio();
    const destinos = await transferencias.cuentasDestino();

    expect(destinos.length).toBeGreaterThan(0);
    expect(destinos.map((d) => d.id)).not.toContain(origen.id);
    for (const destino of destinos) expect(destino.moneda).toBe(origen.moneda);
  });

  test('rechaza un monto igual a cero sin avanzar a la confirmación', async () => {
    const origen = await transferencias.elegirOrigenConDestinoPropio();
    const [destino] = await transferencias.cuentasDestino();
    await transferencias.elegirDestino(destino.id);
    await transferencias.avanzar();
    expect(await transferencias.saldoDisponible()).toBe(origen.saldo);

    await transferencias.ingresarMonto('0');
    await transferencias.avanzar();

    await expect(transferencias.errorDeMonto()).toHaveText('El monto debe ser mayor a 0.');
    await expect(transferencias.pasoActual()).toContainText('Monto');
  });

  test('rechaza un monto mayor al saldo o al tope diario disponible', async () => {
    const origen = await transferencias.elegirOrigenConDestinoPropio();
    const [destino] = await transferencias.cuentasDestino();
    await transferencias.elegirDestino(destino.id);
    await transferencias.avanzar();

    await transferencias.ingresarMonto(String(origen.saldo + 1));
    await transferencias.avanzar();

    await expect(transferencias.errorDeMonto()).toHaveText(/Saldo insuficiente|Supera tu tope diario/);
    await expect(transferencias.pasoActual()).toContainText('Monto');
  });
});

test.describe('Grupo 04 — Beneficiarios (smoke no destructivo) @smoke @grupo-04', () => {
  let beneficiarios: BeneficiariosPage;

  test.beforeEach(async ({ page }) => {
    await new SandboxLoginPage(page).ingresarCurso2(adminEmail);
    beneficiarios = new BeneficiariosPage(page);
  });

  test('no registra un beneficiario con el formulario vacío', async () => {
    await beneficiarios.abrirAlta(usuarioId);
    await beneficiarios.guardar();

    await expect(beneficiarios.errorDe('nombre')).toBeVisible();
    await expect(beneficiarios.errorDe('banco')).toBeVisible();
    await expect(beneficiarios.errorDe('numeroCuenta')).toBeVisible();
    await beneficiarios.sigueEnElAlta();
  });

  test('rechaza un número de cuenta con guiones', async () => {
    await beneficiarios.abrirAlta(usuarioId);
    const [banco] = await beneficiarios.bancosDisponibles();
    await beneficiarios.completar({ nombre: 'Titular de prueba', banco, numeroCuenta: '000113636-01-1' });
    await beneficiarios.guardar();

    await expect(beneficiarios.errorDe('numeroCuenta')).toHaveText(/entre 6 y 20 dígitos/);
    await beneficiarios.sigueEnElAlta();
  });
});

/**
 * Flujos que mueven saldo o crean datos (issue #29). Cada test crea su propio
 * cliente con el fixture aislado y lo limpia al terminar, así los montos que se
 * verifican son exactos y no dependen del seed compartido.
 */
test.describe('Grupo 04 — Flujos con fixture aislado @smoke @grupo-04 @fixture', () => {
  let fixture: TransferenciasFixture;

  test.beforeEach(async ({ page }) => {
    fixture = new TransferenciasFixture();
    await fixture.crearCliente();
    await new SandboxLoginPage(page).ingresarCurso2(adminEmail);
  });

  test.afterEach(async () => {
    await fixture.limpiar();
  });

  test('transfiere entre cuentas propias y actualiza ambos saldos', async ({ page }) => {
    const origen = await fixture.crearCuenta({ saldo: 500_000 });
    const destino = await fixture.crearCuenta();
    const transferencias = new TransferenciasPage(page);

    await transferencias.abrirNuevaPara(fixture.usuarioId);
    await transferencias.elegirOrigen(origen.id);
    await transferencias.elegirDestino(String(destino.id));
    await transferencias.avanzar();
    expect(await transferencias.saldoDisponible()).toBe(500_000);
    await transferencias.ingresarMonto('120000');
    await transferencias.avanzar();
    await transferencias.confirmar();

    await expect(transferencias.comprobante('estado')).toHaveText('completada');
    expect(await fixture.saldo(origen.id)).toBe(380_000);
    expect(await fixture.saldo(destino.id)).toBe(120_000);
  });

  test('transfiere a un beneficiario y debita solo la cuenta origen', async ({ page }) => {
    const origen = await fixture.crearCuenta({ saldo: 300_000 });
    const tercero = await fixture.crearBeneficiario({ numeroCuenta: String(Date.now()).slice(-10) });
    const transferencias = new TransferenciasPage(page);

    await transferencias.abrirNuevaPara(fixture.usuarioId, 'beneficiario');
    await transferencias.elegirOrigen(origen.id);
    await transferencias.elegirBeneficiario(tercero.id);
    await transferencias.avanzar();
    await transferencias.ingresarMonto('75000');
    await transferencias.avanzar();
    await transferencias.confirmar();

    await expect(transferencias.comprobante('estado')).toHaveText('completada');
    expect(await fixture.saldo(origen.id)).toBe(225_000);
    expect(await fixture.transferenciasDesde(origen.id)).toBe(1);
  });

  test('no ofrece como origen una cuenta bloqueada', async ({ page }) => {
    const activa = await fixture.crearCuenta({ saldo: 10_000 });
    const bloqueada = await fixture.crearCuenta({ saldo: 10_000, estado: 'bloqueada' });
    const transferencias = new TransferenciasPage(page);

    await transferencias.abrirNuevaPara(fixture.usuarioId);
    const ofrecidas = (await transferencias.cuentasOrigen()).map((c) => Number(c.id));

    expect(ofrecidas).toContain(activa.id);
    expect(ofrecidas).not.toContain(bloqueada.id);
  });

  test('registra un beneficiario nuevo desde el alta', async ({ page }) => {
    const beneficiarios = new BeneficiariosPage(page);
    const numeroCuenta = String(Date.now()).slice(-12);

    await beneficiarios.abrirAlta(fixture.usuarioId);
    const [banco] = await beneficiarios.bancosDisponibles();
    await beneficiarios.completar({ nombre: 'Tercero E2E G04', banco, numeroCuenta });
    await beneficiarios.guardar();

    await expect(page).toHaveURL(/\/v2\/beneficiarios\/\d+$/);
    const guardado = (await fixture.beneficiariosDelCliente()).find((b) => b.numero_cuenta === numeroCuenta);
    expect(guardado).toBeTruthy();
    fixture.registrarBeneficiario(guardado!.id);
  });
});
