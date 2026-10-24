import type { Page } from '@playwright/test';

export class SandboxLoginPage {
  constructor(private readonly page: Page) {}

  get error() { return this.page.getByText('Usuario no encontrado o inactivo.', { exact: true }); }

  async open(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  async signInWith(email: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await this.page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  }
}
