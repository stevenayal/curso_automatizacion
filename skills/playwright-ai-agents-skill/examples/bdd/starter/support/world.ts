import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';
import { TasksPage } from '../pages/TasksPage';
import { SandboxLoginPage } from '../pages/SandboxLoginPage';
import { SandboxCoursePage } from '../pages/SandboxCoursePage';
import type { SandboxUser } from './sandbox-users-api';

export class PlaywrightWorld extends World {
  context?: BrowserContext;
  page?: Page;
  api?: APIRequestContext;
  activeSandboxUser?: SandboxUser;
  private tasksPage?: TasksPage;
  private sandboxLoginPage?: SandboxLoginPage;
  private sandboxCoursePage?: SandboxCoursePage;

  get tasks(): TasksPage {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.tasksPage ??= new TasksPage(this.page);
  }

  get sandboxLogin(): SandboxLoginPage {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.sandboxLoginPage ??= new SandboxLoginPage(this.page);
  }

  get sandboxCourse(): SandboxCoursePage {
    if (!this.page) throw new Error('El navegador no fue inicializado');
    return this.sandboxCoursePage ??= new SandboxCoursePage(this.page);
  }
}
setWorldConstructor(PlaywrightWorld);
