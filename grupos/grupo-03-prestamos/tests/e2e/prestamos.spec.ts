import { test, expect } from '@playwright/test';
import { LoansPage } from '../../../../playwright/pages/LoansPage';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';

test.describe('@prestamos @grupo-03 Préstamos', () => {
  test('PRE-01 @happy-path el cliente consulta el saldo de un préstamo vigente', async ({ page }) => {
    const loans = new LoansPage(page);

    await loans.signInAsAdmin(adminEmail);
    await loans.openLoan(2);

    await loans.expectLoanApproved();
    await loans.expectOutstandingBalance('PYG 6.880.000,00');
    await loans.expectNextPendingInstallment();
  });

  test('PRE-02 @negativo rechaza la consulta de un préstamo de otro cliente', () => {
    test.fixme(true, 'Falta un cliente autenticable distinto del administrador y un préstamo ajeno documentado.');
  });

  test('PRE-03 @edge-case muestra saldo cero y estado cancelado', () => {
    test.fixme(true, 'El fixture documentado (préstamo 6) no existe en la UI de la sandbox.');
  });

  test('PRE-04 @negativo informa que el préstamo está en mora y su deuda vencida', () => {
    test.fixme(true, 'La UI no expone estado de mora ni hay un fixture verificable.');
  });

  test('PRE-05 @negativo rechaza el pago de una cuota por fondos insuficientes', () => {
    test.fixme(true, 'Requiere una cuenta aislada sin fondos; pagar en la sandbox compartida mutaría los datos.');
  });

  test('PRE-06 @happy-path calcula la sumatoria de cuotas consecutivas seleccionadas', () => {
    test.fixme(true, 'La UI actual solo permite pagar la siguiente cuota y no permite selección múltiple.');
  });
});
