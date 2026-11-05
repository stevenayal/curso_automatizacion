# Trazabilidad BDD → API — Grupo 05 (Ahorros y Depósitos)

- **Feature:** [`grupos/grupo-05-ahorros-depositos/features/ahorros-depositos.feature`](../grupos/grupo-05-ahorros-depositos/features/ahorros-depositos.feature)
- **Colección Postman (v2.1):** [`postman/grupo-05-ahorros-y-depositos.postman_collection.json`](../postman/grupo-05-ahorros-y-depositos.postman_collection.json) (copia de la que vive en `grupos/grupo-05-ahorros-depositos/postman/`)
- **Environment:** `E_GRUPO_05_AHORROS_DEPOSITOS.postman_environment.json` (`apiKey` vacía, se completa localmente o con `--env-var`)
- **API:** AIQUAA sandbox v2, `{{baseUrl}}` = `https://aiquaa-sandbox-api.vercel.app`, header `x-api-key: {{apiKey}}`.
  Contrato: <https://aiquaa-sandbox-api.vercel.app/docs/v2#tag/grupo-5-ahorros-y-dep%C3%B3sitos>

Todos los requests validan además `tiempo de respuesta < 3000 ms`, y un test a nivel colección avisa con mensaje claro si hay `429` (límite de requests) o `401/403` (apiKey).

> **Estado de verificación:** la colección **no fue ejecutada** contra la API (no había API key disponible). Los scripts pasaron un chequeo de sintaxis, pero ninguna assertion fue probada. No existe evidencia de corrida de esta versión.

## Tabla de trazabilidad

| # | Escenario BDD | Endpoint | Método | Datos de entrada | Resultado esperado | Request de Postman |
|---|---|---|---|---|---|---|
| 1 | Consultar un depósito a plazo vigente (`@happy-path`) | `/api/v2/depositos/{id}` | GET | `id` = `{{depositoVigenteId}}` (el pre-request elige por SQL un depósito `activo`) | `200`; `data` con `monto`, `tasa_anual`, `fecha_vencimiento`; `estado` = `activo`; la BD coincide con la API | Escenario 1 - Consultar deposito a plazo vigente |
| 2 | Depósito en su fecha de vencimiento (`@edge-case`) | `/api/v2/depositos/{id}` | GET | `id` = `{{depositoVencidoId}}` (SQL: depósito `vencido`) | `200`; `estado` = `vencido`; `interes_generado` presente; la BD coincide | Escenario 2 - Deposito en su fecha de vencimiento |
| 3 | Constituir un depósito sin saldo suficiente (`@negativo`) | `/api/v2/depositos` | POST | cuenta activa real (SQL), `monto` = 999999999999, `plazoDias` = 30, `tasaAnual` = 10 | `409`; `error.code` = `CONFLICT`; sin `data`; la BD no cambia (depósitos y saldo) | Escenario 3 - Constituir deposito sin saldo suficiente |
| 4 | Cancelar un depósito antes de su vencimiento (`@happy-path`) | `/api/v2/depositos/{id}/cancelar` | POST | `id` = `{{depositoCancelarId}}` (el pre-request crea un depósito de `{{montoCancelacion}}` en una cuenta real) | `200`; `estado` = `cancelado`; la BD acredita `saldo_antes + monto + interés prorrateado` y registra 1 movimiento `credito` | Escenario 4 - Cancelar deposito a plazo antes de su vencimiento |
| 5 | Plan de ahorro por id (sin escenario en el feature) | `/api/v2/ahorros/{id}` | GET | `id` = `{{ahorroId}}` (SQL: plan `activo`) | `200`, JSON; `data.id` = id pedido; la BD coincide | Escenario 5 - Obtener plan de ahorro por ID |
| 6 | Consulta de un depósito inexistente (`@negativo`) | `/api/v2/depositos/{id}` | GET | `id` = `{{depositoInexistenteId}}` (SQL: máximo + 1000) | `404`; `error.code` = `NOT_FOUND`; sin `data`; la BD confirma 0 filas | Escenario 6 - Consultar deposito a plazo inexistente |
| 7 | Depósito con un plazo no permitido, mínimo (`@negativo`) | `/api/v2/depositos` | POST | `monto` = 1000, `plazoDias` = `{{plazoDiasInvalido}}` (**29**; válido 30–1095) | `400`; `VALIDATION_ERROR`; la BD no cambia | Escenario 7 - Constituir deposito con un plazo no permitido (29 dias, bajo el minimo) |
| 7b | Depósito con un plazo no permitido, máximo (`@negativo`) | `/api/v2/depositos` | POST | `monto` = 1000, `plazoDias` = `{{plazoDiasInvalidoAlto}}` (**1096**) | `400`; `VALIDATION_ERROR`; la BD no cambia | Escenario 7b - Constituir deposito con un plazo no permitido (1096 dias, sobre el maximo) |
| 8 | Depósito por el total del saldo disponible (`@edge-case`) | `/api/v2/depositos` | POST | `monto` = `{{montoSaldoTotal}}` (saldo leído de la BD de `{{cuentaSaldoTotalId}}`) | `201`; `estado` = `activo`; la BD muestra saldo `0` | Escenario 8 - Constituir deposito por el total del saldo disponible |
| 9 | Depósito con importe menor al mínimo (`@negativo`) | `/api/v2/depositos` | POST | `monto` = `{{montoInvalido}}` (**0**), `plazoDias` = 30 | `400`; `VALIDATION_ERROR`; sin `data`; la BD no cambia | Escenario 9 - Deposito con importe menor al minimo permitido |
| 10 | Consultar las tasas disponibles (`@happy-path`) | `/api/v2/depositos` | GET | query `estado=activo` | `200`; arreglo no vacío con `monto`, `plazo_dias`, `tasa_anual`; no excede los activos de la BD | Escenario 10 - Consultar tasas disponibles para depositos a plazo |
| 11 | Consultar los intereses generados (`@happy-path`) | `/api/v2/depositos/{id}` | GET | `id` = `{{depositoVigenteId}}` | `200`; `interes_generado` = BD; `interes_proyectado` = `monto × tasa/100 × plazo/365` | Escenario 11 - Consultar intereses generados |
| 12 | Depósito con el importe mínimo permitido (`@edge-case`) | `/api/v2/depositos` | POST | cuenta real (SQL), `monto` = `{{montoMinimo}}` (1), `plazoDias` = 30, `tasaAnual` = 10 | `201`; `activo`; la BD tiene el depósito con ese monto/plazo, +1 depósito y saldo debitado | Escenario 12 - Constituir deposito con el importe minimo permitido |
| 13 | *(sin escenario en el feature)* Aportar a un plan de ahorro | `/api/v2/ahorros/{id}/aportar` | POST | `id` = `{{ahorroAportarId}}` (plan propio creado por `POST /ahorros`), `monto` = `{{montoAporte}}` | `201`; la BD suma el aporte a `saldo_acumulado` y debita la cuenta | Escenario 13 - Aportar a un plan de ahorro |
| 14 | *(sin escenario en el feature)* Eliminar un plan de ahorro | `/api/v2/ahorros/{id}` | DELETE | `id` = `{{ahorroEliminarId}}` (plan propio) | `204` sin body; **soft-delete**: la fila sigue en la BD con `estado` = `cancelado` y `activo` = `false` | Escenario 14 - Eliminar plan de ahorro (soft-delete) |

**Reglas no documentadas:** la API solo exige `monto > 0`; no hay un monto mínimo documentado. Por eso el escenario 9 usa `monto = 0` y el 12 usa `montoMinimo = 1`. Si el sandbox define un mínimo mayor, ajustar `montoInvalido` y `montoMinimo`.

**Gap del feature:** los requests 13 y 14 cubren endpoints documentados de Ahorros que no tienen escenario BDD en el `.feature`. Conviene agregar esos escenarios o dejarlos marcados como cobertura técnica.

## Validación en base de datos (Tarea 3)

Todas las consultas van por `POST /api/v2/sql/select` (`{"sql", "params"}` → `{"data": [...], "rowCount": n}`, header `x-api-key`), son **SELECT parametrizados y acotados** (`LIMIT 1`, filtro por `id`, o agregados). No se usa `/sql/update`; nada es destructivo. Los helpers están en el pre-request de la colección (`utils.sqlUna`, `utils.cuentaConSaldo`, `utils.snapshotCuenta`, `utils.verificarSinCambios`, `utils.crearPlan`).

| # | Pre-request (datos dinámicos → variable) | Post-request (validación en la BD) |
|---|---|---|
| 1 | depósito `activo` → `depositoVigenteId` | fila de `depositos` = respuesta (`estado`, `monto`, `tasa_anual`, `plazo_dias`) |
| 2 | depósito `vencido` → `depositoVencidoId` | `estado` = `vencido`; `interes_generado` y `monto` = respuesta |
| 3, 9 | cuenta `activa` con saldo → `cuentaId`, `usuarioId`; foto de saldo y `COUNT` de depósitos | `COUNT` y saldo sin cambios |
| 4 | cuenta con saldo; crea un depósito propio; lee `estado` y `saldo` antes | `estado` = `cancelado`; saldo = antes + monto + interés **prorrateado** (días transcurridos, interés simple, ≤ interés del plazo completo); 1 movimiento `credito` |
| 5 | plan `activo` → `ahorroId` | fila de `ahorros` = respuesta (`estado`, `saldo_acumulado`, `meta_monto`) |
| 6 | `MAX(id) + 1000` → `depositoInexistenteId` | `COUNT(*)` del id = 0 |
| 7, 7b | cuenta con saldo; foto de la cuenta | `COUNT` y saldo sin cambios |
| 8 | lee saldo de `cuentaSaldoTotalId` (sin cambios de lógica) | saldo = 0 |
| 10 | — | respuesta no excede el `COUNT` de depósitos `activo` |
| 11 | depósito `activo` | `interes_generado` = BD; proyectado = fórmula (tolerancia 1 centavo) |
| 12 | cuenta con saldo ≥ `montoMinimo`; foto | fila con `monto`/`plazo_dias` enviados; +1 depósito; saldo debitado |
| 13 | cuenta con saldo; crea plan propio; lee `saldo_acumulado` y saldo de la cuenta | `saldo_acumulado` + aporte; saldo de la cuenta − aporte |
| 14 | cuenta con saldo; crea plan propio; lee `estado` | fila existe; `estado` = `cancelado`; `activo` = `false` |

### Columnas: qué está confirmado y qué no

| Origen | Columnas |
|---|---|
| **Confirmadas** por la corrida de `grupo-05-01` (47 assertions, 0 fallos) | `cuentas(id, usuario_id, saldo, estado='activa')`, `depositos(id, estado, monto, plazo_dias, cuenta_id)`, `movimientos(tipo, referencia_tipo, referencia_id)` |
| Tomadas del **contrato OpenAPI**, no confirmadas en la BD | `depositos.tasa_anual`, `depositos.interes_generado` |
| **Sin verificar contra la BD** (cada consulta lo indica en un comentario) | toda la tabla `ahorros`: `estado`, `activo`, `saldo_acumulado`, `meta_monto`. Se consulta con `SELECT *` para que un nombre equivocado falle en el `pm.test` y no en el SQL. |

## Variables

| Variable | Alcance | Valor por defecto | Uso |
|---|---|---|---|
| `baseUrl` | colección / environment | `https://aiquaa-sandbox-api.vercel.app` | URL base |
| `apiKey` | environment (secret) | vacío | credencial; solo local o `--env-var`, nunca en archivos |
| `depositoVigenteId` / `depositoVencidoId` | colección | `1` / `4` | valores de respaldo; los pisa el pre-request SQL |
| `depositoInexistenteId` | colección | `999999` | respaldo; lo pisa el pre-request SQL |
| `usuarioId` / `cuentaId` | colección | `1` / `1` | respaldo; los pisa `cuentaConSaldo` |
| `ahorroId` | colección | `1` | respaldo; lo pisa el pre-request SQL |
| `plazoDiasInvalido` / `plazoDiasInvalidoAlto` | colección | `29` / `1096` | plazos fuera de 30–1095 |
| `montoInvalido` / `montoMinimo` / `montoCancelacion` / `montoAporte` | colección | `0` / `1` / `1000` / `100` | importes de los escenarios 9, 12, 4 y 13–14 |
| `cuentaSaldoTotalId` | colección | vacío | cuenta **descartable** para el escenario 8; completar antes de ejecutar |
| `depositoCancelarId`, `ahorroAportarId`, `ahorroEliminarId`, `usuarioSaldoTotalId`, `montoSaldoTotal`, `depositosAntesPlazoInvalido` | colección | vacío | las completan los pre-request |

## Notas

- **Escrituras en el sandbox:** los escenarios 4, 8, 12, 13 y 14 modifican datos. El 8 deja el saldo de `cuentaSaldoTotalId` inmovilizado; usar una cuenta descartable (o saltearlo).
- **Límite de requests:** v2 admite 200 por minuto por key. La colección hace unas 40 requests entre REST y SQL; con `--delay-request 600` queda holgada.
- **Detalle de los escenarios 1–3 y 6–8:** [`grupos/grupo-05-ahorros-depositos/docs/bdd-api.md`](../grupos/grupo-05-ahorros-depositos/docs/bdd-api.md).

## Cómo ejecutarla (pendiente; no se ejecutó)

Con `API_KEY` exportada en la terminal (no se escribe en ningún archivo), salteando el escenario 8 por falta de cuenta descartable. Newman no tiene opción de exclusión, así que se arma la lista de `--folder` con todos los requests menos el 8:

```bash
FOLDERS=$(node -e 'const c=require("./postman/grupo-05-ahorros-y-depositos.postman_collection.json");console.log(c.item.filter(i=>!i.name.startsWith("Escenario 8 ")).map(i=>"--folder \""+i.name+"\"").join(" "))')

mkdir -p grupos/grupo-05-ahorros-depositos/evidence/tarea-3
eval npx newman run postman/grupo-05-ahorros-y-depositos.postman_collection.json \
  -e postman/E_GRUPO_05_AHORROS_DEPOSITOS.postman_environment.json \
  --env-var "apiKey=$API_KEY" \
  --delay-request 600 \
  $FOLDERS \
  --reporters cli,junit \
  --reporter-junit-export grupos/grupo-05-ahorros-depositos/evidence/tarea-3/newman-junit.xml \
  | tee grupos/grupo-05-ahorros-depositos/evidence/tarea-3/newman-run.txt
```

Para registrar en la evidencia que el escenario 8 se salteó, agregar al inicio de `newman-run.txt` la línea: `Escenario 8 omitido: no hay cuenta descartable para cuentaSaldoTotalId.`

Si algún request responde `429`, el test de colección falla con el mensaje "Limite de requests excedido (429)" y el log indica subir `--delay-request`. Antes de commitear la evidencia, buscar la key con `grep -rF "$API_KEY" evidence grupos postman` (debe dar vacío).

> Que `--folder` acepte nombres de requests de primer nivel no fue probado aquí; si Newman no los toma, correr la colección completa con `cuentaSaldoTotalId` configurada.
