import { expect, type Page } from "@playwright/test";

export class CuentasPage {
  constructor(private readonly page: Page) {}

  // 1. INICIAR SESION
  async ingresarConCorreoAutorizado(): Promise<void> {
    const email =
      process.env.TEST_ADMIN_EMAIL || "admin@aiquaa.com";

    await this.page.goto(
      "https://aiquaa-sandbox-web.vercel.app/auth/login",
      { waitUntil: "domcontentloaded" }
    );

    await this.page
      .locator(
        'input[type="radio"], input[type="email"], input[type="text"]'
      )
      .first()
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    if (this.page.url().includes("/curso")) {
      const curso1 = this.page
        .locator('input[type="radio"]')
        .first();

      await curso1.check();

      await this.page
        .getByRole("button", {
          name: "Continuar",
          exact: true,
        })
        .click();
    }

    const campoEmail = this.page
      .locator(
        'input[type="email"], input[type="text"]'
      )
      .first();

    await campoEmail.waitFor({
      state: "visible",
      timeout: 15000,
    });

    await campoEmail.fill(email);

    await this.page
      .getByRole("button", {
        name: "Ingresar",
        exact: true,
      })
      .click();

    await expect(
      this.page.getByRole("heading", {
        name: /Bienvenido/i,
      })
    ).toBeVisible({
      timeout: 10000,
    });

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
        exact: true,
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
        exact: true,
      }),
    });

    await expect(
      activas.first()
    ).toBeVisible();

    console.log("Cuenta activa encontrada");

    return activas.first();
  }

  // 4. VALIDAR SALDO Y MONEDA
  async validarSaldoYMoneda(): Promise<void> {
    const fila =
      await this.consultarCuentaActiva();

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

  // 5. CONFIGURACION API
  private readonly apiUrl =
    process.env.API_URL ||
    "https://aiquaa-sandbox-api.vercel.app";

  private readonly apiKey =
    process.env.API_KEY || "";

  ultimoStatus = 0;
  ultimaRespuesta: any = null;
  cuentaIdActual = 0;

  // 6. EJECUTAR REQUEST
  private async ejecutarRequest(
    metodo:
      | "GET"
      | "POST"
      | "PUT"
      | "PATCH"
      | "DELETE",
    ruta: string,
    data?: any
  ): Promise<void> {
    const response =
      await this.page.context().request.fetch(
        `${this.apiUrl}${ruta}`,
        {
          method: metodo,
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type":
              "application/json",
          },
          data,
        }
      );

    this.ultimoStatus =
      response.status();

    try {
      this.ultimaRespuesta =
        await response.json();
    } catch {
      this.ultimaRespuesta = null;
    }

    console.log(
      metodo,
      ruta,
      "HTTP:",
      this.ultimoStatus,
      this.ultimaRespuesta
    );
  }

  // 7. LISTAR CUENTAS
  async listarCuentas(): Promise<void> {
    await this.ejecutarRequest(
      "GET",
      "/api/v2/cuentas"
    );

    if (
      this.ultimoStatus === 200 &&
      Array.isArray(
        this.ultimaRespuesta?.data
      ) &&
      this.ultimaRespuesta.data.length > 0
    ) {
      this.cuentaIdActual =
        this.ultimaRespuesta.data[0].id;
    }
  }

  // 8. LISTAR CUENTAS POR ESTADO
  async listarCuentasPorEstado(
    estado: string
  ): Promise<void> {
    await this.ejecutarRequest(
      "GET",
      `/api/v2/cuentas?estado=${encodeURIComponent(
        estado
      )}`
    );
  }

  // 9. CONSULTAR CUENTA POR ID
  async consultarCuenta(
    id: number
  ): Promise<void> {
    this.cuentaIdActual = id;

    await this.ejecutarRequest(
      "GET",
      `/api/v2/cuentas/${id}`
    );
  }

  // 10. ABRIR CUENTA
  async abrirCuenta(
    usuarioId: number,
    tipoCuenta: string,
    moneda: string
  ): Promise<void> {
    await this.ejecutarRequest(
      "POST",
      "/api/v2/cuentas",
      {
        usuarioId,
        tipoCuenta,
        moneda,
      }
    );

    if (
      this.ultimoStatus === 201 &&
      this.ultimaRespuesta?.data?.id
    ) {
      this.cuentaIdActual =
        this.ultimaRespuesta.data.id;
    }
  }

  // 11. MODIFICAR CUENTA
  async modificarCuenta(
    id: number,
    tipoCuenta: string,
    moneda?: string
  ): Promise<void> {
    const body: any = {
      tipoCuenta,
    };

    if (moneda !== undefined) {
      body.moneda = moneda;
    }

    await this.ejecutarRequest(
      "PUT",
      `/api/v2/cuentas/${id}`,
      body
    );
  }

  // 12. ELIMINAR CUENTA
  async eliminarCuenta(
    id: number
  ): Promise<void> {
    await this.ejecutarRequest(
      "DELETE",
      `/api/v2/cuentas/${id}`
    );
  }

  // 13. CAMBIAR ESTADO
  async cambiarEstado(
    id: number,
    estado: string
  ): Promise<void> {
    await this.ejecutarRequest(
      "PATCH",
      `/api/v2/cuentas/${id}/estado`,
      {
        estado,
      }
    );
  }

  // 14. CONSULTAR SALDO
  async consultarSaldo(
    id: number
  ): Promise<void> {
    await this.ejecutarRequest(
      "GET",
      `/api/v2/cuentas/${id}/saldo`
    );
  }

  // 15. CONSULTAR MOVIMIENTOS
  async consultarMovimientos(
    id: number
  ): Promise<void> {
    await this.ejecutarRequest(
      "GET",
      `/api/v2/cuentas/${id}/movimientos`
    );
  }

  // 16. REGISTRAR MOVIMIENTO
  async registrarMovimiento(
    id: number,
    tipo: string,
    monto: number | string
  ): Promise<void> {
    await this.ejecutarRequest(
      "POST",
      `/api/v2/cuentas/${id}/movimientos`,
      {
        tipo,
        monto,
        descripcion:
          "Prueba automatizada Grupo 1",
      }
    );
  }

  // 17. VALIDAR CODIGO HTTP
  validarStatus(
    esperado: number
  ): void {
    expect(
      this.ultimoStatus
    ).toBe(esperado);
  }

  // 18. VALIDAR CODIGO DE ERROR
  validarError(
    errorEsperado: string
  ): void {
    expect(
      this.ultimaRespuesta?.error?.code
    ).toBe(errorEsperado);
  }
}
