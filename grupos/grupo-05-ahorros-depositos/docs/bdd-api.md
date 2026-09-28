# Trazabilidad inicial BDD → API

## Grupo 05 - Ahorros y Depósitos

Esta documentación relaciona tres escenarios BDD del grupo con los endpoints de AIQUAA utilizados en Postman.

**URL base:**

```text
https://aiquaa-sandbox-api.vercel.app
```

**Autenticación:**

```text
x-api-key: {{apiKey}}
```

## Escenarios seleccionados

| ID | Escenario | Método | Endpoint | Resultado esperado |
|---|---|---|---|---|
| 1 | Consultar depósito vigente | GET | `/api/v2/depositos/{{depositoVigenteId}}` | Devuelve monto, tasa, vencimiento y estado activo. |
| 2 | Consultar depósito vencido | GET | `/api/v2/depositos/{{depositoVencidoId}}` | Devuelve estado vencido e intereses generados. |
| 3 | Depósito sin saldo suficiente | POST | `/api/v2/depositos` | La operación es rechazada con HTTP `409`. |

## Escenario 1 - Consultar depósito vigente

**BDD:**

```gherkin
Dado que el cliente tiene un depósito a plazo vigente
Cuando consulta el detalle de ese depósito
Entonces el sistema devuelve el capital, la tasa y la fecha de vencimiento
```

**API:**

```http
GET /api/v2/depositos/{{depositoVigenteId}}
```

**Validaciones:**

- Status `200`.
- Estado `activo`.
- Existen `monto`, `tasa_anual` y `fecha_vencimiento`.
- Tiempo de respuesta menor a 3000 ms.

---

## Escenario 2 - Consultar depósito vencido

**BDD:**

```gherkin
Dado que el cliente tiene un depósito que vence hoy
Cuando consulta el estado de ese depósito
Entonces el sistema lo muestra como vencido y con los intereses acreditados
```

**API:**

```http
GET /api/v2/depositos/{{depositoVencidoId}}
```

**Validaciones:**

- Status `200`.
- Estado `vencido`.
- Existe `interes_generado`.
- Tiempo de respuesta menor a 3000 ms.

---

## Escenario 3 - Constituir depósito sin saldo suficiente

**BDD:**

```gherkin
Dado que el cliente tiene una cuenta de ahorro activa
Y el saldo disponible es menor al importe del depósito
Cuando intenta constituir un depósito a plazo
Entonces el sistema rechaza la operación
Y el depósito no es generado
```

**API:**

```http
POST /api/v2/depositos
```

**Body utilizado:**

```json
{
    "usuarioId": {{usuarioId}},
    "cuentaId": {{cuentaId}},
    "monto": 999999999999,
    "plazoDias": 30,
    "tasaAnual": 10
}
```

Se utiliza un monto alto para superar el saldo disponible de la cuenta.

**Validaciones:**

- Status `409`.
- Tiempo de respuesta menor a 3000 ms.

## Variables utilizadas

| Variable | Uso |
|---|---|
| `baseUrl` | URL base de AIQUAA |
| `apiKey` | Credencial de acceso |
| `depositoVigenteId` | ID de un depósito activo |
| `depositoVencidoId` | ID de un depósito vencido |
| `usuarioId` | ID del cliente |
| `cuentaId` | ID de la cuenta |

Esta trazabilidad relaciona cada escenario BDD con su request y las validaciones realizadas en Postman.

---

# Ampliación — Escenarios 6 a 8 (jesescobar)

Nuevos escenarios del `.feature` mapeados a AIQUAA, agregados como requests 6, 7 y 8 de la colección. Los códigos esperados salen de la documentación oficial: <https://aiquaa-sandbox-api.vercel.app/docs/v2#tag/grupo-5-ahorros-y-dep%C3%B3sitos>.

| ID | Escenario | Tag | Método | Endpoint | Resultado esperado |
|---|---|---|---|---|---|
| 6 | Consulta de un depósito a plazo inexistente | `@negativo` | GET | `/api/v2/depositos/{{depositoInexistenteId}}` | HTTP `404` con `error.code` = `NOT_FOUND`. |
| 7 | Constituir un depósito con un plazo no permitido | `@negativo` | POST | `/api/v2/depositos` | HTTP `400` con `error.code` = `VALIDATION_ERROR`; la BD no registra un depósito nuevo. |
| 8 | Constituir un depósito por el total del saldo disponible | `@edge-case` | POST | `/api/v2/depositos` | HTTP `201`, depósito `activo` por el monto total; la BD muestra la cuenta con saldo `0`. |

Los escenarios 7 y 8 aplican el patrón de [`TAREA-SQL-REST-DINAMICO.md`](../../../docs/TAREA-SQL-REST-DINAMICO.md): leen la BD antes y después del POST con `POST /api/v2/sql/select`. La consulta SQL se declara dentro de cada request para no modificar el Pre-request Script compartido de la colección.

## Escenario 6 - Consultar depósito inexistente

**BDD:**

```gherkin
Dado que el cliente está autenticado
Cuando consulta un depósito a plazo que no existe
Entonces el sistema responde que el depósito no fue encontrado
```

**API:**

```http
GET /api/v2/depositos/{{depositoInexistenteId}}
```

**Validaciones:**

- Status `404`.
- `error.code` es `NOT_FOUND`.
- La respuesta no trae `data`.
- Tiempo de respuesta menor a 3000 ms.

---

## Escenario 7 - Constituir depósito con un plazo no permitido

**BDD:**

```gherkin
Dado que el cliente tiene una cuenta de ahorro activa con saldo suficiente
Cuando intenta constituir un depósito a plazo por un plazo no ofrecido por el banco
Entonces el sistema rechaza la operación
Y el depósito no es generado
```

**API:**

```http
POST /api/v2/depositos
```

**Body utilizado:**

```json
{
  "usuarioId": {{usuarioId}},
  "cuentaId": {{cuentaId}},
  "monto": 1000,
  "plazoDias": {{plazoDiasInvalido}},
  "tasaAnual": 10
}
```

Se usa `plazoDias` = 15 porque la API solo admite plazos de 30 a 1095 días.

**Validación en BD:**

- Pre-request: `SELECT COUNT(*) AS total FROM depositos WHERE cuenta_id = $1`.
- Post-response: la misma consulta devuelve el mismo total.

**Validaciones:**

- Status `400`.
- `error.code` es `VALIDATION_ERROR`.
- La cantidad de depósitos de la cuenta no cambia.
- Tiempo de respuesta menor a 3000 ms.

---

## Escenario 8 - Constituir depósito por el total del saldo disponible

**BDD:**

```gherkin
Dado que el cliente tiene una cuenta de ahorro activa
Y el saldo disponible es igual al importe del depósito
Cuando constituye el depósito a plazo
Entonces el sistema registra el depósito correctamente
Y el saldo disponible de la cuenta queda en cero
```

**API:**

```http
POST /api/v2/depositos
```

**Body utilizado:**

```json
{
  "usuarioId": {{usuarioSaldoTotalId}},
  "cuentaId": {{cuentaSaldoTotalId}},
  "monto": {{montoSaldoTotal}},
  "plazoDias": 30,
  "tasaAnual": 10
}
```

**Validación en BD:**

- Pre-request: `SELECT id, usuario_id, saldo FROM cuentas WHERE id = $1` y guarda el saldo como `montoSaldoTotal`.
- Post-response: `SELECT saldo FROM cuentas WHERE id = $1` devuelve `0`.

**Validaciones:**

- Status `201`.
- `data.monto` es igual al saldo leído antes del POST.
- `data.estado` es `activo`.
- La cuenta queda con saldo `0`.
- Tiempo de respuesta menor a 3000 ms.

> **Atención:** este request deja la cuenta en saldo cero y el dinero queda inmovilizado hasta el vencimiento. Usar solo una cuenta de prueba descartable en `cuentaSaldoTotalId`, distinta de `cuentaId`.

## Variables nuevas

| Variable | Uso |
|---|---|
| `depositoInexistenteId` | ID que no existe en la BD (por defecto `999999`) |
| `plazoDiasInvalido` | Plazo fuera del rango permitido de 30 a 1095 días (por defecto `15`) |
| `cuentaSaldoTotalId` | Cuenta de prueba descartable para el escenario 8 (configurar antes de ejecutar) |
| `usuarioSaldoTotalId` | Titular de esa cuenta; se completa automáticamente en el Pre-request |
| `montoSaldoTotal` | Saldo leído de la BD; se completa automáticamente en el Pre-request |
| `depositosAntesPlazoInvalido` | Cantidad de depósitos antes del POST del escenario 7; se completa automáticamente |
