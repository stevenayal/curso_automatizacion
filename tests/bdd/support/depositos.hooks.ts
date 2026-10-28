import { After, Before } from '@cucumber/cucumber';
import { DepositosFixture } from '../../../grupos/grupo-05-ahorros-depositos/fixtures/DepositosFixture';
import type { G05World } from '../steps/depositos.steps';

// Escenarios @fixture de G05: cliente y cuenta propios, creados antes y borrados después.
// El navegador de los @web lo sigue abriendo ahorros.hooks.ts.
Before({ tags: '@grupo-05 and @fixture and not @wip' }, async function (this: G05World) {
  this.g05 = { fixture: new DepositosFixture(), respuestas: [] };
  await this.g05.fixture.crearCliente();
});

After({ tags: '@grupo-05 and @fixture and not @wip' }, async function (this: G05World) {
  await this.g05?.fixture.limpiar();
});
