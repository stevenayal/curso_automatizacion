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
| 4 | RODI ENCINA, FRANCISCO RAFAEL | 5182434 |

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
| REST | `GET|POST /api/v1/transferencias`, `GET|PUT|DELETE /api/v1/transferencias/{id}`, `GET /api/v1/facturas?usuarioId=&estado=`, `GET /api/v1/facturas/{id}`, `POST /api/v1/facturas/{id}/pagar` |
| SQL sandbox | `POST /api/v1/sql/select`, `POST /api/v1/sql/update` sobre `transferencias`, `facturas` y `pagos` |
| DB directa | usuario `qa_g04` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

`POST /api/v1/transferencias` y `POST /api/v1/facturas/{id}/pagar` ya están resueltos como
ejemplo completo del patrón pre/post en la carpeta `E2E - Flujos con validación SQL` de
[`postman/aiquaa Sandbox API.json`](../../postman/aiquaa%20Sandbox%20API.json): estúdienlo y
agreguen casos propios en vez de copiarlo tal cual.

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance (sección de arriba completa)
- [x] BDD — `features/transferencias-pagos.feature` (happy path, negativo y edge case)
- [ ] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/transferencias-pagos.spec.ts` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-04-transferencias-pagos` hacia `main` usando la plantilla del repo
