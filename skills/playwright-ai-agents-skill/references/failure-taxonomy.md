# Taxonomía de fallos — Failure Classifier

Fuente de verdad de las reglas que implementa `scripts/classify-failures.mjs` (array `RULES`).
Aplica igual al reporter JSON de Playwright Test y al formatter JSON de cucumber-js.
Toda regla nueva se agrega **primero en el script**, después se documenta acá con la misma
posición y el mismo `id`.

## Principio

Reglas determinísticas sobre `error.message` del reporter JSON de Playwright. El LLM no
clasifica en primera pasada. Si un humano o el agente quiere reinterpretar un `UNKNOWN`, puede
hacerlo — pero esa reinterpretación **nunca habilita el Healer automático**; solo sirve para
decidir a quién derivar.

## Categorías

| Categoría | Significado | Acción |
|---|---|---|
| `PRODUCT_BUG` | El producto devolvió algo distinto a lo esperado por la regla de negocio | Bug tracker. Healer prohibido |
| `TEST_BUG` | La automatización quedó desalineada con la UI (locator, texto, sync) | `high` → Healer permitido · `medium` → humano confirma primero |
| `ENVIRONMENT` | Browser/runner/infra no disponible o degradado | Retry / infra. Healer prohibido |
| `DATA` | Datos de prueba ausentes, duplicados o en conflicto | Revisar API setup / seed. Healer prohibido |
| `NETWORK` | Conectividad entre runner y app/API | Retry / infra. Healer prohibido |
| `UNKNOWN` | Ninguna regla coincide | Análisis humano |

`healerAllowed = category === 'TEST_BUG' && confidence === 'high'`

## Reglas (orden = prioridad, la primera que coincide gana)

| # | `id` | Categoría | Confianza | Coincide con (resumen del regex) |
|---|---|---|---|---|
| 1 | `step-undefined-or-pending` | TEST_BUG | medium | mensaje sintetizado `Undefined step:` / `Pending step:` (solo cucumber) |
| 2 | `step-ambiguous` | TEST_BUG | medium | `Ambiguous step:` sintetizado, `Multiple step definitions match` (solo cucumber) |
| 3 | `network-error` | NETWORK | high | `net::ERR_`, `ECONNREFUSED`, `ECONNRESET`, `ENOTFOUND`, `EAI_AGAIN`, `socket hang up` |
| 4 | `browser-or-runner-setup` | ENVIRONMENT | high | `Executable doesn't exist`, `browserType.launch`, `Error reading storage state`, `ENOENT …/.auth`, `Missing required env var` |
| 5 | `navigation-timeout` | ENVIRONMENT | medium | `page.goto: Timeout Nms exceeded` |
| 6 | `http-gateway-error` | ENVIRONMENT | medium | `Expected: 1xx–4xx` + `Received: 502/503/504` |
| 7 | `http-5xx` | PRODUCT_BUG | medium | `Expected: 1xx–4xx` + `Received: 5xx`, `Internal Server Error` |
| 8 | `data-conflict` | DATA | medium | `Expected: 2xx` + `Received: 409`, `duplicate key`, `already exists`, `unique constraint`, `insufficient test data`, `seed data missing` |
| 9 | `locator-not-found` | TEST_BUG | **high** | `strict mode violation`, `locator.<acción>: Timeout Nms exceeded`, `element(s) not found`, `element is not attached to the DOM` |
| 10 | `element-state-sync` | TEST_BUG | medium | `Expected: visible/enabled/editable/checked` + `Received: hidden/disabled/readonly/unchecked`, `outside of the viewport` |
| 11 | `ui-text-changed` | TEST_BUG | medium | `.toHaveText(`, `.toContainText(`, `.toHaveValue(`, `.toHaveTitle(`, `.toHaveURL(` |
| 12 | `business-value-mismatch` | PRODUCT_BUG | medium | `expect(received).toBe/toEqual/toStrictEqual/toBeCloseTo/toBeGreaterThan/toBeLessThan(` |
| 13 | `test-timeout` | UNKNOWN | medium | `Test timeout of Nms exceeded`, cucumber `function timed out, ensure the promise resolves within N milliseconds` |
| — | (fallback) | UNKNOWN | low | nada coincidió |

## Decisiones de diseño no obvias

- **`waiting for getBy…` no es señal.** Aparece en el call log de toda aserción sobre locator,
  incluido `toHaveText` con el elemento presente. Usarlo mandaba cambios de contenido a
  `TEST_BUG/high` → Healer. Se usa `element(s) not found` y `locator.<acción>: Timeout`.
- **`ui-text-changed` es `medium`, no `high`.** "Cambio de texto" es caso típico de healing,
  pero el texto puede ser un mensaje de negocio ("Saldo insuficiente" → "Operación
  rechazada" puede significar otra regla). Humano confirma antes.
- **`business-value-mismatch` es `PRODUCT_BUG`.** Una aserción de valor puro (`toBe(1000000)`)
  que falla con elemento/respuesta presentes es, por defecto, el producto calculando distinto.
  Aunque fuera error del test, cae en la blacklist del Healer — el ajuste lo hace un humano.
- **HTTP 5xx antes que aserción de valor.** `expect(status).toBe(201)` con `Received: 500`
  coincide con ambas; se prioriza la lectura HTTP.
- **Gateway (502/503/504) es `ENVIRONMENT`.** Suele ser despliegue/infra, no lógica.
- **Flaky no se clasifica.** `test.status === 'flaky'` (falló y pasó en retry) va a `flaky[]`,
  nunca al Healer: el fix de sincronización lo decide un humano mirando el trace del retry.
- **Se clasifica el último intento** (`results[results.length-1]`), que es el que determina el
  resultado final con `retries` activos.
- **Exit code 0** con input válido: el gate de CI es `PublishTestResults@2
  failTaskOnFailedTests`, no el classifier.

## Formatos de entrada

| Formato | Detección | Unidad clasificada | Mensaje usado |
|---|---|---|---|
| Playwright Test JSON reporter | objeto con `suites` | test × project, último intento | `results[-1].error.message` |
| cucumber-js JSON formatter | array raíz | escenario (se ignoran `background`) | primer step con estado distinto de `passed`/`skipped` |

Cucumber: `undefined`, `ambiguous` y `pending` no traen mensaje útil, así que el script
antepone `Undefined step: <keyword><texto>` (o `Ambiguous step:` / `Pending step:`) y las reglas
1–2 siguen siendo regex sobre texto. Cada fallo lleva además `step` con el texto del step y
`project: "cucumber"`. El JSON de cucumber no distingue flaky → `flaky: []` siempre.

- **Undefined/ambiguous son `medium`, no `high`.** Un step sin definición no es un locator roto:
  se resuelve con `/pw-ia:generate --bdd` (implementar el glue) o unificando expresiones, no con
  el Healer — que podría inventar un `Then` con un expected propio.

## Formato de salida `CLASIF_<NOMBRE>.json`

```json
{
  "source": "playwright-results.json",
  "summary": {
    "total": 10, "failed": 8, "flaky": 1,
    "byCategory": { "PRODUCT_BUG": 2, "TEST_BUG": 2, "ENVIRONMENT": 1, "DATA": 1, "NETWORK": 1, "UNKNOWN": 1 },
    "healerCandidates": 1,
    "maxHealAttempts": 2
  },
  "failures": [
    { "file": "…", "title": "…", "project": "chromium",
      "category": "TEST_BUG", "confidence": "high", "matchedRule": "locator-not-found",
      "healerAllowed": true, "error": "Error: locator.click: Timeout 15000ms exceeded." }
  ],
  "flaky": [ { "file": "…", "title": "…", "project": "chromium", "retries": 1 } ]
}
```

Ejemplos completos: `examples/CLASIF_EJEMPLO.json` (desde
`examples/playwright-results.sample.json`) y `examples/bdd/CLASIF_BDD_EJEMPLO.json` (desde
`examples/bdd/cucumber-report.sample.json`).
