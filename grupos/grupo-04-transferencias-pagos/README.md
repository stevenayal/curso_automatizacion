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
| REST | `GET|POST /api/v1/transferencias`, `GET|PUT|DELETE /api/v1/transferencias/{id}`, `GET /api/v1/facturas?usuarioId=&estado=`, `GET /api/v1/facturas/{id}`, `POST /api/v1/facturas/{id}/pagar` |
| SQL sandbox | `POST /api/v1/sql/select`, `POST /api/v1/sql/update` sobre `transferencias`, `facturas` y `pagos` |
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
- Los flujos que mueven saldo (transferir, pagar, alta de beneficiario) siguen en `@wip` hasta
  tener un fixture aislado (cuentas activa/bloqueada/cerrada, factura pendiente, beneficiario y
  límite diario).

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance (sección de arriba completa)
- [x] BDD — `features/transferencias-pagos.feature` (happy path, negativo y edge case)
- [ ] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/transferencias-pagos.spec.ts` con Playwright (smoke no destructivo listo; faltan flujos con fixture)
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-04-transferencias-pagos` hacia `main` usando la plantilla del repo
