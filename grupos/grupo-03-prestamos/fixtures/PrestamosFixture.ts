/**
 * Fixture aislado del Grupo 03 (préstamos).
 *
 * Los escenarios @api crean su propio usuario y su propio préstamo en la API v2
 * del sandbox. Así las validaciones de saldo y cuotas no dependen de los
 * préstamos del seed y ningún escenario modifica datos compartidos.
 *
 * Requiere `API_KEY` (Curso 2). `API_URL` es opcional.
 * La limpieza es best-effort: intenta dar de baja el préstamo y el usuario; si
 * la API rechaza la baja porque el préstamo sigue vigente, no falla el escenario.
 */

export interface RespuestaApi<T = any> {
  status: number;
  body: { data?: T; error?: { code: string; message: string } } | null;
}

export interface Prestamo {
  id: number;
  usuario_id: number;
  monto_solicitado: string;
  tasa_interes: string;
  plazo_meses: number;
  saldo_pendiente: string;
  estado: string;
}

export interface Cuota {
  id: number;
  prestamo_id: number;
  numero_cuota: number;
  monto: string;
  fecha_vencimiento: string;
  estado: string;
  fecha_pago: string | null;
}

interface FilaSaldo {
  saldo_pendiente: string;
  pagadas: number;
}

export class PrestamosFixture {
  private readonly apiUrl = (process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app').replace(/\/$/, '');
  private readonly apiKey = process.env.API_KEY || '';

  usuarioId = 0;
  private readonly prestamos: number[] = [];

  async crearUsuario(): Promise<number> {
    if (!this.apiKey) {
      throw new Error('Falta API_KEY: los escenarios @api de G03 crean datos en la API v2 del sandbox.');
    }
    const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const res = await this.request('POST', '/api/v2/usuarios', {
      nombre: 'Grupo 03 Prestamos QA',
      email: `g03.prestamos.${sufijo}@test.com`,
      documentoTipo: 'CI',
      documentoNumero: `G03${sufijo}`,
      telefono: '0981000000',
    });
    this.usuarioId = Number(this.dato(res, 201, 'crear el usuario de prueba').id);
    return this.usuarioId;
  }

  /** POST /api/v2/prestamos sin validar el status: lo decide el escenario. */
  async solicitar(monto: number, tasaInteres = 12, plazoMeses = 6): Promise<RespuestaApi<Prestamo>> {
    const res = await this.request('POST', '/api/v2/prestamos', {
      usuarioId: this.usuarioId,
      montoSolicitado: monto,
      tasaInteres,
      plazoMeses,
    });
    if (res.status === 201) this.prestamos.push(Number(res.body!.data!.id));
    return res;
  }

  async aprobar(prestamoId: number): Promise<RespuestaApi<Prestamo>> {
    return this.request('POST', `/api/v2/prestamos/${prestamoId}/aprobar`);
  }

  async pagar(prestamoId: number, numeroCuota: number): Promise<RespuestaApi> {
    return this.request('POST', `/api/v2/prestamos/${prestamoId}/cuotas/${numeroCuota}/pagar`, {});
  }

  async contarPrestamos(): Promise<number> {
    const [fila] = await this.sql<{ total: number }>(
      'SELECT COUNT(*) AS total FROM prestamos WHERE usuario_id = $1',
      [this.usuarioId],
    );
    return Number(fila.total);
  }

  async filaSaldo(prestamoId: number): Promise<FilaSaldo> {
    const [fila] = await this.sql<FilaSaldo>(
      'SELECT p.saldo_pendiente, ' +
        "(SELECT COUNT(*) FROM cuotas_prestamo c WHERE c.prestamo_id = p.id AND c.estado = 'pagada') AS pagadas " +
        'FROM prestamos p WHERE p.id = $1',
      [prestamoId],
    );
    return fila;
  }

  async cuota(prestamoId: number, numeroCuota: number): Promise<Cuota | undefined> {
    const [fila] = await this.sql<Cuota>(
      'SELECT id, prestamo_id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago ' +
        'FROM cuotas_prestamo WHERE prestamo_id = $1 AND numero_cuota = $2',
      [prestamoId, numeroCuota],
    );
    return fila;
  }

  async cuotas(prestamoId: number): Promise<Cuota[]> {
    return this.sql<Cuota>(
      'SELECT id, prestamo_id, numero_cuota, monto, fecha_vencimiento, estado, fecha_pago ' +
        'FROM cuotas_prestamo WHERE prestamo_id = $1 ORDER BY numero_cuota',
      [prestamoId],
    );
  }

  /** Consulta de solo lectura contra /api/v2/sql/select. */
  async sql<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.request('POST', '/api/v2/sql/select', { sql, params });
    return this.dato(res, 200, 'consultar la base de datos') as T[];
  }

  /** Acceso directo a la API para los escenarios que verifican respuestas puntuales. */
  async request(method: string, ruta: string, body?: unknown): Promise<RespuestaApi> {
    // El sandbox limita las requests por minuto: se espera lo que indique
    // Retry-After. La espera total se acota por debajo del timeout del step
    // (120 s) para fallar con un mensaje claro en lugar de un timeout.
    const limite = Date.now() + 90_000;
    for (;;) {
      const res = await fetch(`${this.apiUrl}${ruta}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.status === 429) {
        const espera = Math.min(Number(res.headers.get('retry-after')) || 10, 60);
        if (Date.now() + espera * 1_000 > limite) {
          throw new Error(
            `El sandbox sigue limitando requests (429) en ${method} ${ruta}. ` +
              'Reintentar más tarde o bajar la cantidad de escenarios en paralelo.',
          );
        }
        await new Promise((r) => setTimeout(r, espera * 1_000 + Math.random() * 1_000));
        continue;
      }
      const texto = await res.text();
      let cuerpo: RespuestaApi['body'] = null;
      try {
        cuerpo = texto ? JSON.parse(texto) : null;
      } catch {
        cuerpo = null; // p. ej. un 405 de Next.js no trae JSON
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

    // Un préstamo aprobado puede rechazar la baja con 409; se ignora.
    for (const id of this.prestamos) {
      await intentar(`baja préstamo ${id}`, () => this.request('DELETE', `/api/v2/prestamos/${id}`));
    }
    if (this.usuarioId) {
      await intentar(`baja usuario ${this.usuarioId}`, () => this.request('DELETE', `/api/v2/usuarios/${this.usuarioId}`));
    }
    if (pendientes.length) console.warn(`[fixture G03] limpieza incompleta:\n- ${pendientes.join('\n- ')}`);
  }

  private dato(res: RespuestaApi, esperado: number, accion: string): any {
    if (res.status !== esperado) {
      throw new Error(`No se pudo ${accion}: HTTP ${res.status} ${JSON.stringify(res.body?.error ?? res.body)}`);
    }
    return res.body?.data;
  }
}
