
import { expect, type Page } from "@playwright/test";

export class CuentasPage {
  constructor(private readonly page: Page) {}

  // 1. INICIAR SESION
  async ingresarConCorreoAutorizado(): Promise<void> {
    // Mismo usuario de prueba por defecto que usa el Grupo 03 (.env.example).
    const email = process.env.TEST_ADMIN_EMAIL || "admin@aiquaa.com";

    await this.page.goto(
      "https://aiquaa-sandbox-web.vercel.app/auth/login",
      { waitUntil: "domcontentloaded" }
    );

    // Esperar a que React cargue los campos.
    await this.page.locator(
      'input[type="radio"], input[type="email"], input[type="text"]'
    ).first().waitFor({
      state: "visible",
      timeout: 15000
    });

    // Seleccionar el Curso 1 si aparece.
    if (this.page.url().includes("/curso")) {
      const curso1 = this.page.locator(
        'input[type="radio"]'
      ).first();

      await curso1.check();

      await this.page.getByRole("button", {
        name: "Continuar",
        exact: true
      }).click();
    }

    // Esperar el formulario de correo.
    const campoEmail = this.page.locator(
      'input[type="email"], input[type="text"]'
    ).first();

    await campoEmail.waitFor({
      state: "visible",
      timeout: 15000
    });

    await campoEmail.fill(email);

    await this.page.getByRole("button", {
      name: "Ingresar",
      exact: true
    }).click();

    // Verificar acceso al sistema.
    await expect(
      this.page.getByRole("heading", {
        name: /Bienvenido/i
      })
    ).toBeVisible({ timeout: 10000 });

    console.log("Inicio de sesion correcto");
  }

  // 2. ABRIR CUENTAS BANCARIAS
  async abrirAplicacion(): Promise<void> {
    await this.page.goto(
      "https://aiquaa-sandbox-web.vercel.app/cuentas"
    );

    await expect(
      this.page.getByRole("heading", {
        name: "Cuentas",
        exact: true
      })
    ).toBeVisible();

    console.log("Modulo de cuentas abierto");
  }

  // 3. CONSULTAR UNA CUENTA ACTIVA
  async consultarCuentaActiva() {
    const tabla = this.page.locator("table");

    await expect(tabla).toBeVisible();

    const filas = tabla.locator("tbody tr");

    const activas = filas.filter({
      has: this.page.getByRole("cell", {
        name: "Sí",
        exact: true
      })
    });

    await expect(
      activas.first()
    ).toBeVisible();

    console.log("Cuenta activa encontrada");

    return activas.first();
  }

  // 4. VALIDAR SALDO Y MONEDA
  async validarSaldoYMoneda(): Promise<void> {
    const fila = await this.consultarCuentaActiva();

    const celdas = fila.locator("td");

    const moneda = (
      await celdas.nth(4).innerText()
    ).trim();

    const saldo = (
      await celdas.nth(5).innerText()
    ).trim();

    expect(["PYG", "USD"]).toContain(moneda);

    expect(saldo).toMatch(
      /^(PYG|USD)\s+[\d.,]+$/
    );

    expect(saldo).toContain(moneda);

    console.log("Moneda:", moneda);
    console.log("Saldo:", saldo);
    console.log("Validacion correcta");
  }
}
