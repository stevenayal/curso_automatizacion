import { test, expect } from '@playwright/test';
import { SandboxLoginPage } from '../../playwright/pages/SandboxLoginPage';
import { TransferenciasPage } from '../../playwright/pages/TransferenciasPage';
import { BeneficiariosPage } from '../../playwright/pages/BeneficiariosPage';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';
// Cliente de lectura con dos cuentas activas en PYG (Ana Torres en el seed del sandbox).
const usuarioId = Number(process.env.TEST_G04_USUARIO_ID || 1);

/**
 * Smoke UI no destructivo del Grupo 04: valida las reglas del wizard sin
 * confirmar transferencias ni crear beneficiarios. Los flujos que mueven saldo
 * quedan pendientes del fixture aislado (issue #28).
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
