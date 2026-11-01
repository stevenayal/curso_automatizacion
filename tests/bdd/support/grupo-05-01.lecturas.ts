import type { APIRequestContext } from '@playwright/test';

export interface CuentaGrupo0501 {
  id: number;
  usuario_id: number;
  estado: string;
  activa: boolean;
  moneda: string;
  saldo: string;
}

export interface PlanGrupo0501 {
  id: number;
  usuario_id: number;
  cuenta_id: number;
  estado: string;
  activo: boolean;
  saldo_acumulado: string;
}

// Consultas GET al mismo proxy de la web: no lee ni envía la API key local.
export class LecturasGrupo0501 {
  constructor(private readonly request: APIRequestContext) {}

  private async consultar<T>(producto: string, params: Record<string, string | number>): Promise<T[]> {
    const response = await this.request.get(`/api/proxy/v2/${producto}`, { params });
    if (response.status() !== 200) {
      throw new Error(`No se pudieron consultar ${producto}: HTTP ${response.status()}.`);
    }
    const body = await response.json();
    if (!Array.isArray(body.data)) throw new Error(`Respuesta inválida al consultar ${producto}.`);
    return body.data as T[];
  }

  cuentas(usuarioId: number): Promise<CuentaGrupo0501[]> {
    return this.consultar<CuentaGrupo0501>('cuentas', { usuarioId });
  }

  planesActivos(usuarioId: number): Promise<PlanGrupo0501[]> {
    return this.consultar<PlanGrupo0501>('ahorros', { usuarioId, estado: 'activo' });
  }

  private async detalle<T>(ruta: string): Promise<T> {
    const response = await this.request.get(`/api/proxy/v2/${ruta}`);
    if (response.status() !== 200) throw new Error(`No se pudo consultar ${ruta}: HTTP ${response.status()}.`);
    const body = await response.json();
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      throw new Error(`Respuesta inválida al consultar ${ruta}.`);
    }
    return body.data as T;
  }

  plan(planId: number): Promise<PlanGrupo0501> {
    return this.detalle<PlanGrupo0501>(`ahorros/${planId}`);
  }

  cuenta(cuentaId: number): Promise<CuentaGrupo0501> {
    return this.detalle<CuentaGrupo0501>(`cuentas/${cuentaId}`);
  }
}
