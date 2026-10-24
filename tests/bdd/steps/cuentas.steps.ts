
import { Given, When, Then } from "@cucumber/cucumber";
import { LoansWorld } from "../support/loans.world";

// GRUPO 01 - CUENTAS BANCARIAS

Given(
  "que el cliente tiene una cuenta activa",
  async function (this: LoansWorld) {
    await this.cuentas.ingresarConCorreoAutorizado();
    await this.cuentas.abrirAplicacion();
    await this.cuentas.consultarCuentaActiva();
  }
);

When(
  "consulta el detalle de esa cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.consultarCuentaActiva();
  }
);

Then(
  "el sistema devuelve el saldo y la moneda de la cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.validarSaldoYMoneda();
  }
);
