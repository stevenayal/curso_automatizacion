import { randomUUID } from 'node:crypto';
import { request, type APIRequestContext } from '@playwright/test';
import { config } from 'dotenv';

export interface CondicionesDeposito0501 {
  monto: number;
  plazoDias: number;
  tasaAnual: number;
}

export interface Deposito0501 {
  id: number;
  usuario_id: number;
  cuenta_id: number;
  monto: string;
  tasa_anual: string;
  plazo_dias: number;
  fecha_inicio: string;
  interes_proyectado: string;
  interes_generado: string;
  dias_transcurridos?: number;
  estado: string;
}

export function centavos0501(valor: string | number): number {
  if ((typeof valor !== 'string' && typeof valor !== 'number')
    || !/^-?\d+(?:\.\d{1,2})?$/.test(String(valor).trim())) {
    throw new Error('Importe monetario ausente o con formato inválido.');
  }
  const result = Math.round(Number(valor) * 100);
  if (!Number.isSafeInteger(result)) throw new Error('Importe inválido para comparar en centavos.');
  return result;
}

// Solo prepara y elimina recursos creados por esta instancia. La API key local
// se usa únicamente contra la API oficial; nunca se envía al frontend.
export class DepositosFixture0501 {
  usuarioId = 0;
  cuentaId = 0;
  saldoInicial = 0;
  condiciones?: CondicionesDeposito0501;
  creado?: Deposito0501;
  cancelado?: Deposito0501;
  readonly resumen: Record<string, unknown> = {};
  private readonly ids = new Set<number>();
  private readonly cancelacionesEnviadas = new Set<number>();
  private creacionEnviada = false;

  private constructor(private readonly api: APIRequestContext) {}

  static async crear(): Promise<DepositosFixture0501> {
    config({ quiet: true });
    const apiKey = process.env.API_KEY;
    const origin = new URL(process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app').origin;
    if (!apiKey) throw new Error('Falta API_KEY del curso 2 para preparar datos aislados.');
    if (origin !== 'https://aiquaa-sandbox-api.vercel.app') throw new Error('El fixture solo admite la API oficial de la sandbox.');
    const api = await request.newContext({ baseURL: origin, extraHTTPHeaders: { 'x-api-key': apiKey } });
    return new DepositosFixture0501(api);
  }

  async dispose(): Promise<void> {
    await this.api.dispose();
  }

  private async ejecutar(method: string, ruta: string, status: number, data?: unknown): Promise<any> {
    const altaDeRecurso = method === 'POST' && ['usuarios', 'cuentas'].includes(ruta);
    let response;
    try {
      response = await this.api.fetch(`/api/v2/${ruta}`, { method, data, timeout: 20_000, maxRedirects: 0 });
    } catch {
      if (altaDeRecurso) this.resumen.recuperacionPendiente = true;
      // No propagar logs de transporte que podrían incluir la cabecera de autenticación.
      throw new Error(`Fixture 05-01: no se pudo completar ${method} ${ruta}.`);
    }
    if (response.status() !== status) {
      if (altaDeRecurso && response.status() >= 500) this.resumen.recuperacionPendiente = true;
      throw new Error(`Fixture 05-01: ${method} ${ruta} respondió ${response.status()}, esperado ${status}.`);
    }
    if (status === 204 || status === 404) return undefined;
    try { return (await response.json()).data; }
    catch {
      if (altaDeRecurso) this.resumen.recuperacionPendiente = true;
      throw new Error(`Fixture 05-01: respuesta JSON inválida de ${method} ${ruta}.`);
    }
  }

  async preparar(saldoInicial: number): Promise<void> {
    this.saldoInicial = saldoInicial;
    const unique = randomUUID().replace(/-/g, '');
    const email = `g0501.flujo.${unique}@aiquaa.test`;
    // Permite identificar exclusivamente nuestros datos si el alta se aplica
    // pero se pierde su respuesta y no se recibe un ID verificable.
    this.resumen.emailPropio = email;
    const cliente = await this.ejecutar('POST', 'usuarios', 201, {
      nombre: `G05-01 Flujo ${unique.slice(0, 8)}`, email,
      documentoTipo: 'CI', documentoNumero: `G0501${unique.slice(0, 14)}`,
    });
    const clienteId = Number(cliente.id);
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0 || cliente.email !== email) {
      this.resumen.recuperacionPendiente = true;
      throw new Error('No se pudo identificar con seguridad el cliente creado.');
    }
    this.usuarioId = clienteId;
    this.resumen.clienteId = this.usuarioId;
    const cuenta = await this.ejecutar('POST', 'cuentas', 201, {
      usuarioId: this.usuarioId, tipoCuenta: 'ahorro', moneda: 'PYG',
    });
    const cuentaId = Number(cuenta.id);
    if (!Number.isSafeInteger(cuentaId) || cuentaId <= 0 || Number(cuenta.usuario_id) !== this.usuarioId) {
      this.resumen.recuperacionPendiente = true;
      throw new Error('La cuenta creada no corresponde al cliente propio.');
    }
    this.cuentaId = cuentaId;
    this.resumen.cuentaId = this.cuentaId;
    await this.ejecutar('POST', `cuentas/${this.cuentaId}/movimientos`, 201, {
      tipo: 'credito', monto: saldoInicial, descripcion: 'Fondeo aislado Grupo 05-01',
    });
    const saldo = await this.saldo();
    if (centavos0501(saldo) !== centavos0501(saldoInicial)) throw new Error('El fondeo no coincide con el saldo requerido.');
    this.resumen.saldoInicial = saldo;
  }

  autorizarCreacion(condiciones: CondicionesDeposito0501): void {
    this.condiciones = condiciones;
  }

  tomarPermisoCreacion(body: any): boolean {
    const expected = this.condiciones;
    if (!expected || this.creacionEnviada || !this.usuarioId || !this.cuentaId) return false;
    const allowed = body?.usuarioId === this.usuarioId && body?.cuentaId === this.cuentaId
      && body?.monto === expected.monto && body?.plazoDias === expected.plazoDias
      && body?.tasaAnual === expected.tasaAnual;
    if (allowed) this.creacionEnviada = true;
    return allowed;
  }

  registrarCreado(deposito: Deposito0501): void {
    if (Number(deposito.usuario_id) !== this.usuarioId || Number(deposito.cuenta_id) !== this.cuentaId
      || !Number.isSafeInteger(Number(deposito.id)) || Number(deposito.id) <= 0) {
      throw new Error('El depósito recibido no pertenece al fixture.');
    }
    this.ids.add(Number(deposito.id));
    this.creado = deposito;
  }

  tomarPermisoCancelacion(id: number): boolean {
    if (!this.ids.has(id) || this.cancelacionesEnviadas.has(id)) return false;
    this.cancelacionesEnviadas.add(id);
    return true;
  }

  registrarCancelado(deposito: Deposito0501): void {
    if (!this.ids.has(Number(deposito.id)) || Number(deposito.cuenta_id) !== this.cuentaId
      || Number(deposito.usuario_id) !== this.usuarioId) throw new Error('Cancelación ajena al fixture.');
    this.cancelado = deposito;
  }

  async saldo(): Promise<string> {
    if (!this.cuentaId || !this.usuarioId) throw new Error('El fixture no tiene una cuenta propia.');
    const cuenta = await this.ejecutar('GET', `cuentas/${this.cuentaId}`, 200);
    if (Number(cuenta.usuario_id) !== this.usuarioId) throw new Error('La cuenta no pertenece al fixture.');
    return cuenta.saldo;
  }

  async detalle(): Promise<Deposito0501> {
    if (!this.creado || !this.ids.has(Number(this.creado.id))) throw new Error('No se registró un depósito creado.');
    const deposito = await this.ejecutar('GET', `depositos/${this.creado.id}`, 200);
    if (Number(deposito.cuenta_id) !== this.cuentaId || Number(deposito.usuario_id) !== this.usuarioId) {
      throw new Error('Detalle ajeno al fixture.');
    }
    return deposito;
  }

  async movimientosDelDeposito(): Promise<any[]> {
    if (!this.creado) throw new Error('No existe el depósito del escenario.');
    const movimientos = await this.ejecutar('GET', `cuentas/${this.cuentaId}/movimientos`, 200);
    if (!Array.isArray(movimientos)) throw new Error('Respuesta inválida de movimientos.');
    return movimientos.filter(movimiento => movimiento.referencia_tipo === 'deposito'
      && Number(movimiento.referencia_id) === Number(this.creado!.id));
  }

  async limpiar(): Promise<void> {
    if (this.resumen.recuperacionPendiente) {
      throw new Error('Alta de fixture con resultado incierto: se conservan los recursos propios; recuperar por emailPropio e IDs del adjunto.');
    }
    const errors: string[] = [];
    let depositosSeguros = true;
    let cuentaCerrada = !this.cuentaId;
    if (this.usuarioId) {
      try {
        const depositos = await this.ejecutar('GET', `depositos?usuarioId=${this.usuarioId}`, 200);
        if (!Array.isArray(depositos)) throw new Error('No se pudieron recuperar los depósitos propios.');
        for (const deposito of depositos) {
          if (Number(deposito.usuario_id) !== this.usuarioId || Number(deposito.cuenta_id) !== this.cuentaId) {
            throw new Error('El listado contiene un recurso ajeno; no se cancelará.');
          }
          this.ids.add(Number(deposito.id));
          if (deposito.estado === 'activo') {
            const cancelado = await this.ejecutar('POST', `depositos/${deposito.id}/cancelar`, 200);
            if (cancelado.estado !== 'cancelado') throw new Error('El depósito sigue sin cancelar.');
            const recuperados = this.resumen.canceladosDuranteLimpieza as number[] | undefined;
            this.resumen.canceladosDuranteLimpieza = [...(recuperados || []), Number(deposito.id)];
          } else if (deposito.estado !== 'cancelado') {
            throw new Error(`Depósito ${deposito.id} en estado no recuperable: ${deposito.estado}.`);
          }
        }
        const finales = await this.ejecutar('GET', `depositos?usuarioId=${this.usuarioId}`, 200);
        if (!Array.isArray(finales) || finales.some(d => d.estado !== 'cancelado'
          || Number(d.cuenta_id) !== this.cuentaId || Number(d.usuario_id) !== this.usuarioId)) {
          throw new Error('No se verificó la cancelación de todos los depósitos propios.');
        }
        this.resumen.depositos = finales.map(d => ({ id: d.id, estado: d.estado }));
      } catch (error) {
        depositosSeguros = false;
        errors.push((error as Error).message);
      }
    }
    if (this.cuentaId && depositosSeguros) {
      try {
        const saldo = await this.saldo();
        this.resumen.saldoAntesDeRetirarFondeo = saldo;
        this.resumen.saldoRestaurado = centavos0501(saldo) === centavos0501(this.saldoInicial);
        if (!this.resumen.saldoRestaurado) errors.push('El saldo no volvió al fondeo inicial antes de retirar los fondos propios.');
        if (centavos0501(saldo) > 0) {
          await this.ejecutar('POST', `cuentas/${this.cuentaId}/movimientos`, 201, {
            tipo: 'debito', monto: Number(saldo), descripcion: 'Retiro de fondeo aislado Grupo 05-01',
          });
        }
        if (centavos0501(await this.saldo()) !== 0) throw new Error('Quedaron fondos en la cuenta propia.');
        await this.ejecutar('DELETE', `cuentas/${this.cuentaId}`, 204);
        await this.ejecutar('GET', `cuentas/${this.cuentaId}`, 404);
        cuentaCerrada = true;
        this.resumen.cuentaDadaDeBaja = true;
      } catch (error) { errors.push((error as Error).message); }
    }
    if (this.usuarioId && cuentaCerrada && depositosSeguros) {
      try {
        await this.ejecutar('DELETE', `usuarios/${this.usuarioId}`, 204);
        await this.ejecutar('GET', `usuarios/${this.usuarioId}`, 404);
        this.resumen.clienteDadoDeBaja = true;
      } catch (error) { errors.push((error as Error).message); }
    }
    this.resumen.errores = errors;
    if (errors.length) throw new Error(`Limpieza del fixture incompleta: ${errors.join(' | ')}`);
  }
}
