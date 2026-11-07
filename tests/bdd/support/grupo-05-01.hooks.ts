import { After, AfterAll, Before, Status } from '@cucumber/cucumber';
import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { SandboxAccessPage } from '../../../grupos/grupo-05-01-ahorros-depositos/playwright/pages/SandboxAccessPage';
import { Grupo0501Context, type Grupo0501World } from './grupo-05-01.world';
import { DepositosFixture0501 } from '../../../grupos/grupo-05-01-ahorros-depositos/fixtures/DepositosFixture';

const tags = '@grupo-05-01 and @web and not @wip';
const baseURL = process.env.GRUPO_05_01_BASE_URL || 'https://aiquaa-sandbox-web.vercel.app';
const email = process.env.GRUPO_05_01_EMAIL || 'elena.gomez@bancoqa.com';
let browser: Browser | undefined;
let session: Awaited<ReturnType<BrowserContext['storageState']>> | undefined;
let usuarioId: number;

// Se prepara solo si se ejecuta un caso de este grupo; no abre otro navegador
// al seleccionar escenarios de los demás grupos en la configuración compartida.
async function prepararSesion(): Promise<void> {
  if (session) return;
  browser = await chromium.launch({
    headless: !['1', 'true'].includes(process.env.HEADED || ''),
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    usuarioId = await new SandboxAccessPage(page).iniciarSesion(email);
    session = await context.storageState();
  } finally {
    await context.close();
  }
}

Before({ tags, timeout: 90_000 }, async function (this: Grupo0501World, { pickle }) {
  await prepararSesion();
  const context = await browser!.newContext({ baseURL, storageState: session });
  context.setDefaultTimeout(15_000);
  const page = await context.newPage();
  this.grupo0501 = new Grupo0501Context(context, page, usuarioId);
  const state = this.grupo0501;
  const positivo = pickle.tags.some(tag => tag.name === '@flujo-positivo')
    && pickle.tags.some(tag => tag.name === '@fixture-aislado');
  if (positivo) {
    state.fixture = await DepositosFixture0501.crear();
    await state.fixture.preparar(5_000_000);
  }
  await context.route('**/api/proxy/**', async route => {
    const request = route.request();
    const ruta = new URL(request.url()).pathname;
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      await route.continue();
      return;
    }
    if (state.cerrandoFixture) {
      state.escriturasBloqueadas.push(`${request.method()} ${ruta} durante la limpieza`);
      await route.abort('blockedbyclient');
      return;
    }
    const cancelacion = ruta.match(/^\/api\/proxy\/v2\/depositos\/(\d+)\/cancelar$/);
    let permiso: 'crear' | 'cancelar' | undefined;
    try {
      if (request.method() === 'POST' && ruta === '/api/proxy/v2/depositos'
        && state.fixture?.tomarPermisoCreacion(request.postDataJSON())) permiso = 'crear';
      else if (request.method() === 'POST' && cancelacion
        && state.fixture?.tomarPermisoCancelacion(Number(cancelacion[1]))) permiso = 'cancelar';
    } catch { /* Un body inválido no obtiene permiso de escritura. */ }
    if (!permiso) {
      state.escriturasBloqueadas.push(`${request.method()} ${ruta}`);
      await route.abort('blockedbyclient');
      return;
    }
    const registro = { metodo: request.method(), ruta, status: undefined as number | undefined };
    state.escriturasPermitidas.push(registro);
    let terminar!: () => void;
    const completada = new Promise<void>(resolve => { terminar = resolve; });
    state.escriturasEnCurso.add(completada);
    let resultadoConfirmado = false;
    try {
      // Se reenvía la solicitud real y se conserva su respuesta, sin simular datos.
      const response = await route.fetch({ maxRedirects: 0, timeout: 20_000 });
      registro.status = response.status();
      if (permiso === 'crear' && response.status() === 201) {
        state.fixture!.registrarCreado((await response.json()).data);
        resultadoConfirmado = true;
      }
      if (permiso === 'cancelar' && response.status() === 200) {
        state.fixture!.registrarCancelado((await response.json()).data);
        resultadoConfirmado = true;
      }
      if (response.status() >= 500) state.escrituraIncierta = true;
      await route.fulfill({ response });
    } catch {
      if (!resultadoConfirmado) state.escrituraIncierta = true;
      state.erroresDeRed.push(`No se pudo completar la escritura autorizada: ${request.method()} ${ruta}.`);
      await route.abort('failed').catch(() => {});
    } finally {
      terminar();
      state.escriturasEnCurso.delete(completada);
    }
  });
});

After({ tags, timeout: 120_000 }, async function (this: Grupo0501World, { result, pickle }) {
  const state = this.grupo0501;
  if (!state) return;
  let errorLimpieza: Error | undefined;
  const erroresEvidencia: string[] = [];
  const capturar = async () => {
    try { await this.attach(await state.page.screenshot({ timeout: 5_000 }), 'image/png'); }
    catch { erroresEvidencia.push('No se pudo adjuntar la captura; la limpieza continúa.'); }
  };
  try {
    state.cerrandoFixture = true;
    await Promise.allSettled([...state.escriturasEnCurso]);
    if (result?.status === Status.FAILED) {
      await capturar();
    }
    if (state.fixture) {
      try {
        if (state.escrituraIncierta) {
          state.fixture.resumen.recuperacionPendiente = true;
          throw new Error('La escritura tuvo un resultado incierto: se conservan la cuenta y el cliente propios para recuperación.');
        }
        await state.fixture.limpiar();
      }
      catch (error) {
        errorLimpieza = error as Error;
        if (result?.status !== Status.FAILED) await capturar();
      }
    }
    await this.attach(JSON.stringify({
      grupo: '05-01',
      escenario: pickle.name,
      escriturasBloqueadas: state.escriturasBloqueadas,
      escriturasPermitidas: state.escriturasPermitidas,
      limpieza: state.fixture?.resumen,
      erroresEvidencia,
      condicion: state.condicionMetaInvalida,
      operacion: state.operacion,
      montoSolicitado: state.montoSolicitado,
      proteccionAhorro: state.planConSaldoAntes ? {
        planId: state.planConSaldoAntes.id,
        cuentaId: state.planConSaldoAntes.cuenta_id,
        estadoAntes: state.planConSaldoAntes.estado,
        estadoDespues: state.planConSaldoDespues?.estado,
        activoAntes: state.planConSaldoAntes.activo,
        activoDespues: state.planConSaldoDespues?.activo,
        saldoAcumuladoAntes: state.planConSaldoAntes.saldo_acumulado,
        saldoAcumuladoDespues: state.planConSaldoDespues?.saldo_acumulado,
        saldoCuentaAntes: state.cuentaDelPlanAntes?.saldo,
        saldoCuentaDespues: state.cuentaDelPlanDespues?.saldo,
      } : undefined,
      sesion: 'curso 2; preparada una vez por proceso; sin enviar API key local',
    }), 'application/json');
    if (state.escriturasBloqueadas.length) {
      throw new Error('La guarda detectó un intento de escritura no autorizado.');
    }
    if (state.erroresDeRed.length) throw new Error(state.erroresDeRed.join(' | '));
    if (errorLimpieza) throw errorLimpieza;
  } finally {
    try { await state.fixture?.dispose(); }
    finally { await state.context.close(); }
  }
});

AfterAll(async () => {
  await browser?.close();
  browser = undefined;
  session = undefined;
});
