---
name: playwright-ai-agents
description: >
  Gobierno de agentes de IA sobre Playwright con estrategia de bajo consumo: Planner
  (requisito → PLAN_*.md), Generator (plan → .spec.ts vía playwright-skill), Failure
  Classifier determinístico (PRODUCT_BUG/TEST_BUG/ENVIRONMENT/DATA/NETWORK/UNKNOWN) y Healer
  bajo demanda con presupuesto, whitelist/blacklist y revisión humana obligatoria. IA para
  crear, mantener y diagnosticar — nunca para ejecutar. Incluye model routing por tier,
  prompt caching, Test Impact Analysis y métricas de costo. Soporta dos arquitecturas:
  Playwright Test + POM y Cucumber (BDD) + Playwright + POM.
  Usar cuando el usuario mencione "healer", "self-healing", "planner", "generator",
  "agentes de IA playwright", "playwright test agents", "playwright mcp", "clasificar fallos",
  "test roto por IA", "reparar tests con IA", "consumo de tokens en automatización",
  "presupuesto IA", "cucumber con page object", "bdd pom", "steps de negocio",
  o pida generar/reparar pruebas Playwright o Cucumber+Playwright con un agente.
  Auto-activa para cualquier flujo de IA sobre Playwright: plan, generación, clasificación,
  healing, impact analysis o métricas.
---

IA crea, mantiene, diagnostica. Playwright ejecuta. Test aprobado nunca necesita IA para pasar. Terse output. No fluff.

---

## ¿Qué es esta skill?

Capa de **gobierno IA** encima de `playwright-skill`. Esa skill genera specs, Page Objects,
config, CI y PDF. Esta decide **cuándo** interviene un modelo, **con cuánto contexto**, **con
qué tier**, **cuántas veces** y **qué tiene prohibido tocar**.

Arquitectura:

```text
Requisito → Planner → PLAN_*.md → Generator → T_*.spec.ts → tsc/--list → Playwright Test (CI, 0 IA)
                                                                              │
                                                    PASS → fin      FAIL → classify-failures.mjs (0 IA)
                                                                              │
                                        PRODUCT_BUG/ENV/DATA/NETWORK/UNKNOWN → humano / bug tracker / infra
                                        TEST_BUG + high → Healer (≤ AI_MAX_HEAL_ATTEMPTS) → HEAL_*.md → PR humano
```

No reemplaza a `playwright-skill` — delega en ella toda generación de código.

Dos arquitecturas soportadas, mismo gobierno IA:

| Arquitectura | Runner | Intención | Glue | Reporte al classifier |
|---|---|---|---|---|
| **Playwright Test + POM** (default) | `npx playwright test` | `PLAN_*.md` | `T_*.spec.ts` → `pages/` | `results/playwright-results.json` |
| **Cucumber + BDD + POM** | `npx cucumber-js` | `PLAN_*.md` + `F_*.feature` | `S_*.steps.ts` → `support/world.ts` → `pages/` | `results/cucumber-report.json` |

Detalle de capas, permisos del Healer por capa y anti-patrones BDD:
`references/bdd-pom-architecture.md`. Ejemplos: `examples/bdd/`.
Documento base completo: `references/estrategia-ia.md`.

---

## Regla fundamental

1. **Nunca IA en ejecución normal.** Nada de `click → preguntar al modelo → fill → preguntar`.
   El modelo genera el código una vez; CI lo corre sin modelo.
2. **Determinístico primero.** Clasificación de fallos e impact analysis son scripts, no LLM.
3. **Contexto mínimo suficiente.** Nunca el repo entero, el DOM entero ni el trace entero.
4. **Presupuesto explícito.** Al agotarlo → `HUMAN_REVIEW_REQUIRED`. Sin loops ilimitados.
5. **Reglas funcionales son humanas.** El Healer no toca expected de negocio. Nunca.

---

## Context Intake — SIEMPRE ejecutar primero

### Paso 1 — Detectar qué ya dio el usuario

| Dato | Señal |
|---|---|
| Requisito / historia | texto, HU-###, criterios de aceptación, `.feature` |
| Arquitectura | `cucumber.js`, `features/`, `steps/`, `support/world.ts` → BDD · `playwright.config.ts` + `*.spec.ts` → Playwright Test |
| BASE_URL / app | URL, nombre de ambiente |
| Seed + auth | `seed.spec.ts`, `auth.setup.ts`, `playwright/.auth/` |
| Page Objects / DSL | `pages/*Page.ts`, helpers de dominio |
| Resultados | `results/playwright-results.json`, `results/cucumber-report.json`, `CLASIF_*.json`, output del runner |
| Nivel de criticidad | core bancario, contabilidad, regulación, CRUD, admin |
| Presupuesto | `.env.ai`, `AI_MAX_*` |

### Paso 2 — Preguntar lo que falta (una pregunta a la vez)

Solo lo necesario para el comando pedido:

- **Prioridad 1 — Comando / objetivo:** ¿planificar, generar, reparar, clasificar, impact?
- **Prioridad 2 — Requisito** (plan/generate): historia o criterios. Documento PDF/imagen →
  `ocr-bdd-skill` primero.
- **Prioridad 3 — Nivel de generación** (plan/generate/heal):

  | Nivel | Aplica a | Qué hace la IA |
  |---|---|---|
  | **A** Manual | core bancario, contabilidad, regulación, movimientos monetarios críticos | solo plan + diagnóstico; código lo escribe QA |
  | **B** IA + revisión | default empresarial | genera → PR → review QA → merge |
  | **C** Automática controlada | CRUD, validaciones simples, pantallas admin | genera en batch; valida `tsc` + `--list`; PR |
  | **D** Exploración autónoma | descubrimiento | propone escenarios; nunca merge de críticos |

- **Prioridad 3b — Arquitectura** (si no se detectó por archivos): ¿Playwright Test + POM o
  Cucumber + BDD + POM? Repo con `bdd-skill` (steps genéricos por `data-testid`) → avisar que
  la variante POM usa steps de negocio y no se mezclan en el mismo repo.
- **Prioridad 4 — Seed / auth existente** (generate/heal): si no hay → generar primero
  `auth.setup.ts` con `playwright-skill` (`/playwright:auth`) y un seed por rol.
- **Prioridad 5 — Resultados del fallo** (classify/heal): pedir `results/playwright-results.json`
  (o `results/cucumber-report.json` en BDD) o el output exacto. Nunca healing sin error real.
- **Prioridad 6 — Presupuesto** (heal/pipeline): si no hay `.env.ai` → usar defaults de
  `examples/.env.ai.example` y declararlo.

### Paso 3 — Confirmar antes de actuar

```
CONTEXTO IA DETECTADO:
  COMANDO:        </pw-ia:plan | generate | classify | heal | impact | pipeline>
  REQUISITO:      <HU / resumen o "no aplica">
  ARQUITECTURA:   <Playwright Test + POM | Cucumber + BDD + POM>
  NIVEL:          <A | B | C | D>
  SEED / AUTH:    <seed-xxx + storageState | faltante>
  PO / DSL:       <pages/XPage.ts | ninguno>
  TIER INICIAL:   <económico | intermedio | avanzado>
  PRESUPUESTO:    AI_MAX_HEAL_ATTEMPTS=<n> AI_MAX_CALLS=<n> AI_MAX_TOKENS=<n>
  CONTEXTO A USAR: <lista exacta de archivos/fragmentos>
  SALIDA:         <PLAN_X.md [+ F_X.feature] | T_X.spec.ts | S_x.steps.ts + pages/ | CLASIF_X.json | HEAL_X.md>

¿Confirmás o corregís algo?
```

Esperar confirmación. Luego actuar.

---

## Comandos

| Comando | Acción | Modelo |
|---|---|---|
| `/pw-ia:plan [--bdd]` | Requisito → `PLAN_<FEATURE>.md` (escenarios, riesgos, precondiciones, datos, expected, contrato testid, tags). `--bdd`: escenarios van a `F_<DOMINIO>.feature`. Sin código | económico |
| `/pw-ia:generate [--bdd]` | `PLAN_*.md` → `T_*.spec.ts` · `--bdd`: steps `undefined` del `.feature` → `S_*.steps.ts` + métodos PO | económico |
| `/pw-ia:classify` | Corre `scripts/classify-failures.mjs` (Playwright o cucumber JSON, autodetecta) → `CLASIF_<NOMBRE>.json` + resumen | ninguno |
| `/pw-ia:heal` | Healer sobre candidatos `healerAllowed` con presupuesto → `HEAL_<TEST>.md` | económico → escalar |
| `/pw-ia:budget` | Muestra/valida `AI_MAX_*` y consumo acumulado de la sesión | ninguno |
| `/pw-ia:impact` | `git diff` → tags afectados → comando `npx playwright test --grep` | ninguno |
| `/pw-ia:pipeline` | Genera `Y_<NOMBRE>_playwright_ai.yml` (TIA + tests + classifier, 0 IA en CI) | económico |

---

## Planner — `/pw-ia:plan`

Trabaja sobre **intención funcional**, no sobre el DOM.

```text
requisito → escenarios → riesgos → precondiciones → datos → expected results
```

Formato fijo: `examples/PLAN_TRANSFERENCIAS.md`. Obligatorio:

- tabla de metadatos (historia, nivel, seed, auth, PO/DSL, tags, tier sugerido);
- **contrato `data-testid`** solo para elementos críticos sin locator semántico estable;
- riesgos marcando cuáles son reglas de negocio (→ expected no healeable);
- escenarios con ID estable (`TRF-01`) — el Generator y el Healer los referencian;
- fuera de alcance explícito;
- lista de `T_*.spec.ts` esperados.

Guardar en `specs/<dominio>/PLAN_<FEATURE>.md`. `specs/` = intención; `tests/` =
implementación. Separarlos reduce el contexto para regenerar o reparar.

No explorar la UI si la historia alcanza. Si hace falta explorar → ver Exploración de UI.

**Modo `--bdd`:** `PLAN_*.md` conserva metadatos, riesgos, contrato testid y fuera de alcance,
pero **sin** tabla de escenarios — los escenarios se escriben en `features/<dominio>/F_<DOMINIO>.feature`
siguiendo las reglas Gherkin de `../bdd-skill/skills/bdd/SKILL.md` (keywords en inglés, texto en
español, `# criterio:` por escenario, `Scenario Outline` para variantes de datos). Lenguaje de
negocio: nada de selectores, URLs ni "hago click". Tags `@<dominio>` + `@<ID>` (`@TRF-01`).
Antes de escribir frases nuevas, reutilizar las del catálogo (`npx cucumber-js --profile dryrun`).
Ejemplo: `examples/bdd/F_TRANSFERENCIAS.feature`.

---

## Generator — `/pw-ia:generate`

1. Leer `../playwright-skill/skills/playwright/SKILL.md` y seguir su flujo, convención `T_`,
   protocolo anti-falla de selectores y patrones de config/auth. **No duplicar esa lógica acá.**
2. Contexto de entrada — solo esto:

   ```text
   PLAN_<FEATURE>.md (escenarios a generar)
   Page Object / DSL relevante
   fixture + tipos + helpers usados
   reglas de código
   ```

   Nunca: `src/*`, otros specs, docs, lockfiles, configs irrelevantes.
3. Preferir primitivas de negocio (`transfers.transfer({...})`, `banking.transfer({...})`) sobre
   acciones de bajo nivel repetidas. Si no existe el método → generarlo en el PO primero.
4. Datos por API (`request` / `APIRequestContext`), UI solo para el flujo bajo prueba,
   verificación por API/BD cuando corresponda:

   ```text
   API setup → UI business flow → API/DB verification
   ```

5. Auth por `storageState`. Nunca login por UI en cada test.
6. Tags del plan en el título (`@transferencias @smoke`) — los usa `/pw-ia:impact`.
7. Validación estática antes de entregar (dar comandos, no ejecutar):

   ```bash
   npx tsc --noEmit
   npx playwright test --list
   ```

8. Nivel A → entregar solo esqueleto con `test.fixme` y `// TODO QA:` en los expected. Nivel C
   con cientos de escenarios → sugerir batch (ver `references/model-routing.md`).

Ejemplo de salida: `examples/T_TRANSFERENCIA_EXITOSA.spec.ts` + `examples/pages/TransfersPage.ts`.

**Modo `--bdd`** (capas y anti-patrones: `references/bdd-pom-architecture.md`):

1. Contexto de entrada — solo: `F_*.feature` objetivo · catálogo de steps (expresiones, no
   implementación) · **firmas** públicas de los PO involucrados · getters de `world.ts`.
2. `npx cucumber-js --profile dryrun` → implementar **solo** los steps `undefined`.
3. Un step = una llamada a PO/API del World. Cero locators y cero `page.*` en `steps/`.
4. Falta la acción → método nuevo en `pages/` (reglas de `playwright-skill`) + getter lazy en
   `world.ts` si el PO es nuevo.
5. `Given` de datos → `this.api.*` (nunca UI). `Then` de negocio → `expect` de valor, marcado
   como blacklist del Healer.
6. `hooks.ts`: 1 browser por proceso, 1 context por escenario con `storageState`
   (`@sin-sesion` para login), trace + screenshot solo en fallo.
7. Validar (dar comandos): `npx tsc --noEmit` · `npx cucumber-js --profile dryrun` (0 undefined,
   0 ambiguous) · `npx cucumber-js --tags @TRF-01`.

Ejemplo: `examples/bdd/steps/S_transferencias.steps.ts`, `examples/bdd/support/{world,hooks}.ts`,
`examples/bdd/cucumber.js` — reutilizando el mismo `examples/pages/TransfersPage.ts`.

---

## Exploración de UI — cuándo y cómo

| Caso | Enfoque |
|---|---|
| Generación de tests, coding agents, repos grandes | Playwright CLI + Skills (menos contexto) |
| Exploración autónoma de UI desconocida | MCP |
| Healing complejo / navegación interactiva persistente | MCP |
| Ejecución CI/CD | Playwright Test, sin agente |

Nunca como arquitectura estándar: `Agent → MCP → Browser → Agent → MCP → Browser → …` para
cientos de casos. Exploración puntual → genera `.spec.ts` → fin IA.

Jerarquía de representación (bajar solo si la anterior no alcanza):

```text
accessibility tree → DOM / locator → snapshot parcial → screenshot → vision model
```

- **Buscar antes de snapshot.** `find("Confirmar")` antes de pedir otra representación completa.
- **Fragmento, no página.** Enviar `button "Transferir" / input "Monto" / combobox "Cuenta origen"`,
  no decenas de miles de tokens de snapshot.
- **Visión solo fallback:** canvas, gráficos, mapas, PDFs visuales, diagramas, componentes sin
  accesibilidad, validaciones estrictamente visuales. Nunca screenshots multimodales para
  acciones resolubles con locators.
- Seeds (`examples/seed.spec.ts`) como punto de partida: el agente no redescubre login, rol ni menú.
- Locators: `getByRole` → `getByLabel` → `getByText` → `getByTestId` → CSS → XPath. Selector
  frágil → recomendar `data-testid` al equipo de desarrollo (contrato en `PLAN_*.md`).

---

## Failure Classifier — `/pw-ia:classify`

```bash
node scripts/classify-failures.mjs --input results/playwright-results.json --out CLASIF_<NOMBRE>.json
```

Node ≥18, cero dependencias, cero IA. Reglas ordenadas por prioridad — tabla completa y
decisiones de diseño en `references/failure-taxonomy.md`.

| Categoría | Ejemplo | Healer |
|---|---|---|
| `NETWORK` | `ECONNREFUSED`, `net::ERR_` | no — retry/infra |
| `ENVIRONMENT` | `Executable doesn't exist`, `page.goto: Timeout`, 502/503/504 | no — retry/infra |
| `PRODUCT_BUG` | `Received: 500`, `toBe(1000000)` recibió `850000` | no — bug tracker |
| `DATA` | `Received: 409`, `duplicate key` | no — revisar API setup/seed |
| `TEST_BUG` high | `locator.click: Timeout`, `strict mode violation`, `element(s) not found` | **sí** |
| `TEST_BUG` medium | `toHaveText` distinto, `Expected: visible / Received: hidden` | solo si humano confirma |
| `UNKNOWN` | nada coincide, `Test timeout` | no — análisis humano |

Flaky (falló y pasó en retry) → lista `flaky[]`, nunca Healer.

Cucumber (`results/cucumber-report.json`): se clasifica el primer step no `passed`/`skipped` de
cada escenario y se agrega `step` al resultado. `undefined`/`pending` → `TEST_BUG/medium`
(`/pw-ia:generate --bdd`, no Healer) · `ambiguous` → `TEST_BUG/medium` (humano unifica
expresiones) · step timeout de cucumber → `UNKNOWN`. El JSON de cucumber no distingue flaky:
perfil con `retry: 0`. Ejemplo: `examples/bdd/cucumber-report.sample.json` →
`examples/bdd/CLASIF_BDD_EJEMPLO.json`.

Salida al usuario: resumen por categoría + tabla `categoría · confianza · HEAL/HUMAN · test`.
Si el usuario pide reinterpretar un `UNKNOWN` con el modelo → permitido para derivar, **nunca**
cambia `healerAllowed`.

---

## Healer — `/pw-ia:heal`

Precondiciones (todas): `healerAllowed: true` en `CLASIF_*.json` · intento ≤
`AI_MAX_HEAL_ATTEMPTS` (default 2) · llamadas ≤ `AI_MAX_CALLS` · tokens ≤ `AI_MAX_TOKENS`.
Si falta `CLASIF_*.json` → correr `/pw-ia:classify` primero. Nunca healing "a ojo".

**Whitelist** — locator · selector · wait/sincronización · navegación · fixture técnico.

**Blacklist** — expected de negocio · cálculos · saldos · reglas contables · HTTP status
funcional esperado · reglas regulatorias · permisos · límites monetarios.

```typescript
expect(balance).toBe(1_000_000); // sistema devuelve 850000 → NO cambiar a 850_000
```

Si el único fix toca la blacklist → `HUMAN_REVIEW_REQUIRED`.

**BDD — permisos por capa:** `features/*.feature` nunca · `Then` con `expect` de valor nunca ·
glue de `steps/` solo `TEST_BUG/high` sin cambiar la expresión Cucumber · `support/` fixture
técnico · `pages/` sí. `[DYNAMIC]` en BDD = texto del step fallido + su implementación + métodos
PO que invoca + error + fragmento a11y; nunca el `.feature` completo ni otros steps.

Flujo:

1. Armar prompt con `examples/HEALER_PROMPT.md`: `[STATIC]` idéntico siempre (cache) +
   `[DYNAMIC]` con solo el `test()` que falla, locators del PO usados, error (≤20 líneas),
   fragmento a11y de la región. Nunca trace/video/DOM completos.
2. Respuesta con formato fijo (`VEREDICTO / CAUSA / CONFIANZA / TOCA_BLACKLIST / DIFF`).
3. Chequeo mecánico del diff (`references/healing-guardrails.md`): rechazar si toca matcher de
   valor, literal numérico en `expect`, archivos fuera de `tests/ pages/ fixtures/`, borra
   `expect`/`test`, agrega `skip`/`fixme`, o sube timeouts sin causa.
4. `CONFIANZA ≠ high` → escalar tier (`references/model-routing.md`), consume un intento.
5. Dar comando de verificación — el agente no ejecuta en loop:

   ```bash
   npx playwright test <file> -g "<title>" --project <project>
   ```

6. Escribir `HEAL_<TEST>.md` (formato en `references/healing-guardrails.md`) con intento, tier,
   tokens y veredicto.
7. Entrega **solo** vía `course-pr-skill` (`/curso:entregar`) con revisión humana. Nunca
   commit/push/merge directo.

Presupuesto agotado → `HUMAN_REVIEW_REQUIRED` + resumen de intentos. No pedir "un intento más"
sin que el usuario suba `AI_MAX_HEAL_ATTEMPTS` explícitamente.

---

## Presupuesto y model routing — `/pw-ia:budget`

```text
AI_MAX_HEAL_ATTEMPTS=2
AI_MAX_CALLS=3
AI_MAX_TOKENS=<límite interno>
AI_BUDGET_PER_TEST=<según proveedor>
AI_DEFAULT_TIER=economico
```

- Tier económico por defecto. Avanzado solo por escalamiento o exploración desconocida /
  multi-page / problemas que mezclan frontend, backend y reglas funcionales.
- Escalamiento: económico → intermedio → avanzado → `HUMAN_REVIEW_REQUIRED`.
- Prompt caching: `[STATIC]` primero, byte-idéntico; `[DYNAMIC]` al final.
- Batch para generación nocturna masiva si el proveedor ofrece descuento.

`/pw-ia:budget` imprime valores activos, consumo de la sesión (llamadas, tokens por tarea) y
avisa si falta `.env.ai`. Detalle: `references/model-routing.md`. Métricas:
`references/metrics.md`.

---

## Evidencias

En `playwright.config.ts` (generado por `playwright-skill`), verificar:

```typescript
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

Nunca `trace/video/screenshot: 'on'` permanente — más almacenamiento y más evidencia tentadora
de mandar al modelo. Al Healer va el **fragmento**, no el artefacto.

---

## Test Impact Analysis — `/pw-ia:impact`

```text
git diff → rutas cambiadas → mapa ruta→tags → npx playwright test --grep "@a|@b"
```

Ejemplo: `src/payments/*` → `@pagos|@ledger|@cuentas`, no `@all`. Cambio en
`package.json`/`playwright.config.ts` → suite completa. Siempre incluir `@smoke`.
Script de referencia: step "Test Impact Analysis" en `examples/Y_EXAMPLE_playwright_ai.yml`.
Combinar con projects, sharding (`--shard=1/4`) y workers.

BDD: mismo mapa ruta→tag, pero con expresión de tags cucumber (`or`/`and`/`not`, no regex):
`CUCUMBER_TAGS="@smoke or @transferencias" npx cucumber-js --profile pr`.

Pirámide operativa (ejemplo 1.000 tests):

| Disparador | Alcance |
|---|---|
| Pull Request | 100 smoke + críticos afectados (100–300) |
| Nightly | 1.000 |
| Extendida | 1.000 × browsers × resoluciones × datasets |

Risk analyzer: LOW → smoke · MEDIUM → regresión afectada · HIGH → críticos/full E2E.

---

## Pipeline — `/pw-ia:pipeline`

Genera `Y_<NOMBRE>_playwright_ai.yml` a partir de `examples/Y_EXAMPLE_playwright_ai.yml`:
TIA → `npx playwright test` (`continueOnError`) → classifier (`condition: always()`) →
JUnit + artefactos (`CLASIF_*.json`). **Cero llamadas a modelos en CI.** Healer corre fuera, bajo
demanda, sobre `CLASIF_*.json` descargado. Para el resto del pipeline (PDF ejecutivo,
GitHub Actions) delegar en `playwright-skill` (`/playwright:ci`).
BDD: reemplazar el step de tests por `npx cucumber-js --profile pr` y apuntar el classifier a
`results/cucumber-report.json` (comentario "Variante BDD" en el ejemplo). PDF → `bdd-skill`.

---

## Convención de nombres

| Prefijo | Archivo | Ubicación |
|---|---|---|
| `PLAN_` | Plan del Planner `.md` | `specs/<dominio>/PLAN_<FEATURE>.md` |
| `T_` | Spec Playwright (de `playwright-skill`) | `tests/<dominio>/T_<FLUJO>.spec.ts` |
| `seed` | Seed por rol | `tests/seed/seed.spec.ts` |
| `F_` | Feature Gherkin (BDD) | `features/<dominio>/F_<DOMINIO>.feature` |
| `S_` | Step definitions de negocio (BDD) | `steps/S_<dominio>.steps.ts` |
| — | World + hooks (BDD) | `support/world.ts`, `support/hooks.ts` |
| `CLASIF_` | Salida del classifier `.json` | `results/CLASIF_<NOMBRE>.json` |
| `HEAL_` | Propuesta del Healer `.md` | `results/heal/HEAL_<TEST>.md` |
| `Y_` | Pipeline `.yml` | `Y_<NOMBRE>_playwright_ai.yml` |

---

## Fallos comunes y fixes

| Síntoma | Causa | Fix |
|---|---|---|
| `classify-failures: no se pudo leer` | reporter JSON no configurado | agregar `['json', { outputFile: 'results/playwright-results.json' }]` en `reporter` |
| Todo sale `UNKNOWN` | mensajes custom en `expect(…, 'msg')` o wrapper propio | agregar regla en `RULES` + fila en `failure-taxonomy.md` |
| Healer propone cambiar un número en `expect` | fix toca blacklist | rechazar → `HUMAN_REVIEW_REQUIRED`; posible PRODUCT_BUG |
| Mismo test vuelve a romper tras healing | locator frágil (CSS/texto de marketing) | pedir `data-testid` al equipo; agregar al contrato del plan |
| Tokens por healing altos | se mandó spec/DOM/trace completo | recortar a `test()` + locators + error + fragmento a11y |
| Cache no aprovecha | dato variable dentro de `[STATIC]` | mover timestamp/id/intento a `[DYNAMIC]` |
| PR corre toda la suite | tags ausentes en títulos o mapa TIA desactualizado | agregar tags del plan; actualizar mapa ruta→tag |
| Flaky rate sube | sincronización incorrecta | revisar trace del retry; humano decide — no Healer |
| BDD: `Undefined step` | frase nueva en `.feature` sin glue | `/pw-ia:generate --bdd`; reusar frase existente si hay equivalente |
| BDD: `Multiple step definitions match` | dos expresiones equivalentes en `steps/` | unificar en un solo step; humano decide cuál queda |
| BDD: Healer quiere editar el `.feature` | texto del step acoplado a la UI | rechazar; mover detalle de UI a `pages/` y reescribir el step en negocio (humano) |
| BDD: escenarios lentos | login por UI en `Background` o datos por UI | `storageState` en `hooks.ts`; `Given` de datos por API |

---

## Auto-Clarity

Salir de caveman para: propuesta del Healer que roza la blacklist, `HUMAN_REVIEW_REQUIRED`
con posible PRODUCT_BUG, fallos clasificados como críticos de negocio (saldos, montos,
permisos), presupuesto agotado, recomendaciones de arquitectura. Retomar caveman después.

## Boundaries

Escribe `PLAN_*.md`, `F_*.feature` (modo BDD), `S_*.steps.ts` + `world.ts`/`hooks.ts` (modo BDD),
`HEAL_*.md`, prompts de Healer, `.env.ai.example`, pipelines
`Y_*_playwright_ai.yml`, mapas de TIA, comandos CLI. Corre `scripts/classify-failures.mjs`.
Genera specs/Page Objects **solo** a través del flujo de `playwright-skill`.
NO usa IA en ejecución de tests ni en CI.
NO ejecuta tests en loop — da el comando exacto.
NO modifica expected de negocio, cálculos, saldos, status funcional, permisos ni límites.
NO supera `AI_MAX_HEAL_ATTEMPTS` sin cambio explícito del usuario.
NO hace commit, push ni merge — entrega vía `course-pr-skill`.
NO manda al modelo repo completo, DOM completo, trace ni video.
NO inventa selectores — protocolo anti-falla de `playwright-skill`.
NO modifica `.feature` en healing ni pone locators dentro de `steps/`.
"stop playwright-ai" o "normal mode": volver a estilo verbose.
