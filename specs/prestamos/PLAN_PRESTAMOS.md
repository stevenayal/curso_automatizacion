# PLAN_PRESTAMOS

| Campo | Valor |
| --- | --- |
| Historia | Consulta de préstamos, cuotas, saldo y estado |
| Nivel | A: reglas bancarias críticas revisadas manualmente |
| Arquitectura | Playwright Test + Page Object Model |
| Autenticación disponible | `TEST_ADMIN_EMAIL` (administrador de curso 2) |
| Page Object | `playwright/pages/LoansPage.ts` |
| Tags | `@prestamos`, `@grupo-03` |

## Escenarios

| ID | Escenario | Datos | Estado |
| --- | --- | --- | --- |
| PRE-01 | Consultar préstamo vigente | préstamo 2 | Automatizado sin mutación |
| PRE-02 | Rechazar préstamo de otro cliente | Cliente no administrador + préstamo ajeno | Bloqueado: solo hay sesión administrativa |
| PRE-03 | Consultar préstamo cancelado | Préstamo 6 | Bloqueado: la UI devuelve "Préstamo no encontrado" |
| PRE-04 | Consultar préstamo en mora | Préstamo con cuota vencida | Bloqueado: la UI no muestra estado de mora ni fixture verificable |
| PRE-05 | Rechazar pago por fondos insuficientes | Cuenta sin saldo + cuota pendiente | Bloqueado: el pago muta datos compartidos y no hay fixture aislado |
| PRE-06 | Seleccionar cuotas consecutivas | Préstamo con dos cuotas pendientes | Bloqueado: la UI solo permite pagar la siguiente cuota, sin selección múltiple |

## Contrato de selectores

- `v2-prestamos-cuotas-row-6`: fila de la próxima cuota pendiente del préstamo de fixture 2.
- `v2-prestamos-detail`: contenedor estable de los datos del préstamo.

## Riesgos

- Saldo, estado, vencimientos y montos son reglas de negocio: no son candidatos para autoreparación.
- Los pagos no se ejecutan contra el sandbox compartido sin un seed aislado y limpieza posterior.
- La validación de autorización exige una sesión de cliente, no administrador.

## Fuera de alcance

- Originación, aprobación y eliminación de préstamos.
- Ejecución de pagos que modifiquen datos compartidos.
