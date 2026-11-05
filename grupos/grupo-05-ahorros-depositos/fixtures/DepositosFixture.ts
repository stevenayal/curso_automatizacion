/**
 * Fixture aislado del Grupo 05 (issue #31).
 *
 * Los escenarios que constituyen o cancelan depósitos crean su propio cliente
 * en la API v2 del sandbox, con una cuenta en guaraníes fondeada para el caso.
 * Así el saldo y los depósitos que se verifican son exactos y ningún escenario
 * inmoviliza dinero de las cuentas compartidas del seed. `limpiar()` cancela
 * los depósitos activos (devuelve el capital), vacía y da de baja las cuentas,
 * y da de baja al cliente, aunque el escenario falle.
 *
 * Requiere `API_KEY` (curso 2). `API_URL` es opcional.
 */

export interface RespuestaApi<T = any> {
  status: number;
  body: { data?: T; error?: { code: string; message: string } } | null;
}

export interface Deposito {
  id: number;
  cuenta_id: number;
  estado: string;
  monto: string;
  interes_proyectado: string;
  interes_generado: string | null;
  dias_restantes: number;
}

/** ID que nunca existe en el sandbox (mismo valor que usa DepositosPage). */
export const DEPOSITO_INEXISTENTE_ID = 999_999;

export class DepositosFixture {
  private readonly apiUrl = (process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app').replace(/\/$/, '');
  private readonly apiKey = process.env.API_KEY || '';

  usuarioId = 0;
  private readonly cuentas: number[] = [];
  private readonly depositos: number[] = [];

  async crearCliente(): Promise<number> {
    if (!this.apiKey) throw new Error('Falta API_KEY: el fixture de G05 crea datos en la API v2 del sandbox.');
    const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const res = await this.request('POST', '/api/v2/usuarios', {
      nombre: `G05 Fixture ${sufijo}`,
      email: `g05.fixture.${sufijo}@aiquaa.test`,
      documentoTipo: 'CI',
      documentoNumero: `G05${sufijo}`,
    });
    this.usuarioId = Number(this.dato(res, 201, 'crear el cliente').id);
    return this.usuarioId;
  }

  /** Cuenta de ahorro en PYG con el saldo pedido (acreditado como movimiento: la API no permite fijarlo). */
  async crearCuenta(saldo: number): Promise<number> {
    const res = await this.request('POST', '/api/v2/cuentas', { usuarioId: this.usuarioId, tipoCuenta: 'ahorro', moneda: 'PYG' });
    const id = Number(this.dato(res, 201, 'abrir la cuenta').id);
    this.cuentas.push(id);
    if (saldo > 0) await this.movimiento(id, 'credito', saldo, 'Fondeo fixture G05');
    return id;
  }

  async saldo(cuentaId: number): Promise<string> {
    const res = await this.request('GET', `/api/v2/cuentas/${cuentaId}`);
    return this.dato(res, 200, `leer la cuenta ${cuentaId}`).saldo;
  }

  /** POST /api/v2/depositos sin validar el status: lo decide el escenario. */
  async constituir(cuentaId: number, monto: number, tasaAnual = 10, plazoDias = 30): Promise<RespuestaApi<Deposito>> {
    const res = await this.request('POST', '/api/v2/depositos', { usuarioId: this.usuarioId, cuentaId, monto, tasaAnual, plazoDias });
    if (res.status === 201) this.registrarDeposito(res.body!.data!.id);
    return res;
  }

  /** Registra un depósito creado por la UI, para que `limpiar()` lo cancele si sigue activo. */
  registrarDeposito(id: number): void {
    if (!this.depositos.includes(Number(id))) this.depositos.push(Number(id));
  }

  async depositosDelCliente(): Promise<Deposito[]> {
    const res = await this.request('GET', `/api/v2/depositos?usuarioId=${this.usuarioId}`);
    return this.dato(res, 200, 'listar depósitos');
  }

  /** Acceso directo a la API para los escenarios que verifican respuestas puntuales. */
  async request(method: string, ruta: string, body?: unknown): Promise<RespuestaApi> {
    // Reintento simple ante 429: el sandbox limita las requests por minuto.
    for (let intento = 0; ; intento++) {
      const res = await fetch(`${this.apiUrl}${ruta}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.status === 429 && intento < 3) {
        await new Promise((r) => setTimeout(r, 2_000 * (intento + 1)));
        continue;
      }
      const texto = await res.text();
      let cuerpo: RespuestaApi['body'] = null;
      try {
        cuerpo = texto ? JSON.parse(texto) : null;
      } catch {
        cuerpo = null; // p. ej. el 405 de Next.js no trae JSON
      }
      return { status: res.status, body: cuerpo };
    }
  }

  async limpiar(): Promise<void> {
    const pendientes: string[] = [];
    const intentar = async (descripcion: string, paso: () => Promise<unknown>) => {
      try {
        await paso();
      } catch (e) {
        pendientes.push(`${descripcion}: ${(e as Error).message}`);
      }
    };

    // Cancelar devuelve el capital a la cuenta; un depósito ya cancelado responde 409 y se ignora.
    for (const id of this.depositos) {
      await intentar(`cancelar depósito ${id}`, () => this.request('POST', `/api/v2/depositos/${id}/cancelar`));
    }
    for (const id of this.cuentas) {
      await intentar(`baja cuenta ${id}`, async () => {
        const saldo = Number(await this.saldo(id));
        if (saldo > 0) await this.movimiento(id, 'debito', saldo, 'Limpieza fixture G05');
        await this.request('DELETE', `/api/v2/cuentas/${id}`);
      });
    }
    if (this.usuarioId) {
      await intentar(`baja cliente ${this.usuarioId}`, () => this.request('DELETE', `/api/v2/usuarios/${this.usuarioId}`));
    }
    if (pendientes.length) console.warn(`[fixture G05] limpieza incompleta:\n- ${pendientes.join('\n- ')}`);
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
}
