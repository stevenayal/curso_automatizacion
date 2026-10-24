# Sandbox API — guía rápida

**Base URL:** `https://aiquaa-sandbox-api.vercel.app`
**Docs interactivas:** <https://aiquaa-sandbox-api.vercel.app/docs>
**OpenAPI (JSON):** `GET /api/v1/docs`

## Autenticación

Todas las llamadas van con el header de API key:

```
x-api-key: <su API key>
```

La key se entrega por el canal del curso y se guarda en el `.env` (`API_KEY`), nunca en el repo.
El CI falla si encuentra una key `sbx_...` commiteada: ver [SEGURIDAD-API-KEY.md](SEGURIDAD-API-KEY.md).

Errores posibles: `UNAUTHORIZED`, `RATE_LIMITED`, `VALIDATION_ERROR`, `EXECUTION_ERROR`,
`NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.

## Endpoints por grupo

| Grupo | Módulo | Endpoints REST |
|---|---|---|
| 01 | Cuentas Bancarias | `GET|POST /api/v1/cuentas` · `GET|PUT|DELETE /api/v1/cuentas/{id}` · `GET|POST /api/v1/movimientos` · `GET|PUT|DELETE /api/v1/movimientos/{id}` |
| 02 | Tarjetas | `GET|POST /api/v1/tarjetas` · `GET|PUT|DELETE /api/v1/tarjetas/{id}` · `PATCH /api/v1/tarjetas/{id}/bloquear` · `PATCH /api/v1/tarjetas/{id}/activar` |
| 03 | Préstamos | *por publicar* |
| 04 | Transferencias y Pagos | `GET|POST /api/v1/transferencias` · `GET|PUT|DELETE /api/v1/transferencias/{id}` · `GET /api/v1/facturas` · `GET /api/v1/facturas/{id}` · `POST /api/v1/facturas/{id}/pagar` |
| 05 | Ahorros y Depósitos | *por publicar* |

Comunes a todos: `POST /api/v1/auth/login`, `POST /api/v1/usuarios`, `GET /api/v1/usuarios/{id}`,
`GET /api/v1/reportes/movimientos`, `GET /api/v1/reportes/resumen`.

Verificar siempre contra `GET /api/v1/docs`: es la fuente de verdad y ahí van a aparecer los
módulos de préstamos y ahorros cuando se publiquen.

## Sandbox SQL

Dos endpoints para consultar y modificar la base desde los tests:

- `POST /api/v1/sql/select`
- `POST /api/v1/sql/update`

Body:

```json
{
  "sql": "SELECT id, saldo FROM cuentas WHERE id = $1",
  "params": [1]
}
```

Reglas del sandbox:

- **Un solo statement** por request (validado por AST).
- Solo tablas del schema aislado del curso.
- **Siempre placeholders parametrizados** (`$1`, `$2`, …). Nunca concatenar valores en el SQL.

Respuesta: `{ "data": [...], "rowCount": n }`.

Este es el mecanismo que usa el patrón pre-request/post-response de
[`TAREA-SQL-REST-DINAMICO.md`](./TAREA-SQL-REST-DINAMICO.md) para confirmar que una operación de
escritura realmente quedó reflejada en la base.
