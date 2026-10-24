# Model routing y escalamiento por confianza

Agnóstico de proveedor. Los tiers se mapean a modelos concretos en la configuración del
proyecto (`AI_DEFAULT_TIER` + tabla interna), nunca hardcodeados en specs ni prompts.

## Tiers

| Tier | Usar para | No usar para |
|---|---|---|
| **Económico** (default) | generar tests desde `PLAN_*.md` claro · crear locators · refactor · convertir pruebas · clasificar `UNKNOWN` para derivar · fixtures · datos | exploración de UI desconocida |
| **Intermedio** | healing con confianza `medium` en tier económico · planes con 3+ pantallas · conversión de suites legacy | tareas que el económico ya resolvió con `high` |
| **Avanzado** (mayor reasoning) | exploración desconocida · healing ambiguo · flujos multi-page · problemas que mezclan frontend, backend y reglas funcionales | cualquier cosa por defecto |

## Router por tarea

```text
/pw-ia:plan      → económico  (avanzado si no hay historia escrita y hay que explorar)
/pw-ia:generate  → económico
/pw-ia:classify  → sin modelo (scripts/classify-failures.mjs)
/pw-ia:heal      → económico → escalamiento
/pw-ia:impact    → sin modelo (git diff + mapa de tags)
```

## Escalamiento

```text
Económico
  ↓ ¿CONFIANZA = high y pasa chequeo mecánico?
  Sí → proponer
  No
  ↓
Intermedio
  ↓ ¿resuelto?
  Sí → proponer
  No
  ↓
Avanzado
  ↓ ¿resuelto?
  Sí → proponer
  No → HUMAN_REVIEW_REQUIRED
```

Cada salto consume un intento de `AI_MAX_HEAL_ATTEMPTS`. Con el default `2`, el camino real es
económico → intermedio → humano. Para llegar a avanzado hay que subir el presupuesto a `3`
explícitamente (decisión registrada en `HEAL_*.md`).

## Contexto mínimo suficiente

| Tarea | Recibe | No recibe |
|---|---|---|
| Plan | historia, reglas de negocio, lista de pantallas/roles | código |
| Generate | `PLAN_*.md`, Page Object relevante, fixture, tipos, helpers usados, reglas de código | `src/*`, otros tests, docs, lockfiles |
| Heal | test que falla (solo ese `test()`), locators del PO usados, error (20 líneas), fragmento a11y | trace completo, video, DOM completo, archivo spec entero |

## Prompt caching

Estructura fija: bloque `[STATIC]` (rol, convenciones, whitelist/blacklist, formato) primero y
byte-idéntico entre llamadas; `[DYNAMIC]` al final. Ver `examples/HEALER_PROMPT.md`.
Cualquier timestamp, id de corrida o dato variable dentro de `[STATIC]` rompe el cache.

## Batch

Generación de cientos de escenarios sin urgencia (nightly): usar la API batch del proveedor si
ofrece descuento para cargas asíncronas. Flujo: `PLAN_*.md` pendientes → batch generate →
`tsc --noEmit` + `playwright test --list` → PRs para revisión humana.
