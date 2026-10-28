/**
 * Fixture aislado del Grupo 04 (issue #28).
 *
 * Cada escenario crea su propio cliente en la API v2 del sandbox y, a partir de
 * él, las cuentas, saldos y beneficiarios que necesita. Nada se apoya en datos
 * compartidos del seed: los montos y estados que verifican los tests son los
 * que este fixture dejó. `limpiar()` deshace todo lo creado (vacía saldos, da
 * de baja cuentas y beneficiarios, y el cliente), aunque el escenario falle.
 *
 * Requiere `API_KEY` (curso 2). `API_URL` es opcional.
 */

export type EstadoCuenta = 'activa' | 'bloqueada' | 'cerrada';
export type Moneda = 'PYG' | 'USD';

export interface CuentaFixture {
  id: number;
  numeroCuenta: string;
  moneda: Moneda;
  estado: EstadoCuenta;
}

export interface BeneficiarioFixture {
  id: number;
  numeroCuenta: string;
}

export interface RespuestaApi<T = any> {
  status: number;
  body: { data?: T; error?: { code: string; message: string } } | null;
}

/** ID que nunca existe en el sandbox (bigint positivo, fuera del rango sembrado). */
export const CUENTA_INEXISTENTE_ID = 999_999_999;

export class TransferenciasFixture {
  private readonly apiUrl = (process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app').replace(/\/$/, '');
  private readonly apiKey = process.env.API_KEY || '';

  usuarioId = 0;
  private readonly cuentas: CuentaFixture[] = [];
  private readonly beneficiarios: number[] = [];

  /** Crea el cliente aislado del escenario. Llamarlo antes de cualquier otra cosa. */
  async crearCliente(): Promise<number> {
    if (!this.apiKey) throw new Error('Falta API_KEY: el fixture de G04 crea datos en la API v2 del sandbox.');
    const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const res = await this.request('POST', '/api/v2/usuarios', {
      nombre: `G04 Fixture ${sufijo}`,
      email: `g04.fixture.${sufijo}@aiquaa.test`,
      documentoTipo: 'CI',
      documentoNumero: `G04${sufijo}`,
    });
    this.usuarioId = Number(this.dato(res, 201, 'crear el cliente').id);
    return this.usuarioId;
  }

  /**
   * Abre una cuenta del cliente con el saldo y estado pedidos. El saldo se
   * acredita como movimiento (la API no permite fijarlo) y el estado se aplica
   * después, porque una cuenta bloqueada o cerrada ya no admite movimientos.
   */
  async crearCuenta(opciones: { saldo?: number; estado?: EstadoCuenta; moneda?: Moneda } = {}): Promise<CuentaFixture> {
    const { saldo = 0, estado = 'activa', moneda = 'PYG' } = opciones;
    if (estado === 'cerrada' && saldo > 0) throw new Error('Una cuenta cerrada no puede tener saldo.');

    const res = await this.request('POST', '/api/v2/cuentas', {
      usuarioId: this.usuarioId,
      tipoCuenta: 'ahorro',
      moneda,
    });
    const creada = this.dato(res, 201, 'abrir la cuenta');
    const cuenta: CuentaFixture = { id: Number(creada.id), numeroCuenta: creada.numero_cuenta, moneda, estado: 'activa' };
    this.cuentas.push(cuenta);

    if (saldo > 0) await this.movimiento(cuenta.id, 'credito', saldo, 'Fondeo fixture G04');
    if (estado !== 'activa') await this.cambiarEstado(cuenta, estado);
    return cuenta;
  }

  async cambiarEstado(cuenta: CuentaFixture, estado: EstadoCuenta): Promise<void> {
    const res = await this.request('PATCH', `/api/v2/cuentas/${cuenta.id}/estado`, { estado });
    this.dato(res, 200, `pasar la cuenta ${cuenta.id} a ${estado}`);
    cuenta.estado = estado;
  }

  async crearBeneficiario(datos: { nombre?: string; banco?: string; numeroCuenta: string }): Promise<BeneficiarioFixture> {
    const res = await this.request('POST', '/api/v2/beneficiarios', {
      usuarioId: this.usuarioId,
      nombre: datos.nombre ?? 'Tercero fixture G04',
      banco: datos.banco ?? 'Banco Fixture',
      numeroCuenta: datos.numeroCuenta,
    });
    const creado = this.dato(res, 201, 'crear el beneficiario');
    this.beneficiarios.push(Number(creado.id));
    return { id: Number(creado.id), numeroCuenta: creado.numero_cuenta };
  }

  /** Registra en el fixture un beneficiario creado por la UI, para que `limpiar()` lo dé de baja. */
  registrarBeneficiario(id: number): void {
    if (!this.beneficiarios.includes(id)) this.beneficiarios.push(id);
  }

  async beneficiariosDelCliente(): Promise<Array<{ id: number; numero_cuenta: string; nombre: string }>> {
    const res = await this.request('GET', `/api/v2/beneficiarios?usuarioId=${this.usuarioId}`);
    return this.dato(res, 200, 'listar beneficiarios');
  }

  async saldo(cuentaId: number): Promise<number> {
    const res = await this.request('GET', `/api/v2/cuentas/${cuentaId}`);
    return Number(this.dato(res, 200, `leer la cuenta ${cuentaId}`).saldo);
  }

  /** POST /api/v2/transferencias sin validar el status: lo decide el escenario. */
  async transferir(body: { cuentaOrigenId: number; cuentaDestinoId?: number; beneficiarioId?: number; monto: number }): Promise<RespuestaApi> {
    return this.request('POST', '/api/v2/transferencias', { concepto: 'Transferencia fixture G04', ...body });
  }

  async transferenciasDesde(cuentaOrigenId: number): Promise<number> {
    const res = await this.request('GET', `/api/v2/transferencias?cuentaOrigenId=${cuentaOrigenId}`);
    return this.dato(res, 200, 'listar transferencias').length;
  }

  /**
   * Deshace lo creado. Cada paso tolera fallas (se registran y se sigue) para
   * no dejar el resto huérfano si uno falla.
   */
  async limpiar(): Promise<void> {
    const pendientes: string[] = [];
    const intentar = async (descripcion: string, paso: () => Promise<unknown>) => {
      try {
        await paso();
      } catch (e) {
        pendientes.push(`${descripcion}: ${(e as Error).message}`);
      }
    };

    for (const id of this.beneficiarios) {
      await intentar(`baja beneficiario ${id}`, () => this.request('DELETE', `/api/v2/beneficiarios/${id}`));
    }
    for (const cuenta of this.cuentas) {
      await intentar(`baja cuenta ${cuenta.id}`, async () => {
        // Una bloqueada vuelve a activa para poder vaciarla; una cerrada ya tiene saldo 0.
        if (cuenta.estado === 'bloqueada') await this.cambiarEstado(cuenta, 'activa');
        if (cuenta.estado === 'activa') {
          const saldo = await this.saldo(cuenta.id);
          if (saldo > 0) await this.movimiento(cuenta.id, 'debito', saldo, 'Limpieza fixture G04');
        }
        await this.request('DELETE', `/api/v2/cuentas/${cuenta.id}`);
      });
    }
    if (this.usuarioId) {
      await intentar(`baja cliente ${this.usuarioId}`, () => this.request('DELETE', `/api/v2/usuarios/${this.usuarioId}`));
    }
    if (pendientes.length) console.warn(`[fixture G04] limpieza incompleta:\n- ${pendientes.join('\n- ')}`);
  }

  private async movimiento(cuentaId: number, tipo: 'credito' | 'debito', monto: number, descripcion: string): Promise<void> {
    const res = await this.request('POST', `/api/v2/cuentas/${cuentaId}/movimientos`, { tipo, monto, descripcion });
    this.dato(res, 201, `registrar ${tipo} en la cuenta ${cuentaId}`);
  }

  private dato(res: RespuestaApi, esperado: number, accion: string): any {
    if (res.status !== esperado) {
      throw new Error(`No se pudo ${accion}: HTTP ${res.status} ${JSON.stringify(res.body?.error ?? res.body)}`);
    }
    return res.body?.data;
  }

  private async request(method: string, ruta: string, body?: unknown): Promise<RespuestaApi> {
    // Reintento ante 429: el sandbox limita las requests por minuto y por API key.
    for (let intento = 0; ; intento++) {
      const res = await fetch(`${this.apiUrl}${ruta}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.status === 429 && intento < 5) {
        // La API key del CI es compartida (200 req/min): se espera lo que indica Retry-After.
        const espera = Math.min(Number(res.headers.get('retry-after')) || 10, 60);
        await new Promise((r) => setTimeout(r, espera * 1_000 + Math.random() * 1_000));
        continue;
      }
      const texto = await res.text();
      return { status: res.status, body: texto ? JSON.parse(texto) : null };
    }
  }
}
