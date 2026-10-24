# Grupo 1 - Cuentas Bancarias

## Fuente
Documento de requerimientos del Grupo 1 - Cuentas Bancarias.

## Alcance
Cubre el ciclo de vida de una cuenta bancaria: apertura, consulta, modificación, cambio de estado, baja lógica, consulta de saldo, consulta de movimientos y registro de depósitos/retiros.

## Endpoints y RF
- RF-G1-01: GET /api/v2/cuentas
- RF-G1-02: POST /api/v2/cuentas
- RF-G1-03: GET /api/v2/cuentas/{id}
- RF-G1-04: PUT /api/v2/cuentas/{id}
- RF-G1-05: DELETE /api/v2/cuentas/{id}
- RF-G1-06: PATCH /api/v2/cuentas/{id}/estado
- RF-G1-07: GET /api/v2/cuentas/{id}/saldo
- RF-G1-08: GET /api/v2/cuentas/{id}/movimientos
- RF-G1-09: POST /api/v2/cuentas/{id}/movimientos
- RF-G1-TK: POST /api/v2/g1/auth/token

## Reglas clave
- Una cuenta nueva nace con saldo 0, estado activa y activa=true.
- tipoCuenta: ahorro o corriente.
- moneda: PYG o USD.
- No se puede dar de baja una cuenta con saldo.
- cerrada es un estado terminal.
- Una cuenta bloqueada o cerrada no admite movimientos.
- Un débito no puede superar el saldo disponible.
- El saldo solo cambia mediante movimientos.
- Cada movimiento registra saldo_posterior.
- Los movimientos manuales usan referencia_tipo=manual.

## Reglas de UI
- La UI es más restrictiva que la API en apertura, edición y cierre.
- La UI exige aceptación de contrato.
- La UI limita la descripción de movimiento a 60 caracteres.
- La UI bloquea cerrar/eliminar mientras haya saldo.

## Brechas conocidas
- Existe un dato sembrado de una cuenta cerrada con saldo.
- La API permite cambiar moneda con saldo.
- La API no valida productos asociados antes de la baja.
- No existe control de titularidad por credencial.
- Los movimientos no se pueden editar ni anular.
- El extracto está limitado a 100 movimientos sin paginación.
