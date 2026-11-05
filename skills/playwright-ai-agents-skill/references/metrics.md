# Métricas de agentes IA sobre Playwright

Los presupuestos de `.env.ai.example` son valores iniciales. Se ajustan con estas métricas,
medidas sobre el framework real — nunca con porcentajes teóricos.

## Tablero

| Métrica | Objetivo | Fuente |
|---|---:|---|
| tokens / test generado | ↓ | log del agente (in/out/cached) por `/pw-ia:generate` |
| costo / test generado aceptado | ↓ | tokens × tarifa ÷ tests mergeados |
| tokens / healing | ↓ | tabla de `HEAL_*.md` |
| healing success rate | ↑ | `HEAL_*.md` con FIX_PROPUESTO mergeado ÷ total `HEAL_*.md` |
| false healing | ≈ 0 | fixes mergeados que luego se revierten o esconden un PRODUCT_BUG |
| flaky rate | ↓ | `summary.flaky ÷ summary.total` en `CLASIF_*.json` |
| modificaciones humanas / test generado | ↓ | líneas cambiadas en review del PR |
| llamadas IA / test | ↓ | log del agente |
| ejecuciones sin IA | > 95% | corridas CI ÷ (corridas CI + sesiones IA) |
| tests con locators robustos | > 90% | grep: specs sin `locator('css…')` / `xpath=` / `nth-child` |
| % código generado rechazado | ↓ | PRs cerrados sin merge |
| % healing aceptado | ↑ | ídem para PRs de healing |
| mean tokens per failure analysis | ↓ | log del agente |

## Métrica económica principal

```text
AI cost / bug útil detectado
```

Complementos: `AI cost / test mantenido`, `AI cost / test generado aceptado`.

## Instrumentación mínima

Por cada llamada al modelo registrar una línea JSON (ej. `results/ai-usage.jsonl`, gitignored):

```json
{"ts":"2026-09-12T10:00:00Z","task":"heal","test":"TRF-01","tier":"economico","attempt":1,
 "input_tokens":3100,"output_tokens":420,"cached_tokens":2600,"verdict":"FIX_PROPUESTO"}
```

Con eso más `CLASIF_*.json` y el historial de PRs se calculan todas las filas del tablero.

## Distribución de referencia

```text
70% Playwright Test determinístico
15% Playwright CLI + Skills
10% AI Planner / Generator
 5% MCP / Healer
```

No es regla matemática. Si "ejecuciones sin IA" cae bajo 95%, algo del flujo está usando IA
en ejecución — revisar antes de subir presupuesto.
