import { test, expect } from '@playwright/test';

/**
 * Specs UI del módulo "Ahorros y depósitos".
 * Placeholder: reemplazar por los flujos reales del grupo y quitar el `test.skip`.
 * Page Objects del grupo en `playwright/pages/` (extender `BasePage`).
 */
test.describe('Ahorros y depósitos', () => {
  test.skip('flujo principal del módulo (pendiente de implementar)', async ({ page }) => {
    await page.goto('/');
    expect(await page.title()).not.toBe('');
  });
});
