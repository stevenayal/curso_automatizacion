import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts', 'grupos/**/tests/e2e/**/*.spec.ts'],
  // Evita que Playwright ejecute copias de trabajo auxiliares presentes en el repositorio local.
  testIgnore: ['**/.claude/**', '**/node_modules/**'],
  timeout: 30_000,
  retries: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://aiquaa-sandbox-web.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
