import { Given, Then, When } from '@cucumber/cucumber';
import { LoansWorld } from '../support/loans.world';

Given('que el administrador está autenticado en la sandbox', async function (this: LoansWorld) {
  await this.loans.signInAsAdmin(this.adminEmail);
});

Given('que el préstamo vigente {int} está disponible', async function (this: LoansWorld, loanId: number) {
  await this.loans.expectLoanListed(loanId);
});

When('consulta el detalle del préstamo {int}', async function (this: LoansWorld, loanId: number) {
  await this.loans.openLoan(loanId);
  this.currentLoanId = loanId;
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
