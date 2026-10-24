import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { PlaywrightWorld } from '../support/world';
import { SandboxUsersApi } from '../support/sandbox-users-api';

Given('que estoy en el inicio de sesión del sandbox', async function (this: PlaywrightWorld) {
  await this.sandboxCourse.chooseAutomationCourse();
});

When('ingreso con el email inexistente {string}', async function (this: PlaywrightWorld, email: string) {
  await this.sandboxLogin.signInWith(email);
});

Given('que obtengo un usuario activo desde la API del sandbox', async function (this: PlaywrightWorld) {
  if (!this.api) throw new Error('Falta SANDBOX_API_KEY para consultar los usuarios activos');
  this.activeSandboxUser = await new SandboxUsersApi(this.api).firstActiveUser();
});

When('ingreso con el usuario activo consultado', async function (this: PlaywrightWorld) {
  if (!this.activeSandboxUser) throw new Error('No se consultó un usuario activo');
  await this.sandboxLogin.signInWith(this.activeSandboxUser.email);
});

Then('veo el mensaje de acceso {string}', async function (this: PlaywrightWorld, message: string) {
  await expect(this.sandboxLogin.error).toHaveText(message);
});

Then('veo la bienvenida del usuario activo', async function (this: PlaywrightWorld) {
  if (!this.activeSandboxUser || !this.page) throw new Error('No hay usuario activo ni página disponible');
  await expect(this.page.getByRole('heading', { name: `Bienvenido, ${this.activeSandboxUser.nombre}` })).toBeVisible();
});
