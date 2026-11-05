import type { Page } from '@playwright/test';

export class TasksPage {
  constructor(private readonly page: Page) {}

  get items() { return this.page.getByRole('list', { name: 'Tareas' }).getByRole('listitem'); }
  get rejection() { return this.page.getByRole('alert'); }

  async open(): Promise<void> { await this.page.goto('/'); }

  async register(title: string): Promise<void> {
    await this.page.getByLabel('Tarea', { exact: true }).fill(title);
    await this.page.getByRole('button', { name: 'Agregar', exact: true }).click();
  }

  async persistedTitles(): Promise<string[]> {
    await this.page.reload();
    return this.items.allTextContents();
  }
}
