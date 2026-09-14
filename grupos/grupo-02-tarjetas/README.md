# Grupo 02 — Tarjetas de Crédito/Débito

**Módulo:** Tarjetas, límites, disponible, estado y vencimiento
**Rama / carpeta:** `grupo-02-tarjetas`

## Integrantes

Máximo 3. Completar con nombre y email (ver [`docs/ROSTER.md`](../../docs/ROSTER.md)):

| # | Nombre y apellido | Email |
|---|---|---|
| 1 | Beatríz López  | mbyjarl@fpuna.edu.py  |
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
| REST | `GET /api/v1/tarjetas?usuarioId=`, `POST /api/v1/tarjetas`, `GET|PUT|DELETE /api/v1/tarjetas/{id}`, `PATCH /api/v1/tarjetas/{id}/bloquear`, `PATCH /api/v1/tarjetas/{id}/activar` |
| SQL sandbox | `POST /api/v1/sql/select`, `POST /api/v1/sql/update` sobre `tarjetas` |
| DB directa | usuario `qa_g02` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

Detalle de campos y estados: `GET /api/v1/docs` y [`docs/API-SANDBOX.md`](../../docs/API-SANDBOX.md).

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance (sección de arriba completa)
- [ ] BDD — `features/tarjetas.feature` (happy path, negativo y edge case)
- [ ] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/tarjetas.spec.ts` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-02-tarjetas` hacia `main` usando la plantilla del repo
