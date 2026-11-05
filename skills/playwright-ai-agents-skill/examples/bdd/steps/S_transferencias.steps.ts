// S_transferencias.steps.ts — glue delgado entre Gherkin y Page Objects.
// Reglas de capa:
//   - un step = una llamada a un método de Page Object / API helper del World
//   - CERO locators y CERO page.* acá (eso es pages/)
//   - los Then de valor de negocio (saldos, montos) son BLACKLIST del Healer
// Generado por skill playwright-ai-agents · aiquaa.com

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { PlaywrightWorld } from '../support/world';

Given('que soy un cliente retail con sesión iniciada', async function (this: PlaywrightWorld) {
  // storageState ya cargado en hooks.ts → solo verificamos el punto de partida (seed).
  await this.home.expectLoaded();
});

Given('que la cuenta {string} tiene un saldo disponible de {int}',
  async function (this: PlaywrightWorld, cuenta: string, saldo: number) {
    await this.api.setBalance(cuenta, saldo); // API setup, no UI
  });

When('transfiero {int} de {string} a {string}',
  async function (this: PlaywrightWorld, monto: number, origen: string, destino: string) {
    await this.transfers.goto();
    await this.transfers.transfer({ origin: origen, destination: destino, amount: monto });
  });

Then('veo la confirmación de la transferencia', async function (this: PlaywrightWorld) {
  await expect(this.transfers.success).toBeVisible();
});

Then('veo el rechazo {string}', async function (this: PlaywrightWorld, mensaje: string) {
  await expect(this.transfers.rejection).toContainText(mensaje);
});

// Expected de negocio — BLACKLIST del Healer.
Then('el saldo disponible de {string} es {int}',
  async function (this: PlaywrightWorld, cuenta: string, esperado: number) {
    expect(await this.api.balanceOf(cuenta)).toBe(esperado);
  });
