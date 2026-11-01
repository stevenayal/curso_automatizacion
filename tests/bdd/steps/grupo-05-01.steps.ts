import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { grupo0501, type Grupo0501World } from '../support/grupo-05-01.world';
import type { DatosMetaGrupo0501 } from '../../../grupos/grupo-05-01-ahorros-depositos/playwright/pages/AhorrosPage';
import { centavos0501 } from '../../../grupos/grupo-05-01-ahorros-depositos/fixtures/DepositosFixture';

const opciones = { timeout: 30_000 };

Given('que el cliente está en el formulario de depósito con una cuenta elegible y saldo suficiente', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    const saldo = await state.depositos.abrirConCuentaElegible(state.usuarioId, 1_000_000);
    expect(saldo).toBeGreaterThanOrEqual(1_000_000);
  });

Given('que el cliente está en el formulario de constitución de un depósito', opciones,
  async function (this: Grupo0501World) {
    await grupo0501(this).depositos.abrirFormulario();
  });

When('intenta constituir un depósito de {int} guaraníes', opciones,
  async function (this: Grupo0501World, monto: number) {
    await grupo0501(this).depositos.intentarConstituir(monto);
  });

When('consulta las opciones de plazo', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  state.plazosConsultados = await state.depositos.plazosDisponibles();
});

When('selecciona el plazo de {int} días', opciones, async function (this: Grupo0501World, dias: number) {
  await grupo0501(this).depositos.seleccionarPlazo(dias);
});

// Expected de negocio: no modificar para ocultar diferencias de la aplicación.
Then('el formulario informa que no alcanza el mínimo de {int} guaraníes', opciones,
  async function (this: Grupo0501World, minimo: number) {
    const importe = new Intl.NumberFormat('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minimo);
    await expect(grupo0501(this).depositos.errorMonto).toHaveText(`El monto mínimo es PYG ${importe}.`);
  });

Then('no envía la solicitud de constitución a la API', opciones, async function (this: Grupo0501World) {
  expect(grupo0501(this).escriturasBloqueadas).toEqual([]);
});

Then('los plazos ofrecidos son {int}, {int}, {int}, {int}, {int}, {int} y {int} días', opciones,
  async function (this: Grupo0501World, d1: number, d2: number, d3: number, d4: number, d5: number, d6: number, d7: number) {
    expect(grupo0501(this).plazosConsultados).toEqual([d1, d2, d3, d4, d5, d6, d7]);
  });

Then('la pantalla sugiere una tasa anual de {float} por ciento', opciones,
  async function (this: Grupo0501World, tasa: number) {
    await expect.poll(async () => Number(await grupo0501(this).depositos.tasaAnual.inputValue())).toBe(tasa);
  });

Then('permite al cliente editar esa tasa', opciones, async function (this: Grupo0501World) {
  await expect(grupo0501(this).depositos.tasaAnual).toBeEditable();
});

Given('que el cliente inició sesión y está en el formulario de ahorro o depósito', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    state.cuentasTitular = await state.lecturas.cuentas(state.usuarioId);
    await state.depositos.abrirFormulario();
  });

When('selecciona el titular de la operación', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  await state.depositos.seleccionarTitular(state.usuarioId);
  state.cuentasOfrecidas = await state.depositos.opcionesDeCuenta();
});

Then('las opciones de cuenta contienen únicamente cuentas activas en guaraníes de ese titular', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    const elegibles = state.cuentasTitular!.filter(cuenta =>
      cuenta.usuario_id === state.usuarioId && cuenta.moneda === 'PYG'
      && cuenta.estado === 'activa' && cuenta.activa === true);
    expect(elegibles.length, 'La precondición requiere cuentas elegibles reales.').toBeGreaterThan(0);
    expect(state.cuentasOfrecidas!.map(cuenta => cuenta.id).sort((a, b) => a - b))
      .toEqual(elegibles.map(cuenta => cuenta.id).sort((a, b) => a - b));
  });

Given('que el cliente está en el formulario de ahorro con los demás datos válidos', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    await state.ahorros.abrirFormulario(state.usuarioId);
  });

const condicionesMeta: Record<string, { datos: DatosMetaGrupo0501; mensaje: string }> = {
  'meta inferior a 100000 guaraníes': {
    datos: { nombreMeta: 'Meta de prueba', metaMonto: 99999, aporteMensual: 1000 },
    mensaje: 'La meta mínima es PYG 100.000,00.',
  },
  'aporte mensual mayor que la meta': {
    datos: { nombreMeta: 'Meta de prueba', metaMonto: 1000000, aporteMensual: 1000001 },
    mensaje: 'El aporte mensual no puede superar la meta.',
  },
  'plazo proyectado mayor a 120 meses': {
    datos: { nombreMeta: 'Meta de prueba', metaMonto: 1210000, aporteMensual: 10000 },
    mensaje: 'Con ese aporte llegás en 121 meses: el plazo máximo es de 120 meses.',
  },
  'nombre con menos de 3 caracteres': {
    datos: { nombreMeta: 'AB', metaMonto: 1000000, aporteMensual: 100000 },
    mensaje: 'El nombre debe tener al menos 3 caracteres.',
  },
  'nombre con más de 40 caracteres': {
    datos: { nombreMeta: 'A'.repeat(41), metaMonto: 1000000, aporteMensual: 100000 },
    mensaje: 'El nombre puede tener hasta 40 caracteres.',
  },
};

When('intenta crear una meta con {string}', opciones,
  async function (this: Grupo0501World, condicion: string) {
    const state = grupo0501(this);
    if (!condicionesMeta[condicion]) throw new Error(`Condición no implementada: ${condicion}`);
    state.condicionMetaInvalida = condicion;
    await state.ahorros.intentarCrearMeta(condicionesMeta[condicion].datos);
  });

Then('la pantalla informa el incumplimiento de esa condición', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    await expect(state.ahorros.erroresCreacion).toHaveCount(1);
    await expect(state.ahorros.erroresCreacion).toHaveText(condicionesMeta[state.condicionMetaInvalida!].mensaje);
  });

Then('no envía la solicitud de creación a la API', opciones, async function (this: Grupo0501World) {
  expect(grupo0501(this).escriturasBloqueadas).toEqual([]);
});

Given('que el cliente tiene una cuenta elegible con saldo menor al importe solicitado', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    const cuentas = await state.lecturas.cuentas(state.usuarioId);
    state.cuentaOperacion = cuentas.find(cuenta =>
      cuenta.usuario_id === state.usuarioId && cuenta.moneda === 'PYG'
      && cuenta.estado === 'activa' && cuenta.activa === true && Number(cuenta.saldo) >= 0);
    if (!state.cuentaOperacion) throw new Error('DATA: el cliente no tiene una cuenta elegible para el caso.');
    state.montoSolicitado = Math.max(1_000_000, Math.ceil(Number(state.cuentaOperacion.saldo)) + 1);
    expect(state.montoSolicitado).toBeGreaterThan(Number(state.cuentaOperacion.saldo));
  });

When('intenta realizar {string} desde el formulario', opciones,
  async function (this: Grupo0501World, operacion: string) {
    const state = grupo0501(this);
    state.operacion = operacion;
    if (operacion === 'la constitución de un depósito') {
      await state.depositos.abrirConCuenta(state.usuarioId, state.cuentaOperacion!.id);
      await state.depositos.intentarConstituir(state.montoSolicitado!);
    } else if (operacion === 'un aporte al ahorro') {
      const planes = await state.lecturas.planesActivos(state.usuarioId);
      const plan = planes.find(plan => plan.usuario_id === state.usuarioId
        && plan.estado === 'activo' && plan.activo === true && plan.cuenta_id === state.cuentaOperacion!.id);
      if (!plan) throw new Error('DATA: no existe un plan activo del cliente asociado a la cuenta elegible.');
      await state.ahorros.abrirPlanParaAporte(plan.id);
      await state.ahorros.intentarAportar(state.montoSolicitado!);
    } else {
      throw new Error(`Operación no implementada: ${operacion}`);
    }
  });

Then('la pantalla informa que el saldo es insuficiente', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  const saldo = new Intl.NumberFormat('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(state.cuentaOperacion!.saldo));
  if (state.operacion === 'un aporte al ahorro') {
    await expect(state.ahorros.errorAporte).toHaveText(`Saldo insuficiente en la cuenta: el disponible es PYG ${saldo}.`);
  } else {
    await expect(state.depositos.errorMonto).toHaveText(`Saldo insuficiente: el disponible en la cuenta es PYG ${saldo}.`);
  }
});

Then('no envía la operación a la API', opciones, async function (this: Grupo0501World) {
  expect(grupo0501(this).escriturasBloqueadas).toEqual([]);
});

Given('que el cliente consulta un plan activo de prueba con saldo acumulado', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    const planes = await state.lecturas.planesActivos(state.usuarioId);
    const plan = planes.find(p => p.usuario_id === state.usuarioId && p.activo === true
      && p.estado === 'activo' && centavos0501(p.saldo_acumulado) > 0);
    if (!plan) throw new Error('DATA: se requiere un ahorro activo existente del cliente con saldo positivo; no se crean aportes compartidos.');
    state.planConSaldoAntes = await state.lecturas.plan(plan.id);
    expect(state.planConSaldoAntes.usuario_id).toBe(state.usuarioId);
    expect(state.planConSaldoAntes.activo).toBe(true);
    expect(state.planConSaldoAntes.estado).toBe('activo');
    expect(centavos0501(state.planConSaldoAntes.saldo_acumulado)).toBeGreaterThan(0);
    state.cuentaDelPlanAntes = await state.lecturas.cuenta(state.planConSaldoAntes.cuenta_id);
    await state.ahorros.abrirPlan(plan.id);
  });

When('intenta eliminar ese plan desde la pantalla', opciones, async function (this: Grupo0501World) {
  await grupo0501(this).ahorros.intentarEliminarPlanConSaldo();
});

Then('la pantalla impide la eliminación del plan con saldo', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  await expect(state.ahorros.eliminarMeta).toBeDisabled();
  await expect(state.ahorros.bloqueoEliminacion).toBeVisible();
});

Then('no envía la eliminación a la API', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  expect(state.escriturasBloqueadas).toEqual([]);
  expect(state.escriturasPermitidas).toEqual([]);
});

Then('conserva el estado y los saldos del plan y de su cuenta', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  const antes = state.planConSaldoAntes!;
  const despues = await state.lecturas.plan(antes.id);
  state.planConSaldoDespues = despues;
  expect(despues.id).toBe(antes.id);
  expect(despues.usuario_id).toBe(antes.usuario_id);
  expect(despues.cuenta_id).toBe(antes.cuenta_id);
  expect(despues.estado).toBe(antes.estado);
  expect(despues.activo).toBe(antes.activo);
  expect(centavos0501(despues.saldo_acumulado)).toBe(centavos0501(antes.saldo_acumulado));
  const cuenta = await state.lecturas.cuenta(antes.cuenta_id);
  state.cuentaDelPlanDespues = cuenta;
  expect(cuenta.id).toBe(state.cuentaDelPlanAntes!.id);
  expect(centavos0501(cuenta.saldo)).toBe(centavos0501(state.cuentaDelPlanAntes!.saldo));
});

Given('que existe un cliente y una cuenta propios con saldo inicial de {int} guaraníes', opciones,
  async function (this: Grupo0501World, saldo: number) {
    const state = grupo0501(this);
    expect(state.fixture, 'El flujo positivo requiere @fixture-aislado.').toBeDefined();
    expect(state.fixture!.usuarioId).not.toBe(state.usuarioId);
    expect(centavos0501(await state.fixture!.saldo())).toBe(centavos0501(saldo));
  });

When('constituye desde la web un depósito de {int} guaraníes al {float} por ciento durante {int} días', opciones,
  async function (this: Grupo0501World, monto: number, tasaAnual: number, plazoDias: number) {
    const state = grupo0501(this);
    const fixture = state.fixture!;
    fixture.autorizarCreacion({ monto, tasaAnual, plazoDias });
    await state.depositosOperativos.openNewDepositFormFor(fixture.usuarioId, fixture.cuentaId);
    await state.depositosOperativos.selectTerm(plazoDias);
    await state.depositosOperativos.enterRate(tasaAnual);
    await state.depositosOperativos.enterAmount(monto);
    await state.depositosOperativos.submitForm();
    const id = await state.depositosOperativos.expectDepositCreated();
    expect(id).toBe(Number(fixture.creado?.id));
  });

Then('el depósito aparece activo con sus condiciones y un interés proyectado de {string}', opciones,
  async function (this: Grupo0501World, interes: string) {
    const state = grupo0501(this);
    const fixture = state.fixture!;
    await state.depositosOperativos.expectDepositStatus('activo');
    const deposito = await fixture.detalle();
    expect(deposito.estado).toBe('activo');
    expect(Number(deposito.usuario_id)).toBe(fixture.usuarioId);
    expect(Number(deposito.cuenta_id)).toBe(fixture.cuentaId);
    expect(centavos0501(deposito.monto)).toBe(centavos0501(fixture.condiciones!.monto));
    expect(Number(deposito.tasa_anual)).toBe(fixture.condiciones!.tasaAnual);
    expect(deposito.plazo_dias).toBe(fixture.condiciones!.plazoDias);
    expect(centavos0501(deposito.interes_proyectado)).toBe(centavos0501(interes));
    expect(centavos0501(deposito.interes_generado)).toBe(0);
  });

Then('la cuenta propia se debita únicamente por el capital constituido', opciones,
  async function (this: Grupo0501World) {
    const fixture = grupo0501(this).fixture!;
    expect(centavos0501(await fixture.saldo()))
      .toBe(centavos0501(fixture.saldoInicial) - centavos0501(fixture.condiciones!.monto));
  });

When('cancela ese depósito desde la pantalla el mismo día', opciones, async function (this: Grupo0501World) {
  const state = grupo0501(this);
  await state.depositosOperativos.cancelDepositEarly(Number(state.fixture!.creado!.id));
});

Then('el depósito aparece cancelado sin días transcurridos ni intereses pagados', opciones,
  async function (this: Grupo0501World) {
    const state = grupo0501(this);
    const fixture = state.fixture!;
    await state.depositosOperativos.expectDepositStatus('cancelado');
    expect(fixture.cancelado, 'Debe existir una respuesta real de cancelación por la UI.').toBeDefined();
    expect(fixture.cancelado!.estado).toBe('cancelado');
    expect(fixture.cancelado!.dias_transcurridos).toBe(0);
    expect(centavos0501(fixture.cancelado!.interes_generado)).toBe(0);
    expect((await fixture.detalle()).estado).toBe('cancelado');
    expect(state.escriturasPermitidas.map(escritura => escritura.status)).toEqual([201, 200]);
  });

Then('el saldo de la cuenta propia vuelve exactamente al saldo inicial', opciones,
  async function (this: Grupo0501World) {
    const fixture = grupo0501(this).fixture!;
    expect(centavos0501(await fixture.saldo())).toBe(centavos0501(fixture.saldoInicial));
  });

Then('el depósito registra un único débito y un único reintegro del capital', opciones,
  async function (this: Grupo0501World) {
    const fixture = grupo0501(this).fixture!;
    const movimientos = await fixture.movimientosDelDeposito();
    expect(movimientos).toHaveLength(2);
    expect(movimientos.map(movimiento => movimiento.tipo).sort()).toEqual(['credito', 'debito']);
    for (const movimiento of movimientos) {
      expect(Number(movimiento.cuenta_id)).toBe(fixture.cuentaId);
      expect(centavos0501(movimiento.monto)).toBe(centavos0501(fixture.condiciones!.monto));
    }
  });
