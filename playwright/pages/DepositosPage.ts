import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

// Id que no existe en la sandbox (mismo valor que depositoInexistenteId en la colección Postman del grupo).
const NONEXISTENT_DEPOSIT_ID = 999999;
// Regla de UI (requerimientos, sección 6): monto mínimo de un depósito en guaraníes.
const MINIMUM_AMOUNT = 1_000_000;
const MINIMUM_AMOUNT_ERROR = 'El monto mínimo es PYG 1.000.000,00.';

export class DepositosPage extends BasePage {
  private writeAttempts: string[] = [];
  private accountBalance = '';
  private suggestedRates = new Map<string, number>();
  private availableTerms: string[] = [];

  constructor(page: Page) {
    super(page);
  }

  /**
   * Autentica y, antes de hacerlo, instala una guarda de red: cualquier escritura
   * (POST/PUT/PATCH/DELETE) hacia el proxy de la API se aborta y se registra, así
   * ningún escenario puede modificar datos compartidos aunque la pantalla lo permita.
   */
  async signInAsAdmin(email: string): Promise<void> {
    await this.page.context().route(/\/api\/proxy\//, async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.continue();
        return;
      }
      this.writeAttempts.push(`${request.method()} ${request.url()}`);
      await route.abort();
    });
    await this.page.goto('/');
    await this.page.getByRole('radio', { name: /Curso 2/ }).check();
    await this.page.getByRole('button', { name: 'Continuar' }).click();
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(this.page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();
  }

  private expectNoWritesAttempted(): void {
    expect(this.writeAttempts, 'la guarda de red detectó intentos de escritura').toEqual([]);
  }

  // ── Listado ────────────────────────────────────────────────────────────────

  async openDepositsList(): Promise<void> {
    await this.page.getByTestId('nav-item-v2-depositos').click();
    await expect(this.page.getByRole('heading', { name: 'Depósitos a plazo' })).toBeVisible();
  }

  private rows(): Locator {
    return this.page.locator('[data-testid^="v2-depositos-row-"]:not([data-testid$="-cancelar"])');
  }

  async filterByStatus(status: string): Promise<void> {
    await this.page.getByTestId('v2-depositos-field-estado').selectOption({ label: status });
  }

  async expectDepositsListedWithStatus(status: string): Promise<void> {
    await this.filterByStatus(status);
    await expect(this.rows().first()).toBeVisible();
    await expect(this.rows().first()).toContainText(status);
  }

  async expectAllListedDepositsHaveStatus(status: string): Promise<void> {
    await expect(this.rows().first()).toContainText(status);
    const total = await this.rows().count();
    for (let i = 0; i < total; i++) {
      await expect(this.rows().nth(i)).toContainText(status);
    }
    this.expectNoWritesAttempted();
  }

  // ── Detalle ────────────────────────────────────────────────────────────────

  /** Abre el detalle del primer depósito del listado actual, sin fijar un id. */
  async openFirstListedDeposit(): Promise<void> {
    const testId = await this.rows().first().getAttribute('data-testid');
    const id = testId?.match(/row-(\d+)$/)?.[1];
    expect(id, 'id del primer depósito listado').toBeTruthy();
    await this.page.goto(`/v2/depositos/${id}`);
    await expect(this.page.getByRole('heading', { name: `Depósito a plazo N° ${id}` })).toBeVisible();
  }

  async openDepositById(id: number = NONEXISTENT_DEPOSIT_ID): Promise<void> {
    await this.page.goto(`/v2/depositos/${id}`);
  }

  private detail(): Locator {
    return this.page.getByTestId('v2-depositos-detail');
  }

  async expectDetailShowsCapitalRateAndMaturity(): Promise<void> {
    const detail = this.detail();
    await expect(detail.getByTestId('v2-depositos-detail-monto')).toContainText(/PYG\s[\d.]+,\d{2}/);
    await expect(detail.getByTestId('v2-depositos-detail-tasa')).toContainText(/\d+,\d{2}\s%/);
    // «Vencimiento» y su fecha están fuera del contenedor `detail`: se busca el rótulo y su fila.
    const maturity = this.page.getByText('Vencimiento', { exact: true });
    await expect(maturity).toBeVisible();
    await expect(maturity.locator('xpath=..')).toContainText(/\d{2}\/\d{2}\/\d{4}/);
    this.expectNoWritesAttempted();
  }

  async expectDetailShowsProjectedInterest(): Promise<void> {
    const detail = this.detail();
    await expect(detail.getByText('Interés proyectado', { exact: true })).toBeVisible();
    await expect(detail.getByTestId('v2-depositos-detail-interes')).toContainText(/PYG\s[\d.]+,\d{2}/);
    this.expectNoWritesAttempted();
  }

  async expectDetailShowsExpiredWithGeneratedInterest(): Promise<void> {
    const detail = this.detail();
    await expect(detail.getByTestId('v2-depositos-detail-estado')).toContainText('Vencido');
    await expect(detail.getByText('Interés generado', { exact: true })).toBeVisible();
    this.expectNoWritesAttempted();
  }

  /** Solo verifica la presencia del botón; nunca se le hace clic. */
  async expectCancellationOffered(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Cancelar anticipadamente' })).toBeVisible();
    this.expectNoWritesAttempted();
  }

  async expectCancellationNotOffered(): Promise<void> {
    await expect(this.page.getByTestId('v2-depositos-detail-cerrado')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Cancelar anticipadamente' })).toHaveCount(0);
    this.expectNoWritesAttempted();
  }

  async expectDepositNotFound(): Promise<void> {
    await expect(this.page.getByText('Depósito no encontrado.')).toBeVisible();
    this.expectNoWritesAttempted();
  }

  // ── Formulario de constitución (nunca se envía con datos válidos) ─────────

  /** Abre el formulario de constitución solo para leerlo. */
  async openNewDepositForm(): Promise<void> {
    await this.page.getByTestId('v2-depositos-nuevo').click();
    await expect(this.page.getByTestId('v2-depositos-form')).toBeVisible();
  }

  private field(name: string): Locator {
    return this.page.getByTestId(`v2-depositos-field-${name}`);
  }

  /** Elige el primer titular que tenga cuentas activas en guaraníes y su primera cuenta. */
  async selectHolderWithAccount(): Promise<void> {
    const holders = this.field('usuarioId');
    // Los titulares también cargan de forma asíncrona (al principio solo figura «Cargando...»).
    await expect.poll(() => holders.locator('option').count()).toBeGreaterThan(1);
    const values = await holders.locator('option').evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
    for (const value of values) {
      await holders.selectOption(value);
      // Las cuentas cargan de forma asíncrona: sin cuentas el select queda con una sola opción informativa.
      const accountOptions = this.field('cuentaId').locator('option');
      const hasAccounts = await expect
        .poll(() => accountOptions.count(), { timeout: 4000 })
        .toBeGreaterThan(1)
        .then(() => true, () => false);
      if (hasAccounts) {
        const accounts = await accountOptions.allInnerTexts();
        await this.field('cuentaId').selectOption({ index: 1 });
        const balance = accounts[1].match(/PYG\s([\d.]+,\d{2})\s*$/)?.[1];
        expect(balance, `saldo en la cuenta «${accounts[1]}»`).toBeTruthy();
        this.accountBalance = balance as string;
        return;
      }
    }
    throw new Error('Ningún titular tiene cuentas activas en guaraníes para armar el formulario.');
  }

  /** El campo aplica una máscara: se escribe tecla a tecla en vez de usar fill(). */
  private async typeInto(input: Locator, text: string): Promise<void> {
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.press('Backspace');
    await input.pressSequentially(text);
  }

  async enterAmount(amount: number): Promise<void> {
    await this.typeInto(this.field('monto'), String(amount));
  }

  /** Importe mayor al saldo que muestra la pantalla para la cuenta elegida. */
  async enterAmountAboveDisplayedBalance(): Promise<void> {
    const balance = Number(this.accountBalance.replace(/\./g, '').replace(',', '.'));
    await this.enterAmount(Math.floor(balance) + MINIMUM_AMOUNT);
  }

  async enterAmountBelowMinimum(): Promise<void> {
    await this.enterAmount(MINIMUM_AMOUNT - 1);
  }

  async selectTerm(days: number): Promise<void> {
    await this.field('plazoDias').selectOption({ label: `${days} días` });
  }

  async enterRate(rate: number): Promise<void> {
    await this.typeInto(this.field('tasaAnual'), String(rate));
  }

  async submitForm(): Promise<void> {
    await this.page.getByTestId('v2-depositos-submit').click();
  }

  async expectMinimumAmountError(): Promise<void> {
    await expect(this.page.getByText(MINIMUM_AMOUNT_ERROR)).toBeVisible();
    this.expectNoWritesAttempted();
  }

  async expectInsufficientBalanceError(): Promise<void> {
    await expect(
      this.page.getByText(`Saldo insuficiente: el disponible en la cuenta es PYG ${this.accountBalance}.`),
    ).toBeVisible();
    this.expectNoWritesAttempted();
  }

  async expectDepositNotCreated(): Promise<void> {
    await expect(this.page).toHaveURL(/\/v2\/depositos\/new$/);
    this.expectNoWritesAttempted();
  }

  async expectMinimumAmountAndTermsShown(): Promise<void> {
    await expect(this.field('monto-hint')).toContainText(/Mínimo PYG\s[\d.]+,\d{2}/);
    expect(this.availableTerms.length).toBeGreaterThan(0);
    this.expectNoWritesAttempted();
  }

  // ── Tarifario y plazos ────────────────────────────────────────────────────

  async readAvailableTerms(): Promise<void> {
    this.availableTerms = await this.field('plazoDias').locator('option').allInnerTexts();
  }

  async expectOnlyTerms(days: number[]): Promise<void> {
    expect(this.availableTerms).toEqual(days.map((d) => `${d} días`));
    this.expectNoWritesAttempted();
  }

  /** Lee la tasa que la pantalla sugiere para cada plazo disponible. */
  async readSuggestedRates(): Promise<void> {
    await this.readAvailableTerms();
    for (const label of this.availableTerms) {
      await this.field('plazoDias').selectOption({ label });
      await expect(this.field('tasaAnual')).toHaveValue(/^\d+(\.\d+)?$/);
      this.suggestedRates.set(label, Number(await this.field('tasaAnual').inputValue()));
    }
  }

  async expectSuggestedRate(days: number, rate: number): Promise<void> {
    expect(this.suggestedRates.get(`${days} días`), `tasa sugerida a ${days} días`).toBe(rate);
    this.expectNoWritesAttempted();
  }

  // ── Vista previa del interés ──────────────────────────────────────────────

  async enterProjection(amount: number, days: number, rate: number): Promise<void> {
    await this.selectTerm(days);
    await this.enterRate(rate);
    await this.enterAmount(amount);
  }

  /** Recibe el valor como lo publica el documento (283561.64) y lo compara con el formato de la pantalla. */
  async expectProjectedInterest(interest: string): Promise<void> {
    const [integer, decimals] = interest.split('.');
    const formatted = `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
    await expect(this.page.getByTestId('v2-depositos-preview-interes')).toHaveText(`PYG ${formatted}`);
    this.expectNoWritesAttempted();
  }
}
