# PLAN_TRANSFERENCIAS

> Salida del Planner (`/pw-ia:plan`). Intención funcional — sin código.
> Generado por skill playwright-ai-agents · aiquaa.com

| Campo | Valor |
|---|---|
| Historia | HU-231 — Transferencia entre cuentas propias |
| App / BASE_URL | Home Banking QA — `process.env.BASE_URL` |
| Nivel de generación | **B** — IA + revisión humana (movimiento monetario no core) |
| Seed | `seed-retail-user` |
| Auth | `storageState` → `playwright/.auth/user.json` |
| Page Object / DSL | `pages/TransfersPage.ts` → `transfer({ origin, destination, amount })` |
| Tags | `@transferencias`, `@ledger`, `@smoke` |
| Tier de modelo sugerido | Generator: económico · Healer: económico → escalar si ambiguo |

## Contrato `data-testid` requerido

| Elemento | `data-testid` | Motivo |
|---|---|---|
| Combo cuenta origen | `transfer-account-origin` | label duplicado en modal de beneficiarios |
| Combo cuenta destino | `transfer-account-target` | ídem |
| Mensaje de éxito | `transfer-success` | texto cambia por campaña de marketing |

Monto, botón Transferir y Confirmar → locator semántico (`getByLabel` / `getByRole`), sin testid.

## Riesgos

- R1 — descuento doble del saldo si el usuario confirma dos veces (crítico, monetario).
- R2 — límite diario por segmento de cliente (regla de negocio — expected **no** healeable).
- R3 — cuenta bloqueada permite iniciar el flujo y falla recién al confirmar.

## Escenarios

| ID | Escenario | Precondiciones | Datos | Expected | Tipo | Tags |
|---|---|---|---|---|---|---|
| TRF-01 | Transferencia exitosa | Saldo origen ≥ monto (API setup) | CA_GS → CC_GS, 500.000 | Mensaje de éxito visible | E2E UI | `@smoke` |
| TRF-02 | Saldo se descuenta exacto | TRF-01 precondición | ídem | `saldo_despues = saldo_antes − monto` (API) | UI + API verif. | `@ledger` |
| TRF-03 | Saldo insuficiente | Saldo origen < monto | 1 Gs más que el saldo | Error "Saldo insuficiente", saldo sin cambios | E2E UI | — |
| TRF-04 | Cuenta bloqueada | Cuenta origen bloqueada (API setup) | CA_BLOQ | Error antes de confirmar | E2E UI | — |
| TRF-05 | Doble confirmación (R1) | Saldo suficiente | 500.000 | Un solo movimiento en historial | E2E UI + API | `@ledger` |

## Fuera de alcance

Transferencias a terceros, SIPAP, segundo factor (plan separado `PLAN_TRANSFERENCIAS_TERCEROS.md`).

## Salidas esperadas del Generator

```text
tests/transferencias/
  T_TRANSFERENCIA_EXITOSA.spec.ts   ← TRF-01, TRF-02
  T_SALDO_INSUFICIENTE.spec.ts      ← TRF-03
  T_CUENTA_BLOQUEADA.spec.ts        ← TRF-04
  T_DOBLE_CONFIRMACION.spec.ts      ← TRF-05
```
