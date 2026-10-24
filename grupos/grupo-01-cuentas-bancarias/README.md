# Grupo 01 — Cuentas Bancarias

**Módulo:** Cuentas, saldos, estados y movimientos
**Rama / carpeta:** `grupo-01-cuentas-bancarias`

## Integrantes

Máximo 3. Completar con nombre y email (ver [`docs/ROSTER.md`](../../docs/ROSTER.md)):

| # | Nombre y apellido | Email |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |

## Alcance

Completar antes de escribir el primer escenario:

- **Objetivo:**
- **Supuestos:**
- **Riesgos:**
- **Cobertura incluida:**
- **Cobertura excluida:**

## API y datos

| Capa | Recursos |
|---|---|
| REST | `GET /api/v1/cuentas?usuarioId=`, `POST /api/v1/cuentas`, `GET|PUT|DELETE /api/v1/cuentas/{id}`, `GET|POST /api/v1/movimientos`, `GET /api/v1/movimientos/{id}` |
| SQL sandbox | `POST /api/v1/sql/select`, `POST /api/v1/sql/update` sobre `cuentas` y `movimientos` |
| DB directa | usuario `qa_g01` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

Detalle de campos y estados: `GET /api/v1/docs` y [`docs/API-SANDBOX.md`](../../docs/API-SANDBOX.md).

## Entregables

### Trazabilidad BDD → API - Postman

Se realizaron pruebas sobre la API AIQUA Sandbox para los escenarios correspondientes al Grupo 1 - Cuentas Bancarias.

| Escenario BDD | Método | Endpoint | Resultado esperado |
|---|---|---|---|
| Listar cuentas activas | GET | `/api/v2/cuentas?estado={{estado_cuenta}}` | HTTP 200 y listado de cuentas con el estado solicitado |
| Abrir una cuenta | POST | `/api/v2/cuentas` | HTTP 201 y creación correcta de la cuenta |
| Obtener cuenta por ID | GET | `/api/v2/cuentas/{{cuenta_id}}` | HTTP 200 y datos de la cuenta solicitada |





Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance (sección de arriba completa)
- [ ] BDD — `features/cuentas-bancarias.feature` (happy path, negativo y edge case)
- [ ] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/cuentas-bancarias.spec.ts` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-01-cuentas-bancarias` hacia `main` usando la plantilla del repo
