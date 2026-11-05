import { test, expect } from '@playwright/test';

// Smoke del sitio bajo prueba: aiquaa-sandbox-web (BASE_URL en playwright.config.ts).
test.describe('Smoke — aiquaa Sandbox @smoke', () => {
  test('la página principal carga sin errores de JavaScript', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');

    await expect(page).toHaveTitle(/aiquaa Sandbox/);
    expect(errors).toHaveLength(0);
  });

  test('el selector de curso ofrece Curso 2 · Productos Bancarios', async ({ page }) => {
    await page.goto('/curso');
    await expect(page.getByRole('radio', { name: /Curso 2/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });

  test('el login responde sin error', async ({ page }) => {
    const response = await page.goto('/auth/login');
    expect(response?.status()).toBeLessThan(400);
  });
});
