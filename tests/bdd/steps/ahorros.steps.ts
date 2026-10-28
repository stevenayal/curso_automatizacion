import { Given, Then, When } from '@cucumber/cucumber';
import { LoansWorld } from '../support/loans.world';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@aiquaa.com';

// ── Dado ────────────────────────────────────────────────────────────────────

Given('que el cliente está autenticado', async function (this: LoansWorld) {
  await this.depositos.signInAsAdmin(adminEmail);
});

Given('que el cliente tiene un depósito a plazo vigente', async function (this: LoansWorld) {
  await this.depositos.signInAsAdmin(adminEmail);
  await this.depositos.openDepositsList();
  await this.depositos.expectDepositsListedWithStatus('Activo');
});

Given('que existe un depósito a plazo vencido', async function (this: LoansWorld) {
  await this.depositos.signInAsAdmin(adminEmail);
  await this.depositos.openDepositsList();
  await this.depositos.expectDepositsListedWithStatus('Vencido');
});

Given('que existen opciones de depósitos a plazo disponibles', async function (this: LoansWorld) {
  await this.depositos.signInAsAdmin(adminEmail);
  await this.depositos.openDepositsList();
  await this.depositos.openNewDepositForm();
});

Given('que el cliente elige una cuenta activa en el formulario de depósito', async function (this: LoansWorld) {
  await this.depositos.signInAsAdmin(adminEmail);
  await this.depositos.openDepositsList();
  await this.depositos.openNewDepositForm();
  await this.depositos.selectHolderWithAccount();
});

Given('el importe del depósito supera el saldo que muestra la pantalla', async function (this: LoansWorld) {
  await this.depositos.enterAmountAboveDisplayedBalance();
});

// ── Cuando ──────────────────────────────────────────────────────────────────

When('consulta el detalle de ese depósito', async function (this: LoansWorld) {
  await this.depositos.openFirstListedDeposit();
});

When('el cliente consulta las tasas vigentes', async function (this: LoansWorld) {
  await this.depositos.readSuggestedRates();
});

When('el cliente despliega la lista de plazos', async function (this: LoansWorld) {
  await this.depositos.readAvailableTerms();
});

When('consulta un depósito a plazo que no existe', async function (this: LoansWorld) {
  await this.depositos.openDepositById();
});

When('filtra los depósitos por el estado {string}', async function (this: LoansWorld, status: string) {
  await this.depositos.openDepositsList();
  await this.depositos.filterByStatus(status);
});

When('intenta constituir un depósito por debajo del importe mínimo', async function (this: LoansWorld) {
  await this.depositos.selectTerm(30);
  await this.depositos.enterAmountBelowMinimum();
  await this.depositos.submitForm();
});

When('intenta constituir un depósito a plazo', async function (this: LoansWorld) {
  await this.depositos.selectTerm(30);
  await this.depositos.submitForm();
});

When(
  'ingresa un depósito de {int} guaraníes a {int} días con tasa de {float} %',
  async function (this: LoansWorld, amount: number, days: number, rate: number) {
    await this.depositos.enterProjection(amount, days, rate);
  },
);

// ── Entonces ────────────────────────────────────────────────────────────────

Then('el sistema muestra el capital, la tasa y la fecha de vencimiento', async function (this: LoansWorld) {
  await this.depositos.expectDetailShowsCapitalRateAndMaturity();
});

Then('el sistema muestra el interés proyectado del depósito', async function (this: LoansWorld) {
  await this.depositos.expectDetailShowsProjectedInterest();
});

Then('el sistema ofrece cancelar anticipadamente el depósito', async function (this: LoansWorld) {
  await this.depositos.expectCancellationOffered();
});

Then('el sistema lo muestra como vencido y con su interés generado', async function (this: LoansWorld) {
  await this.depositos.expectDetailShowsExpiredWithGeneratedInterest();
});

Then('el sistema no ofrece cancelar anticipadamente el depósito', async function (this: LoansWorld) {
  await this.depositos.expectCancellationNotOffered();
});

Then('el formulario rechaza la operación por no alcanzar el importe mínimo', async function (this: LoansWorld) {
  await this.depositos.expectMinimumAmountError();
});

Then('el formulario rechaza la operación por saldo insuficiente', async function (this: LoansWorld) {
  await this.depositos.expectInsufficientBalanceError();
});

Then('el depósito no es generado', async function (this: LoansWorld) {
  await this.depositos.expectDepositNotCreated();
});

Then('el sistema muestra el importe mínimo y los plazos disponibles', async function (this: LoansWorld) {
  await this.depositos.expectMinimumAmountAndTermsShown();
});

Then('la tasa sugerida es {float} % a {int} días', async function (this: LoansWorld, rate: number, days: number) {
  await this.depositos.expectSuggestedRate(days, rate);
});

Then(
  'el sistema ofrece únicamente los plazos de 30, 60, 90, 180, 365, 730 y 1095 días',
  async function (this: LoansWorld) {
    await this.depositos.expectOnlyTerms([30, 60, 90, 180, 365, 730, 1095]);
  },
);

Then('la vista previa muestra un interés proyectado de {string}', async function (this: LoansWorld, interest: string) {
  await this.depositos.expectProjectedInterest(interest);
});

Then('el sistema responde que el depósito no fue encontrado', async function (this: LoansWorld) {
  await this.depositos.expectDepositNotFound();
});

Then('todos los depósitos listados están en estado {string}', async function (this: LoansWorld, status: string) {
  await this.depositos.expectAllListedDepositsHaveStatus(status);
});
