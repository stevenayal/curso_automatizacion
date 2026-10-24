import { test, expect } from '@playwright/test';

// Seed test — punto de partida estable para Planner/Generator/Healer.
// Corre con la sesión de storageState (project "setup" de playwright-skill → auth.setup.ts),
// así el agente no redescubre login, rol ni menú en cada exploración.
// Un seed por rol de negocio: seed-retail-user, seed-corporate-user, seed-admin...

test.describe('seed — retail user', () => {
  test('seed-retail-user @seed', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /bienvenido/i })).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
