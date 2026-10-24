# Arquitectura Cucumber + BDD + Page Object Model

Variante de la skill para equipos que escriben criterios de aceptación en Gherkin y los
ejecutan con cucumber-js sobre Playwright. Mismo principio: **la IA planifica, genera y
repara; cucumber-js + Playwright ejecutan sin modelo.**

Relación con otras skills:

- `bdd-skill` — reglas de escritura Gherkin, `# criterio:` para trazabilidad, reporter PDF y
  catálogo genérico de steps por `data-testid` (patrón del curso contra el sandbox).
- `playwright-skill` — Page Objects, protocolo anti-falla de locators, `auth.setup.ts`.
- **Esta arquitectura** — steps de negocio + POM, pensada para suites grandes y para que la IA
  trabaje con el menor contexto posible. No mezclar en un mismo repo los steps genéricos por
  testid de `bdd-skill` con steps de negocio: elegir uno.

---

## Capas

```text
features/   F_<DOMINIO>.feature     QUÉ   — negocio, Gherkin, sin UI          ← humano/Planner, BLACKLIST Healer
   │  (texto del step)
steps/      S_<dominio>.steps.ts    GLUE  — 1 step = 1 llamada a PO/API        ← Generator
   │  (this.transfers.transfer(...))
support/    world.ts, hooks.ts      CONTEXTO — page, PO lazy, API, evidencias  ← Generator, fixture técnico
   │
pages/      <Nombre>Page.ts         CÓMO  — locators + acciones + esperas UI   ← Generator, WHITELIST Healer
   │
Playwright  browser / context / APIRequestContext
```

| Capa | Contiene | Nunca contiene |
|---|---|---|
| `features/` | lenguaje de negocio, datos de negocio, `# criterio:`, tags `@<dominio>` `@<ID>` `@smoke` | selectores, URLs, "hago click", testids, tiempos |
| `steps/` | expresión Cucumber + llamada a método de PO/API + `expect` de negocio en `Then` | locators, `page.*`, `waitForTimeout`, lógica condicional de UI |
| `support/world.ts` | `page`, `context`, `request`, getters lazy de POs y helpers API | asserts, flujos |
| `support/hooks.ts` | browser por proceso, context por escenario, `storageState`, trace/screenshot en fallo | lógica de negocio, login por UI |
| `pages/` | locators (role → label → text → testid), acciones de negocio, esperas de estado UI | expected de negocio, datos hardcodeados, llamadas a otros PO por import cruzado |

Un mismo `pages/TransfersPage.ts` sirve a `T_*.spec.ts` (Playwright Test) y a
`S_*.steps.ts` (Cucumber): la capa POM no sabe quién la llama.

---

## Estructura

```text
features/
  transferencias/F_TRANSFERENCIAS.feature
steps/
  S_transferencias.steps.ts
  S_comunes.steps.ts                 ← sesión, navegación genérica de negocio
support/
  world.ts
  hooks.ts
pages/
  TransfersPage.ts
  HomePage.ts
specs/
  transferencias/PLAN_TRANSFERENCIAS.md   ← riesgos, contrato testid, datos (sin tabla de escenarios)
playwright/.auth/user.json           ← storageState (gitignored), generado por auth.setup
cucumber.js                          ← perfiles default / smoke / pr / dryrun
results/
  cucumber-report.json
  CLASIF_BDD_<NOMBRE>.json
  traces/<escenario>.zip
```

Ejemplos: `examples/bdd/` + `examples/pages/TransfersPage.ts`.

---

## Flujo IA por capa

### Planner (`/pw-ia:plan --bdd`)

- Escribe `PLAN_<FEATURE>.md` **sin** tabla de escenarios (metadatos, riesgos, contrato
  testid, fuera de alcance) + `F_<DOMINIO>.feature` con los escenarios.
- Reglas de escritura: seguir `bdd-skill` (keywords en inglés, texto en español, un
  comportamiento por escenario, `Scenario Outline` para variantes de datos, `# criterio:`).
- Cada escenario lleva tag de ID estable (`@TRF-01`) y tag de dominio (`@transferencias`).
- Reutilizar frases de steps ya existentes: antes de escribir, pedir el catálogo (ver abajo).

### Generator (`/pw-ia:generate --bdd`)

Contexto de entrada — solo:

```text
F_<DOMINIO>.feature (escenarios a implementar)
catálogo de steps existente (expresiones, no implementación)
firmas públicas de los Page Objects involucrados (no el cuerpo)
world.ts (getters disponibles)
```

Catálogo compacto sin IA ni browser:

```bash
npx cucumber-js --profile dryrun      # results/cucumber-usage.txt: steps definidos + undefined
```

Orden de trabajo:

1. `dryrun` → lista de steps `undefined`. Solo esos se implementan.
2. ¿El step se puede expresar con un método PO existente? → glue de 1–3 líneas.
3. ¿Falta la acción? → agregar método al PO (siguiendo `playwright-skill`) y getter en
   `world.ts` si el PO es nuevo.
4. `Then` de negocio → `expect` sobre API/valor, documentado como blacklist.
5. Validar:

   ```bash
   npx tsc --noEmit
   npx cucumber-js --profile dryrun     # 0 undefined, 0 ambiguous
   npx cucumber-js --tags @TRF-01
   ```

### Classifier (`/pw-ia:classify`)

`scripts/classify-failures.mjs` detecta el formato cucumber (array raíz) y clasifica por el
primer step no `passed`/`skipped` de cada escenario. Agrega `step` al resultado.

| Estado cucumber | Regla | Resultado |
|---|---|---|
| `undefined` / `pending` | `step-undefined-or-pending` | `TEST_BUG/medium` → `/pw-ia:generate`, no Healer |
| `ambiguous` | `step-ambiguous` | `TEST_BUG/medium` → humano unifica expresiones |
| `failed` | reglas generales sobre `error_message` | igual que Playwright Test |
| step timeout de cucumber | `test-timeout` | `UNKNOWN/medium` |

Limitación: el JSON de cucumber no distingue flaky. El perfil deja `retry: 0` para que un
retry no esconda el fallo al classifier.

### Healer (`/pw-ia:heal`)

Permisos por capa — ver también `healing-guardrails.md`:

| Capa | Healer |
|---|---|
| `features/*.feature` | **nunca** (diff que toque `.feature` → rechazo automático) |
| `steps/` — `Then` con `expect` de valor | **nunca** |
| `steps/` — glue (qué método PO se llama) | solo con `TEST_BUG/high` y sin cambiar la expresión Cucumber |
| `support/hooks.ts`, `support/world.ts` | fixture técnico (storageState, baseURL, timeouts justificados) |
| `pages/` | **sí** — locators, esperas, navegación |

Contexto `[DYNAMIC]` para BDD: texto del step fallido + implementación de ese step + métodos PO
que invoca + error + fragmento a11y. Nunca el `.feature` completo ni otros steps.

---

## Test Impact Analysis y CI

- Mapa ruta→tag igual que en Playwright Test; se pasa por `CUCUMBER_TAGS` al perfil `pr`:

  ```bash
  CUCUMBER_TAGS="@smoke or @transferencias or @ledger" npx cucumber-js --profile pr
  node scripts/classify-failures.mjs --input results/cucumber-report.json --out results/CLASIF_BDD_PORTAL.json
  ```

  Ojo: cucumber usa expresiones `or`/`and`/`not`, no la regex `@a|@b` de `playwright --grep`.
- Pipeline: mismo esqueleto que `examples/Y_EXAMPLE_playwright_ai.yml`, reemplazando el step de
  tests (ver comentario "Variante BDD" en ese archivo). Reporter PDF → `bdd-skill`
  (`reporter/bdd_report.py` lee el mismo `cucumber-report.json`).

---

## Anti-patrones

| Anti-patrón | Por qué es caro | Correcto |
|---|---|---|
| `When hago click en "transfer-submit"` en una suite POM | el `.feature` se acopla a la UI; cada cambio de UI "rompe negocio" y el Healer no puede tocarlo | `When transfiero 500000 de "CA_GS" a "CC_GS"` |
| `page.getByRole(...)` dentro de un step | locators dispersos; el Healer necesita leer N steps | locator en `pages/`, step llama al método |
| Un step por escenario (`When hago la transferencia del escenario 3`) | catálogo que no se reutiliza, más tokens en cada generación | expresión parametrizada `{int}` / `{string}` |
| Login por UI en `Background` | minutos por escenario, más superficie de fallo | `storageState` en `hooks.ts`, `Background` solo verifica seed |
| Datos creados por UI en `Given` | lento y flaky | `Given` → `this.api.*` |
| PO que hace `expect` de montos | mezcla CÓMO con QUÉ; el Healer podría "arreglar" un monto | `expect` de negocio en `Then` |
| Mandar todos los `.feature` y steps al Generator | contexto innecesario | feature objetivo + catálogo `dryrun` + firmas PO |
