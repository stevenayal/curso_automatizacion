# Grupo 05 — Ahorros y Depósitos

**Módulo:** Ahorros, depósitos, tasas, plazos y vencimientos
**Rama / carpeta:** `grupo-05-ahorros-depositos`

> **Nota:** los endpoints REST de ahorros/depósitos **todavía no están publicados** en la sandbox
> API. Arranquen por BDD + validación SQL (sandbox `/api/v1/sql/*` y acceso directo a la DB) y
> sumen la capa REST en cuanto salgan. Verificar disponibilidad con `GET /api/v1/docs`.

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
| REST | *por publicar* — revisar `GET /api/v1/docs` |
| SQL sandbox | `POST /api/v1/sql/select`, `POST /api/v1/sql/update` sobre `ahorros` y `depositos` (nombres a confirmar contra la DB) |
| DB directa | usuario `qa_g05` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

Mientras tanto, las cuentas de tipo `ahorro` de `GET /api/v1/cuentas` y sus `movimientos` sirven
para practicar el flujo de depósito/retiro sobre datos que ya existen.

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance (sección de arriba completa)
- [ ] BDD — `features/ahorros-depositos.feature` (happy path, negativo y edge case)
- [ ] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/ahorros-depositos.spec.ts` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-05-ahorros-depositos` hacia `main` usando la plantilla del repo
