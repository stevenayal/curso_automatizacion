import type { World } from '@cucumber/cucumber';
import type { BrowserContext, Page } from '@playwright/test';
import { DepositosGrupo0501Page } from '../../../grupos/grupo-05-01-ahorros-depositos/playwright/pages/DepositosPage';
import { AhorrosGrupo0501Page } from '../../../grupos/grupo-05-01-ahorros-depositos/playwright/pages/AhorrosPage';
import { LecturasGrupo0501, type CuentaGrupo0501, type PlanGrupo0501 } from './grupo-05-01.lecturas';
import { DepositosPage as DepositosOperativosPage } from '../../../playwright/pages/DepositosPage';
import type { DepositosFixture0501 } from '../../../grupos/grupo-05-01-ahorros-depositos/fixtures/DepositosFixture';

export class Grupo0501Context {
  private depositosPage?: DepositosGrupo0501Page;
  private ahorrosPage?: AhorrosGrupo0501Page;
  private consultas?: LecturasGrupo0501;
  private depositosOperativosPage?: DepositosOperativosPage;
  readonly escriturasBloqueadas: string[] = [];
  readonly escriturasPermitidas: { metodo: string; ruta: string; status?: number }[] = [];
  readonly erroresDeRed: string[] = [];
  readonly escriturasEnCurso = new Set<Promise<void>>();
  cerrandoFixture = false;
  escrituraIncierta = false;
  fixture?: DepositosFixture0501;
  plazosConsultados?: number[];
  cuentasTitular?: CuentaGrupo0501[];
  cuentasOfrecidas?: { id: number; descripcion: string }[];
  cuentaOperacion?: CuentaGrupo0501;
  condicionMetaInvalida?: string;
  operacion?: string;
  montoSolicitado?: number;
  planConSaldoAntes?: PlanGrupo0501;
  cuentaDelPlanAntes?: CuentaGrupo0501;
  planConSaldoDespues?: PlanGrupo0501;
  cuentaDelPlanDespues?: CuentaGrupo0501;

  constructor(
    readonly context: BrowserContext,
    readonly page: Page,
    readonly usuarioId: number,
  ) {}

  get depositos(): DepositosGrupo0501Page {
    return this.depositosPage ??= new DepositosGrupo0501Page(this.page);
  }

  get ahorros(): AhorrosGrupo0501Page {
    return this.ahorrosPage ??= new AhorrosGrupo0501Page(this.page);
  }

  get lecturas(): LecturasGrupo0501 {
    return this.consultas ??= new LecturasGrupo0501(this.context.request);
  }

  get depositosOperativos(): DepositosOperativosPage {
    return this.depositosOperativosPage ??= new DepositosOperativosPage(this.page);
  }
}

// Estado propio sobre el World del runner: no reemplaza el World de otros grupos.
export interface Grupo0501World extends World {
  grupo0501?: Grupo0501Context;
}

export function grupo0501(world: Grupo0501World): Grupo0501Context {
  if (!world.grupo0501) throw new Error('El contexto del Grupo 05-01 no fue inicializado.');
  return world.grupo0501;
}
