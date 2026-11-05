import { test, expect } from '@playwright/test';
import { DepositosPage } from '../../../../playwright/pages/DepositosPage';
import { DepositosFixture } from '../../fixtures/DepositosFixture';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';

/**
 * Flujos UI de depósitos a plazo (issue #31). Cada test crea su propio cliente
 * con una cuenta fondeada (DepositosFixture) y lo limpia al terminar: constituir
 * y cancelar no tocan cuentas compartidas del seed.
 */
test.describe('Grupo 05 — Depósitos a plazo con fixture aislado @smoke @grupo-05 @fixture', () => {
  let fixture: DepositosFixture;
  let depositos: DepositosPage;
  let cuentaId: number;

  test.beforeEach(async ({ page }) => {
    fixture = new DepositosFixture();
    await fixture.crearCliente();
    cuentaId = await fixture.crearCuenta(3_000_000);
    depositos = new DepositosPage(page);
  });

  test.afterEach(async () => {
    await fixture.limpiar();
  });

  test('constituye un depósito y lo cancela anticipadamente sin interés el mismo día', async () => {
    await depositos.signInAsAdmin(adminEmail, { allowWrites: true });
    await depositos.openNewDepositFormFor(fixture.usuarioId, cuentaId);
    await depositos.selectTerm(90);
    await depositos.enterAmount(2_000_000);
    await depositos.submitForm();

    const id = await depositos.expectDepositCreated();
    fixture.registrarDeposito(id);
    expect(await fixture.saldo(cuentaId)).toBe('1000000.00');

    await depositos.cancelDepositEarly(id);
    await depositos.expectDepositStatus('cancelado');
    expect(await fixture.saldo(cuentaId)).toBe('3000000.00');
  });

  test('rechaza en pantalla un depósito por debajo del mínimo y no lo genera', async () => {
    // Guarda de red activa: si la pantalla intentara escribir, el test falla.
    await depositos.signInAsAdmin(adminEmail);
    await depositos.openNewDepositFormFor(fixture.usuarioId, cuentaId);
    await depositos.selectTerm(30);
    await depositos.enterAmountBelowMinimum();
    await depositos.submitForm();

    await depositos.expectMinimumAmountError();
    await depositos.expectDepositNotCreated();
    expect(await fixture.depositosDelCliente()).toHaveLength(0);
  });
});
