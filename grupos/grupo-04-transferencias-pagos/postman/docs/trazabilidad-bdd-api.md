# Trazabilidad BDD → API (Grupo 4: Transferencias)

Colección: [`rafaelrodi_transferencias.postman_collection.json`](../rafaelrodi_transferencias.postman_collection.json)
API: `POST https://aiquaa-sandbox-api.vercel.app/api/v2/transferencias` (curso 2, schema `qa_training_v2`).
Código fuente de referencia: `aiquaa-sandbox-api/app/api/v2/transferencias/route.ts`.

## Matriz de trazabilidad

| # | Escenario BDD | Tag | Request de la colección | Datos de entrada | Resultado esperado (API) | Validación en BD |
|---|---|---|---|---|---|---|
| 1 | Transferencia entre cuentas propias | @happy-path | BDD 1 | 2 cuentas **activas del mismo usuario y moneda**, origen con saldo (la de mayor saldo); monto = mín(25.000, saldo origen) | **201**, `data.estado = "completada"`, saldos origen −monto / destino +monto | Existe 1 fila en `transferencias` con ese `concepto` y `estado='completada'` |
| 2 | Misma cuenta origen y destino | @negativo | BDD 2 | origen = cuenta propia del escenario 1 → destino = la misma cuenta; monto = mín(25.000, saldo origen) | **400** `VALIDATION_ERROR` "no puede ser la misma…" | 0 filas en `transferencias`; saldo origen sin cambios |
| 3 | Destino bloqueada | @edge-case | BDD 3 | origen propio → destino con `estado = 'bloqueada'`; monto = mín(25.000, saldo origen) | **409** `CONFLICT` "…está bloqueada…" | 0 filas; saldo origen sin cambios |
| 4 | Destino cerrada | @edge-case | BDD 4 | origen propio → destino con `estado = 'cerrada'`; monto = mín(25.000, saldo origen) | **409** `CONFLICT` "…está cerrada…" | 0 filas; saldo origen sin cambios |
| 5 | Saldo insuficiente | @negativo | BDD 5 | origen = cuenta activa de **menor saldo** → otro destino activo; monto = saldo origen + 1 | **409** `CONFLICT` "Saldo insuficiente…" | 0 filas; saldo origen sin cambios |
| 6 | Destino inexistente | @negativo | BDD 6 | origen propio → destino `MAX(id) + 1000` (no existe); monto = mín(25.000, saldo origen) | **404** `NOT_FOUND` "Cuenta destino no encontrada." | 0 filas; saldo origen sin cambios |

Regla en el código que sustenta cada caso: 2 → `cuentaDestinoId === cuentaOrigenId`; 5 → `origen.saldo < monto`;
3 y 4 → `destino.estado !== "activa"`; 6 → destino no encontrado en `cuentas`.

## Datos de prueba (descubiertos dinámicamente)

Ya **no hay ids de cuenta fijos**. El *Pre-request* de la colección hace **una sola consulta** (`SELECT * FROM cuentas`)
a `/api/v2/sql/select` y elige las cuentas en JavaScript según el estado actual de la BD:

| Variable | Criterio de selección | Escenario |
|---|---|---|
| `cuentaPropiaOrigenId` / `cuentaPropiaDestinoId` | Dos cuentas `activa` del mismo `usuario_id` y `moneda`; origen = la de mayor saldo (≥ 1) | 1, 2, 3, 4, 6 |
| `cuentaBloqueadaId` | Primera cuenta con `estado = 'bloqueada'` | 3 |
| `cuentaCerradaId` | Primera cuenta con `estado = 'cerrada'` | 4 |
| `cuentaSaldoBajoId` / `cuentaDestinoOtroId` | Cuenta `activa` de menor saldo (distinta del origen propio) + otra cuenta `activa` como destino | 5 |
| `cuentaInexistenteId` | `MAX(id) + 1000` | 6 |

- El resultado se cachea 60 s (`descubiertoEn`): una corrida completa dura ~7 s, así que las consultas no se repiten por item y
  no se consume el rate limit. Si la caché venció (p. ej. se corre un solo request más tarde), se vuelve a descubrir.
- Si la BD no permite armar algún escenario (por ejemplo no queda ninguna cuenta bloqueada), la colección falla **con un mensaje
  que dice qué falta**, en vez de dar un rojo confuso.
- Ejemplo real de la última corrida: el happy path eligió origen `11` → destino `3` (usuario 2, PYG), no las cuentas 1 → 16 del
  diseño anterior. Con el seed original, los candidatos son: bloqueada `8`, cerrada `10`.

## Diseño de las validaciones

- **Variables**: `baseUrl`, `apiKey` y los ids de cuenta (que los completa el descubrimiento, ver arriba). Cada request fija `cuentaOrigenId`, `cuentaDestinoId`, `monto` y un
  `concepto` único (`BDD-<escenario>-<timestamp>`) en su *Pre-request*.
- **Pre-request**: lee el saldo real de las cuentas (`saldoPrevio_<id>`) vía `/api/v2/sql/select` y **calcula el monto**: `mín(25.000, saldo)` en los escenarios donde el origen debe alcanzar, y `saldo + 1` en saldo insuficiente. Así los escenarios no dependen del saldo actual (el origen se valida antes que el destino, por eso también los casos 2-4 y 6 necesitan saldo suficiente).
- **Tests** (estilo del ejercicio): `pm.test` de tiempo de respuesta < 3000 ms, status, código/mensaje de error y cuerpo.
- **Contra la BD**: `pm.sendRequest` verifica que en los casos negativos la transferencia **no** se registró (buscando por `concepto`)
  y que el saldo origen **no** se descontó; en el happy path, que sí existe y está `completada`.

## Ejecución

```bash
newman run automatizacion/rafaelrodi_transferencias.postman_collection.json --delay-request 300
```

O importar el JSON en Postman y correr la colección. Última corrida (monto y cuentas dinámicos): 6 escenarios, 24 requests, 30 aserciones, 0 fallos.

## Observaciones

- El escenario 1 **modifica datos reales** del sandbox (mueve hasta 25.000 de la cuenta origen elegida a su cuenta hermana en cada corrida).
- Los rechazos por regla de negocio devuelven **409** (no 400) salvo la misma cuenta (400) y el destino inexistente (404).
- El sandbox limita a **30 req/min por API key**. Una corrida completa usa ~24 requests (1 de descubrimiento + los 6 escenarios + las consultas SQL del pre-request y de los tests), así que **no correr la colección dos veces seguidas**: la segunda recibe `429 Too Many Requests` y fallan casi todas las aserciones. Esperar ~1 minuto entre corridas; `--delay-request 300` reparte las requests dentro de una misma corrida.
