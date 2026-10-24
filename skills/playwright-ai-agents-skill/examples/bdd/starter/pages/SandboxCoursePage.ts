import type { Page } from '@playwright/test';

export class SandboxCoursePage {
  constructor(private readonly page: Page) {}

  async chooseAutomationCourse(): Promise<void> {
    await this.page.goto('/curso');
    await this.page.getByRole('radio', { name: /Curso 1 · Automatización/i }).check();
    await Promise.all([
      this.page.waitForURL(/\/auth\/login/),
      this.page.getByRole('button', { name: 'Continuar', exact: true }).click(),
    ]);
  }
}
