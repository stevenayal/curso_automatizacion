# Grupo 05 — Ahorros y Depósitos

**Módulo:** Ahorros, depósitos, tasas, plazos y vencimientos
**Rama / carpeta:** `grupo-05-ahorros-depositos`

> Los endpoints REST de ahorros y depósitos están publicados en la API v2 del sandbox (curso 2):
> ver `GET /api/v2/docs` y [`docs/requerimientos/grupo-05-ahorros-depositos.pdf`](../../docs/requerimientos/grupo-05-ahorros-depositos.pdf).

## Integrantes

Máximo 3. Completar con nombre y email (ver [`docs/ROSTER.md`](../../docs/ROSTER.md)):

| # | Nombre y apellido | Email |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |

## Alcance

Completar antes de escribir el primer escenario:

- **Objetivo:** validar la consulta, constitución y cancelación anticipada de depósitos a plazo
  (RF-G5-07 a RF-G5-10) por pantalla y por API: tasas y plazos del tarifario, interés proyectado
  (`monto × tasa / 100 × plazo / 365`), saldo debitado y acreditado, y estados `activo`/`vencido`/`cancelado`.
- **Supuestos:** la API key del curso 2 está disponible como `API_KEY`. El admin (`admin@aiquaa.com`)
  opera eligiendo al titular. El seed tiene al menos un depósito `vencido` y el depósito 1 (5.000.000 al
  11,5 % por 180 días).
- **Riesgos:** el sandbox es compartido. Por eso todo escenario que constituye o cancela usa un cliente
  propio (fixture) y los de solo lectura corren con la guarda de red de `DepositosPage`. También hay
  diferencias entre pantalla y API: el monto mínimo de 1.000.000 lo exige la UI, no la API.
- **Cobertura incluida:** detalle, listado y filtro por estado, tarifario y plazos, vista previa del
  interés, validaciones de monto mínimo y de saldo, constitución (mínimo y por el total del saldo),
  cancelación anticipada, límites de plazo (30 a 1095 días), 404/405/409 de la API.
- **Cobertura excluida:** planes de ahorro (RF-G5-01 a 06) y vencimiento automático de depósitos (lo
  fija el servidor por fecha y no se puede provocar en una prueba).

## API y datos

| Capa | Recursos |
|---|---|
| REST (curso 2) | `GET|POST /api/v2/depositos`, `GET /api/v2/depositos/{id}`, `POST /api/v2/depositos/{id}/cancelar`; para el fixture: `POST /api/v2/usuarios`, `POST /api/v2/cuentas`, `POST /api/v2/cuentas/{id}/movimientos` |
| SQL sandbox | `POST /api/v2/sql/select` sobre `depositos` y `cuentas` (colección Postman del grupo) |
| DB directa | usuario `qa_g05` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

## Fixture aislado

[`fixtures/DepositosFixture.ts`](fixtures/DepositosFixture.ts) crea por escenario o test un cliente
propio con una cuenta de ahorro en PYG fondeada con el monto que el caso necesita. `limpiar()` cancela
los depósitos activos (devuelve el capital), vacía y da de baja la cuenta y da de baja al cliente,
aunque el escenario falle.

| Tag | Qué hace |
|---|---|
| `@web` | Pantalla de solo lectura: `DepositosPage` aborta cualquier escritura hacia la API |
| `@web @fixture` | Pantalla con escrituras habilitadas (`signInAsAdmin(email, { allowWrites: true })`), solo sobre el cliente del fixture |
| `@api @fixture` | API v2 directa; las lecturas del seed (depósito 1, un vencido) no lo modifican |

## Cómo ejecutar

```bash
npx cucumber-js --tags "@grupo-05 and not @wip"
```

```bash
npx playwright test --grep @grupo-05
```

La colección Postman del grupo (`postman/`) constituye, cancela y da de baja sobre cuentas y planes
compartidos del seed. Por eso no corre en CI: hasta pasarla al fixture, ejecutarla solo a mano.

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance (sección de arriba completa)
- [x] BDD — `features/ahorros-depositos.feature` (happy path, negativo y edge case)
- [x] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico; escenarios `@api` en CI
- [x] UI — `tests/e2e/ahorros-depositos.spec.ts` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-05-ahorros-depositos` hacia `main` usando la plantilla del repo
