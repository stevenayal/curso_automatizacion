# Grupo 04 — Transferencias y Pagos

**Módulo:** Transferencias, beneficiarios, importes y estados
**Rama / carpeta:** `grupo-04-transferencias-pagos`

## Integrantes

Máximo 3. Completar con nombre y email (ver [`docs/ROSTER.md`](../../docs/ROSTER.md)):

| # | Nombre y apellido | Email |
|---|---|---|
| 1 | BERNAL OJEDA, JAVIER NICOLAS | 5558015 |
| 2 | MONGELOS PORTILLO, LETICIA BETHARRAM | bethmongelos7@gmail.com |
| 3 | MORINIGO ORTEGA, KATHERINE JAZMIN | 3853604 |
| 4 | RODI ENCINA, FRANCISCO RAFAEL | rafaelorodi@gmail.com |

## Alcance

Completar antes de escribir el primer escenario:

- **Objetivo:** Validar el correcto funcionamiento funcional y operacional de las transferencias (entre cuentas propias y a terceros) y del pago de facturas
- **Supuestos:**
- **Riesgos:**
- **Cobertura incluida:**
- **Cobertura excluida:**

## API y datos

| Capa | Recursos |
|---|---|
| REST (curso 2) | `GET|POST /api/v2/transferencias`, `GET /api/v2/transferencias/{id}`, `GET|POST /api/v2/beneficiarios`, `DELETE /api/v2/beneficiarios/{id}`; para el fixture: `POST /api/v2/usuarios`, `POST /api/v2/cuentas`, `POST /api/v2/cuentas/{id}/movimientos`, `PATCH /api/v2/cuentas/{id}/estado` |
| SQL sandbox | `POST /api/v2/sql/select` sobre `cuentas` y `transferencias` (validaciones pre/post de la colección) |
| Facturas | Solo existen en `/api/v1` (curso 1). Los escenarios de pago siguen `@wip` hasta que la API v2 las exponga. |
| DB directa | usuario `qa_g04` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

`POST /api/v1/transferencias` y `POST /api/v1/facturas/{id}/pagar` ya están resueltos como
ejemplo completo del patrón pre/post en la carpeta `E2E - Flujos con validación SQL` de
[`postman/aiquaa Sandbox API.json`](../../postman/aiquaa%20Sandbox%20API.json): estúdienlo y
agreguen casos propios en vez de copiarlo tal cual.

## UI (Playwright)

Page Objects en [`playwright/pages/`](playwright/pages) (`SandboxLoginPage`, `TransferenciasPage`,
`BeneficiariosPage`), con selectores `data-testid` de la convención `v2-transferencias-*` /
`v2-beneficiarios-*` del sandbox.

[`tests/e2e/transferencias-pagos.spec.ts`](tests/e2e/transferencias-pagos.spec.ts) es un **smoke no
destructivo** (`@smoke @grupo-04`): valida las reglas del wizard (el destino excluye el origen y
respeta la moneda, monto cero, monto mayor al saldo o tope) y las validaciones del alta de
beneficiarios **sin confirmar transferencias ni crear registros**.

```bash
npx playwright test --grep @grupo-04
```

- El admin (`admin@aiquaa.com`) no tiene cuentas propias: en cada formulario hay que **elegir
  primero el cliente**. El cliente de lectura por defecto es `TEST_G04_USUARIO_ID=1`.
- Los flujos que mueven saldo (`Flujos con fixture aislado`, `@fixture`) transfieren entre cuentas
  propias y a un beneficiario, verifican que una bloqueada no se ofrezca como origen y dan de alta un
  beneficiario. Corren sobre el cliente del fixture y entran en el smoke del CI.

## Fixture aislado

[`fixtures/TransferenciasFixture.ts`](fixtures/TransferenciasFixture.ts) crea, **por escenario o
test**, un cliente propio en la API v2 y, sobre él, lo que el caso necesita: cuentas activas con
saldo, bloqueadas o cerradas, un ID inexistente y beneficiarios. `limpiar()` vacía saldos y da de
baja cuentas, beneficiarios y cliente, aunque el escenario falle. Ningún escenario usa ni modifica
datos del seed compartido. Requiere `API_KEY` del curso 2 en `.env` (local) o en el entorno
`api_key` (CI).

| Necesidad | Cómo la arma el fixture |
|---|---|
| Cuenta activa con saldo | `crearCuenta({ saldo })`: abre la cuenta y acredita el saldo como movimiento |
| Cuenta bloqueada / cerrada | `crearCuenta({ estado })`: aplica el estado después del fondeo |
| Cuenta inexistente | `CUENTA_INEXISTENTE_ID` (999999999) |
| Beneficiario existente | `crearBeneficiario({ numeroCuenta })` |
| Límite diario a terceros | Lo aplica la UI (Gs. 50.000.000 en PYG); el fixture fondea 60.000.000 para que el rechazo solo pueda venir del tope |

La colección Postman usa el mismo esquema: `00 - Fixture` crea el cliente con sus 6 cuentas y
`99 - Limpieza` lo borra.

## Cómo ejecutar

```bash
npm run test:api:grupo-04 -- --env-var "apiKey=$API_KEY"
```

```bash
npx cucumber-js --tags "@grupo-04 and not @wip"
```

```bash
npx playwright test --grep @grupo-04
```

## Resultados (semana 7)

Corrida de CI del PR #61 ([QA checks](https://github.com/stevenayal/curso_automatizacion/actions/runs/40668579486),
[Newman G04](https://github.com/stevenayal/curso_automatizacion/actions/runs/40668580500)):

| Suite | Resultado |
|---|---|
| Newman | 8 requests de la colección (51 HTTP con pre/post), 34/34 aserciones |
| Cucumber G04 | 11/11 escenarios (los 2 de factura, `@wip`) |
| Playwright G04 | 9/9 tests (5 smoke de solo lectura + 4 con fixture) |

Evidencia en [`evidence/semana-07/`](evidence/semana-07): JUnit de Newman e informe PDF. El JSON de
Newman no se versiona porque incluye los headers de las requests, entre ellos la API key.

### Incidencias

- La API v2 no tiene facturas: *Pago exitoso* y *Pago con saldo insuficiente* siguen `@wip`.
- El límite diario a terceros lo valida la UI, no la API: un `POST /api/v2/transferencias` por encima
  del tope se acepta si hay saldo.
- La colección tenía una API key commiteada; ahora llega por `--env-var apiKey=...` o por el
  environment.

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance (sección de arriba completa)
- [x] BDD — `features/transferencias-pagos.feature` (happy path, negativo y edge case)
- [x] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [x] UI — `tests/e2e/transferencias-pagos.spec.ts` con Playwright
- [x] Evidencias en `evidence/`
- [x] CI/CD verde
- [x] PR de `grupo-04-transferencias-pagos` hacia `main` usando la plantilla del repo (#61)
