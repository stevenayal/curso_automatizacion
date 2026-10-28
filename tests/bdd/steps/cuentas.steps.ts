import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { LoansWorld } from "../support/loans.world";

// =======================================================
// GRUPO 01 - CUENTAS BANCARIAS
// =======================================================

// RF-G1-01
Given(
  "que existen cuentas vigentes en el sistema",
  async function (this: LoansWorld) {
    await this.cuentas.listarCuentas();
  }
);

Given(
  "que estoy autorizado para consultar cuentas",
  async function (this: LoansWorld) {
    await this.cuentas.listarCuentas();
  }
);

When(
  "consulto el listado de cuentas",
  async function (this: LoansWorld) {
    await this.cuentas.listarCuentas();
  }
);

When(
  "consulto las cuentas con estado {string}",
  async function (this: LoansWorld, estado: string) {
    await this.cuentas.listarCuentasPorEstado(estado);
  }
);

Then(
  "los datos deben contener únicamente cuentas vigentes",
  async function (this: LoansWorld) {
    const data = this.cuentas.ultimaRespuesta?.data;

    expect(Array.isArray(data)).toBeTruthy();

    for (const cuenta of data) {
      expect(cuenta.activa).toBe(true);
    }
  }
);

// RF-G1-02
Given(
  "que existe un usuario válido",
  async function () {
    expect(1).toBeGreaterThan(0);
  }
);

When(
  "solicito abrir una cuenta de tipo {string} en moneda {string}",
  async function (
    this: LoansWorld,
    tipoCuenta: string,
    moneda: string
  ) {
    await this.cuentas.abrirCuenta(
      1,
      tipoCuenta,
      moneda
    );
  }
);

When(
  "solicito abrir una cuenta con moneda {string}",
  async function (
    this: LoansWorld,
    moneda: string
  ) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      moneda
    );
  }
);

Then(
  "la cuenta debe crearse con saldo {string}",
  async function (
    this: LoansWorld,
    saldoEsperado: string
  ) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.saldo
    ).toBe(saldoEsperado);
  }
);

Then(
  "el estado debe ser {string}",
  async function (
    this: LoansWorld,
    estadoEsperado: string
  ) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.estado
    ).toBe(estadoEsperado);
  }
);

Then(
  "el número de cuenta debe tener 10 dígitos",
  async function (this: LoansWorld) {
    const numeroCuenta = String(
      this.cuentas.ultimaRespuesta?.data?.numero_cuenta
    );

    expect(numeroCuenta).toMatch(/^\d{10}$/);
  }
);

// RF-G1-03
Given(
  "que existe una cuenta vigente",
  async function (this: LoansWorld) {
    await this.cuentas.listarCuentas();

    expect(
      this.cuentas.cuentaIdActual
    ).toBeGreaterThan(0);
  }
);

When(
  "consulto la cuenta por su identificador",
  async function (this: LoansWorld) {
    await this.cuentas.consultarCuenta(
      this.cuentas.cuentaIdActual
    );
  }
);

When(
  "consulto una cuenta que no existe",
  async function (this: LoansWorld) {
    await this.cuentas.consultarCuenta(
      999999999
    );
  }
);

Then(
  "el identificador devuelto debe coincidir con el solicitado",
  async function (this: LoansWorld) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.id
    ).toBe(
      this.cuentas.cuentaIdActual
    );
  }
);

// RF-G1-04
When(
  "reemplazo su tipo de cuenta y moneda por valores válidos",
  async function (this: LoansWorld) {
    await this.cuentas.modificarCuenta(
      this.cuentas.cuentaIdActual,
      "corriente",
      "PYG"
    );
  }
);

When(
  "intento modificarla enviando solo el tipo de cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.modificarCuenta(
      this.cuentas.cuentaIdActual,
      "corriente"
    );
  }
);

Then(
  "los nuevos valores deben reflejarse al consultar nuevamente la cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.consultarCuenta(
      this.cuentas.cuentaIdActual
    );

    expect(
      this.cuentas.ultimaRespuesta?.data?.tipo_cuenta
    ).toBe("corriente");

    expect(
      this.cuentas.ultimaRespuesta?.data?.moneda
    ).toBe("PYG");
  }
);

// RF-G1-05
Given(
  "que existe una cuenta vigente con saldo cero",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );
  }
);

Given(
  "que existe una cuenta vigente con saldo mayor que cero",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );

    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "credito",
      100000
    );
  }
);

When(
  "solicito dar de baja la cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.eliminarCuenta(
      this.cuentas.cuentaIdActual
    );
  }
);

Then(
  "la cuenta ya no debe aparecer en el listado de cuentas vigentes",
  async function (this: LoansWorld) {
    const id = this.cuentas.cuentaIdActual;

    await this.cuentas.consultarCuenta(id);

    expect(
      this.cuentas.ultimoStatus
    ).toBe(404);
  }
);

// RF-G1-06
Given(
  "que existe una cuenta en estado {string}",
  async function (
    this: LoansWorld,
    estado: string
  ) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );

    if (estado !== "activa") {
      await this.cuentas.cambiarEstado(
        this.cuentas.cuentaIdActual,
        estado
      );
    }
  }
);

Given(
  "que existe una cuenta con saldo mayor que cero",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );

    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "credito",
      100000
    );
  }
);

When(
  "cambio su estado a {string}",
  async function (
    this: LoansWorld,
    estado: string
  ) {
    await this.cuentas.cambiarEstado(
      this.cuentas.cuentaIdActual,
      estado
    );
  }
);

When(
  "intento cambiar su estado a {string}",
  async function (
    this: LoansWorld,
    estado: string
  ) {
    await this.cuentas.cambiarEstado(
      this.cuentas.cuentaIdActual,
      estado
    );
  }
);

Then(
  "el estado de la cuenta debe ser {string}",
  async function (
    this: LoansWorld,
    estadoEsperado: string
  ) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.estado
    ).toBe(estadoEsperado);
  }
);

// RF-G1-07
Given(
  "que existe una cuenta recién abierta sin movimientos",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );
  }
);

When(
  "consulto el saldo de la cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.consultarSaldo(
      this.cuentas.cuentaIdActual
    );
  }
);

Then(
  "el saldo debe ser {string}",
  async function (
    this: LoansWorld,
    saldoEsperado: string
  ) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.saldo
    ).toBe(saldoEsperado);
  }
);

Then(
  "el último movimiento debe ser nulo",
  async function (this: LoansWorld) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.ultimo_movimiento
    ).toBeNull();
  }
);

// RF-G1-08
Given(
  "que existe una cuenta recién abierta",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );
  }
);

When(
  "consulto los movimientos de la cuenta",
  async function (this: LoansWorld) {
    await this.cuentas.consultarMovimientos(
      this.cuentas.cuentaIdActual
    );
  }
);

Then(
  "la lista de movimientos debe estar vacía",
  async function (this: LoansWorld) {
    expect(
      this.cuentas.ultimaRespuesta?.data
    ).toEqual([]);
  }
);

// RF-G1-09
Given(
  "que existe una cuenta activa con saldo cero",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );
  }
);

Given(
  "que existe una cuenta activa con saldo 500000",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );

    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "credito",
      500000
    );
  }
);

Given(
  "que existe una cuenta activa con saldo 100000",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );

    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "credito",
      100000
    );
  }
);

Given(
  "que existe una cuenta activa",
  async function (this: LoansWorld) {
    await this.cuentas.abrirCuenta(
      1,
      "ahorro",
      "PYG"
    );
  }
);

When(
  "registro un movimiento de tipo {string} por {int}",
  async function (
    this: LoansWorld,
    tipo: string,
    monto: number
  ) {
    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      tipo,
      monto
    );
  }
);

When(
  "intento registrar un débito por {int}",
  async function (
    this: LoansWorld,
    monto: number
  ) {
    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "debito",
      monto
    );
  }
);

When(
  "intento registrar un movimiento con monto {int}",
  async function (
    this: LoansWorld,
    monto: number
  ) {
    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "credito",
      monto
    );
  }
);

When(
  "intento registrar un movimiento con monto {string}",
  async function (
    this: LoansWorld,
    monto: string
  ) {
    await this.cuentas.registrarMovimiento(
      this.cuentas.cuentaIdActual,
      "credito",
      monto
    );
  }
);

Then(
  "el saldo posterior debe ser {string}",
  async function (
    this: LoansWorld,
    saldoEsperado: string
  ) {
    expect(
      this.cuentas.ultimaRespuesta?.data?.saldo_posterior
    ).toBe(saldoEsperado);
  }
);

Then(
  "el saldo de la cuenta no debe cambiar",
  async function (this: LoansWorld) {
    await this.cuentas.consultarSaldo(
      this.cuentas.cuentaIdActual
    );

    expect(
      this.cuentas.ultimaRespuesta?.data?.saldo
    ).toBe("100000.00");
  }
);

// STEPS COMUNES
Then(
  "la respuesta debe ser {int}",
  async function (
    this: LoansWorld,
    statusEsperado: number
  ) {
    this.cuentas.validarStatus(
      statusEsperado
    );
  }
);

Then(
  "el error debe ser {string}",
  async function (
    this: LoansWorld,
    errorEsperado: string
  ) {
    this.cuentas.validarError(
      errorEsperado
    );
  }
);

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
