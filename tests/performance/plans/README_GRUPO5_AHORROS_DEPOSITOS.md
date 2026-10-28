# Plan JMeter — Grupo 05 (Ahorros y Depósitos)

Carga baja sobre `GET` y `POST /api/v2/depositos` de la API AIQUAA v2
(`https://aiquaa-sandbox-api.vercel.app`). Endpoints y resultados esperados según la
[documentación v2 del Grupo 5](https://aiquaa-sandbox-api.vercel.app/docs/v2#tag/grupo-5-ahorros-y-dep%C3%B3sitos).

> **Estado:** el plan **no fue ejecutado** (no había API key) ni abierto en JMeter. Solo se comprobó que el XML esté bien formado.

## Archivos

| Archivo | Contenido |
|---|---|
| `P_GRUPO5_AHORROS_DEPOSITOS.jmx` | Plan: 1 Thread Group, Constant Timer, 2 samplers con Header Manager y assertions |
| `D_GRUPO5_DEPOSITOS_GET.csv` | `usuarioId,estado` → `GET /api/v2/depositos?usuarioId=…&estado=…` |
| `D_GRUPO5_DEPOSITOS_POST.csv` | `usuarioId,cuentaId,monto,plazoDias,tasaAnual` → cuerpo del `POST` |

Cada CSV se lee con su propio CSV Data Set Config (recicla filas y las comparte entre hilos). La primera línea se
ignora y lleva el aviso **EJEMPLO**: los valores son de ejemplo, tomados del seed documentado, y hay que
**reemplazarlos por datos reales de `POST /api/v2/sql/select`** (cuentas activas con saldo y su titular).

## Qué mide

| Request | Assertions |
|---|---|
| `GET - Listar Depositos` | código `200`; tiempo de respuesta ≤ `max_ms` |
| `POST - Constituir Deposito` | código `201`; tiempo de respuesta ≤ `max_ms` |

## Propiedades (`-J`)

| Propiedad | Por defecto | Uso |
|---|---|---|
| `api_key` | vacía | header `x-api-key`. **Obligatoria**; sin ella todo responde 401 |
| `baseUrl` | `aiquaa-sandbox-api.vercel.app` | dominio de la API (sin protocolo) |
| `threads` | `3` | hilos |
| `ramp_time` | `5` | ramp-up en segundos |
| `loops` | `10` | iteraciones por hilo (cada una hace un GET y un POST) |
| `timer_ms` | `1500` | Constant Timer entre requests |
| `max_ms` | `3000` | tiempo máximo de respuesta |
| `csv_file_get` / `csv_file_post` | `tests/performance/plans/D_GRUPO5_DEPOSITOS_*.csv` | rutas de los CSV, relativas a la raíz del repo |

Con los valores por defecto son 60 requests (30 GET + 30 POST), unas 110 por minuto: por debajo del límite de 200/min de v2.

## Ejecución

Desde la **raíz del repo**, con `API_KEY` exportada en la terminal:

```bash
jmeter -n -t tests/performance/plans/P_GRUPO5_AHORROS_DEPOSITOS.jmx -Japi_key=$API_KEY -l resultados.jtl
```

- La key solo se pasa por propiedad: no está en el `.jmx`, en los CSV ni en este README. `-J` la deja visible en la lista
  de procesos mientras corre; no la copies a archivos ni a la evidencia.
- `resultados.jtl` no incluye headers de request, pero no lo subas al repo sin revisarlo.

## Advertencias

- **El POST escribe en el sandbox:** con los valores por defecto crea hasta 30 depósitos y debita las cuentas. Los montos son chicos a propósito; la cuenta 3 usa importes mínimos porque su saldo de ejemplo es bajo.
- Si una cuenta no tiene saldo o no pertenece al usuario, el POST responde `409` o `400` y la assertion de `201` falla.
- Los pares usuario/cuenta de ejemplo (1→1, 2→2, 3→3) salen de `D_GRUPO1_CUENTAS.csv`; no están verificados contra la BD.
