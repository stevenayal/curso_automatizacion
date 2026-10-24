import { Given, Then, When } from '@cucumber/cucumber';
import { LoansWorld } from '../support/loans.world';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';

Given('que el administrador está autenticado en la sandbox', async function (this: LoansWorld) {
  await this.loans.signInAsAdmin(adminEmail);
});

Given('que el préstamo vigente {int} está disponible', async function (this: LoansWorld, loanId: number) {
  if (loanId !== 2) {
    throw new Error(`No hay un fixture de préstamo vigente configurado para el id ${loanId}.`);
  }
});

When('consulta el detalle del préstamo {int}', async function (this: LoansWorld, loanId: number) {
  await this.loans.openLoan(loanId);
});

Then('el préstamo está aprobado', async function (this: LoansWorld) {
  await this.loans.expectLoanApproved();
});

Then('muestra el saldo pendiente {string}', async function (this: LoansWorld, balance: string) {
  await this.loans.expectOutstandingBalance(balance);
});

Then('muestra la próxima cuota pendiente', async function (this: LoansWorld) {
  await this.loans.expectNextPendingInstallment();
});
