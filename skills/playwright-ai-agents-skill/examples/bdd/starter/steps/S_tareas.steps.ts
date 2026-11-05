import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { PlaywrightWorld } from '../support/world';

Given('que mi lista de tareas está vacía', async function (this: PlaywrightWorld) {
  await this.tasks.open();
  await expect(this.tasks.items).toHaveCount(0);
});

When('registro la tarea {string}', async function (this: PlaywrightWorld, title: string) {
  await this.tasks.register(title);
});

// Expected de negocio: blacklist del Healer.
Then('la lista conserva la tarea {string}', async function (this: PlaywrightWorld, title: string) {
  expect(await this.tasks.persistedTitles()).toEqual([title]);
});

Then('se rechaza el registro con el mensaje {string}', async function (this: PlaywrightWorld, message: string) {
  await expect(this.tasks.rejection).toHaveText(message);
});

Then('la lista contiene {int} tareas', async function (this: PlaywrightWorld, count: number) {
  await expect(this.tasks.items).toHaveCount(count);
});
