import { After, Before } from '@cucumber/cucumber';
import { PrestamosFixture } from '../../../grupos/grupo-03-prestamos/fixtures/PrestamosFixture';
import type { G03World } from '../steps/prestamos-api.steps';

// Escenarios @api de G03: usuario y préstamo propios, creados antes y
// dados de baja (best-effort) después. Los @web siguen en loans.hooks.ts.
Before({ tags: '@grupo-03 and @api and not @wip', timeout: 120_000 }, async function (this: G03World) {
  this.g03 = { fixture: new PrestamosFixture(), respuestas: [] };
  await this.g03.fixture.crearUsuario();
});

After({ tags: '@grupo-03 and @api and not @wip', timeout: 120_000 }, async function (this: G03World) {
  await this.g03?.fixture.limpiar();
});
