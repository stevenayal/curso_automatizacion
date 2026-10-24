# playwright-ai-agents-skill

> Agentes de IA sobre Playwright con estrategia de bajo consumo — powered by [aiquaa](https://aiquaa.com/)

Skill para Claude Code, Cursor, Windsurf y más de 40 agentes de IA. Gobierna cuándo y cómo
interviene un modelo en una suite Playwright: **Planner** (requisito → plan), **Generator**
(plan → spec), **Failure Classifier** determinístico y **Healer** bajo demanda con
presupuesto y revisión humana obligatoria.

> **IA para generar, analizar y reparar. Playwright Test para ejecutar.**

---

## ¿Qué problema resuelve?

Un agente controlando el navegador en cada ejecución multiplica el consumo: snapshots del DOM,
llamadas a herramientas y razonamiento repetido en cada paso de cada test. Además, un
"self-healing" sin límites termina ajustando expectativas de negocio para que el test pase.

Esta skill fija la arquitectura contraria:

- el modelo genera el código **una vez**; CI lo corre **sin IA**;
- los fallos se clasifican con **reglas**, no con un LLM;
- el Healer solo actúa sobre `TEST_BUG` de alta confianza, con **máximo 2 intentos**, y tiene
  **prohibido** tocar saldos, cálculos, status funcionales, permisos o límites;
- toda propuesta llega como PR para revisión humana.

Complementa a [`playwright-skill`](../playwright-skill/README.md): esa genera specs, Page
Objects, config y PDF; esta decide cuándo y con cuánto contexto interviene la IA.

Soporta dos arquitecturas de ejecución, con el mismo Planner/Generator/Classifier/Healer:

- **Playwright Test + POM** (default) — `T_*.spec.ts` sobre `pages/*Page.ts`.
- **Cucumber + BDD + POM** — `F_*.feature` (negocio) → `S_*.steps.ts` (glue, 1 línea por step)
  → `pages/*Page.ts` (mismo Page Object que la variante anterior). Ver
  [`references/bdd-pom-architecture.md`](./references/bdd-pom-architecture.md) y
  [`examples/bdd/`](./examples/bdd/).

---

## ¿Qué incluye?

| Componente | Descripción |
|------------|-------------|
| `skills/playwright-ai-agents/SKILL.md` | Instrucciones del agente — plan, generate, classify, heal, budget, impact, pipeline |
| `scripts/classify-failures.mjs` | Failure Classifier — Node ≥18, cero dependencias, cero IA |
| `references/estrategia-ia.md` | Documento base completo de la estrategia |
| `references/failure-taxonomy.md` | Categorías y reglas del classifier, 1:1 con el script |
| `references/healing-guardrails.md` | Whitelist/blacklist, chequeo mecánico del diff, loop con presupuesto |
| `references/model-routing.md` | Tiers económico/intermedio/avanzado, escalamiento, caching, batch |
| `references/metrics.md` | Métricas de costo y calidad + instrumentación mínima |
| `examples/PLAN_TRANSFERENCIAS.md` | Salida del Planner |
| `examples/T_TRANSFERENCIA_EXITOSA.spec.ts` + `pages/TransfersPage.ts` | Salida del Generator: API setup → UI → API verify, DSL de negocio |
| `examples/seed.spec.ts` | Seed test por rol |
| `examples/HEALER_PROMPT.md` | Prompt `[STATIC]` cacheable + `[DYNAMIC]` |
| `examples/playwright-results.sample.json` → `CLASIF_EJEMPLO.json` | Entrada y salida del classifier |
| `examples/.env.ai.example` | Presupuesto de agentes |
| `examples/Y_EXAMPLE_playwright_ai.yml` | Azure Pipelines: impact analysis + tests + classifier, 0 IA |
| `references/bdd-pom-architecture.md` | Arquitectura Cucumber + BDD + POM: capas, permisos del Healer, anti-patrones |
| `examples/bdd/` | `F_*.feature`, `S_*.steps.ts`, `world.ts`/`hooks.ts`, `cucumber.js`, `cucumber-report.sample.json` → `CLASIF_BDD_EJEMPLO.json` |

---

## Instalación

```bash
# Claude Code
npx skills add aiquaa-labs/playwright-ai-agents-skill

# Cursor
npx skills add aiquaa-labs/playwright-ai-agents-skill -a cursor

# Windsurf
npx skills add aiquaa-labs/playwright-ai-agents-skill -a windsurf
```

Recomendado junto con:

```bash
npx skills add aiquaa-labs/playwright-skill
npx skills add aiquaa-labs/course-pr-skill
```

---

## Uso rápido

### Base ejecutable BDD + Playwright

La base autocontenida está en [`examples/bdd/starter`](./examples/bdd/starter/README.md).
Incluye aplicación local, Gherkin, steps de negocio, Page Object, reportes y lockfile:

```bash
cd examples/bdd/starter
npm ci
npm run browsers:install
npm run check
```

Los ejemplos de transferencias permanecen como plantillas para una aplicación bancaria real.

```
/pw-ia:plan       → requisito → PLAN_<FEATURE>.md (sin código)
/pw-ia:plan --bdd → ídem, escenarios en F_<DOMINIO>.feature
/pw-ia:generate   → PLAN_*.md → T_*.spec.ts vía playwright-skill, contexto mínimo
/pw-ia:generate --bdd → steps "undefined" del .feature → S_*.steps.ts + métodos PO
/pw-ia:classify   → results/playwright-results.json → CLASIF_<NOMBRE>.json (sin IA)
/pw-ia:heal       → Healer sobre candidatos, con presupuesto → HEAL_<TEST>.md
/pw-ia:budget     → valores AI_MAX_* activos y consumo de la sesión
/pw-ia:impact     → git diff → tags afectados → npx playwright test --grep
/pw-ia:pipeline   → Y_<NOMBRE>_playwright_ai.yml
```

Classifier standalone:

```bash
node scripts/classify-failures.mjs \
  --input results/playwright-results.json \
  --out   results/CLASIF_PORTAL.json
```

```text
tests=10 failed=8 flaky=1 healer=1
TEST_BUG    high   HEAL  tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts › transferencia exitosa … [chromium]
ENVIRONMENT high   HUMAN tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts › transferencia exitosa … [firefox]
PRODUCT_BUG medium HUMAN tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts › saldo origen se descuenta … [chromium]
…
```

---

## Convención de nombres

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Plan del Planner | `PLAN_FEATURE.md` | `PLAN_TRANSFERENCIAS.md` |
| Test spec | `T_NOMBRE_DE_FLUJO.spec.ts` | `T_TRANSFERENCIA_EXITOSA.spec.ts` |
| Clasificación de fallos | `CLASIF_NOMBRE.json` | `CLASIF_PORTAL.json` |
| Propuesta del Healer | `HEAL_TEST.md` | `HEAL_TRF_01.md` |
| Pipeline CI | `Y_NOMBRE_playwright_ai.yml` | `Y_PORTAL_playwright_ai.yml` |
| Feature Gherkin (BDD) | `F_DOMINIO.feature` | `F_TRANSFERENCIAS.feature` |
| Steps de negocio (BDD) | `S_dominio.steps.ts` | `S_transferencias.steps.ts` |

---

## Estructura recomendada del proyecto

```
specs/
  transferencias/PLAN_TRANSFERENCIAS.md     ← intención funcional
tests/
  seed/seed.spec.ts
  transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts
pages/
  TransfersPage.ts                           ← compresión semántica para la IA
playwright/.auth/                            ← storageState (gitignored)
scripts/classify-failures.mjs
results/
  playwright-results.json
  CLASIF_PORTAL.json
  heal/HEAL_TRF_01.md
.env.ai                                      ← presupuesto (gitignored)
playwright.config.ts

# Variante Cucumber + BDD + POM (alternativa a tests/, mismo pages/):
features/transferencias/F_TRANSFERENCIAS.feature
steps/S_transferencias.steps.ts
support/world.ts
support/hooks.ts
cucumber.js
```

---

## Regla operativa

> **Una prueba automatizada aprobada nunca debería necesitar IA para pasar.**

→ [Guía de uso](./docs/uso.md) · [Estrategia completa](./references/estrategia-ia.md)

---

## Créditos

Creado por [aiquaa](https://aiquaa.com/) — *Saber es calidad*

## Licencia

MIT
