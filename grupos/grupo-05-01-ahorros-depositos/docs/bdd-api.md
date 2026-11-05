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