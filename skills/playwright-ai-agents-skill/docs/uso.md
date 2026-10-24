# Guía de uso — playwright-ai-agents-skill

## Instalación

```bash
npx skills add aiquaa-labs/playwright-ai-agents-skill
npx skills add aiquaa-labs/playwright-skill      # genera specs, config, auth, CI
npx skills add aiquaa-labs/course-pr-skill       # entrega por PR de lo generado/reparado
```

Requisitos locales: Node ≥18 y un proyecto Playwright con reporter JSON:

```typescript
// playwright.config.ts
reporter: [
  ['list'],
  ['json',  { outputFile: 'results/playwright-results.json' }],
  ['junit', { outputFile: 'results/playwright-junit.xml' }],
],
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

Copiar el classifier y el presupuesto al proyecto:

```bash
cp playwright-ai-agents-skill/scripts/classify-failures.mjs scripts/
cp playwright-ai-agents-skill/examples/.env.ai.example .env.ai
```

---

## Dos arquitecturas

- **Playwright Test + POM** (default): `T_*.spec.ts` sobre `pages/*Page.ts`. Recorrido de abajo.
- **Cucumber + BDD + POM**: `F_*.feature` (negocio, humano/Planner) → `S_*.steps.ts` (glue, 1
  línea por step) → `pages/*Page.ts` (mismo Page Object). Ver sección "Recorrido BDD" y
  `references/bdd-pom-architecture.md` para capas, permisos del Healer por capa y anti-patrones.
  No mezclar con los steps genéricos por `data-testid` de `bdd-skill` en el mismo repo — elegir
  una arquitectura de steps.

## Recorrido completo — HU "Transferencia entre cuentas propias"

### 1. Planificar

```
/pw-ia:plan HU-231: como cliente retail quiero transferir entre mis cuentas propias…
```

La skill pregunta nivel de generación (A/B/C/D), seed y Page Objects existentes, confirma y
escribe `specs/transferencias/PLAN_TRANSFERENCIAS.md`. Sin código, sin abrir el navegador si
la historia alcanza. Revisar escenarios, riesgos y contrato `data-testid` con el equipo antes
de seguir.

### 2. Generar

```
/pw-ia:generate specs/transferencias/PLAN_TRANSFERENCIAS.md TRF-01 TRF-02
```

La skill lee el flujo de `playwright-skill`, carga **solo** el plan, `pages/TransfersPage.ts`,
fixtures y tipos, y genera `tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts`. Validar:

```bash
npx tsc --noEmit
npx playwright test --list
npx playwright test tests/transferencias --project chromium
```

Desde acá, el test corre en CI sin IA para siempre.

### 3. Algo falla en CI → clasificar

Descargar `results/playwright-results.json` del artefacto (o `CLASIF_*.json` si el pipeline ya
lo generó) y:

```
/pw-ia:classify
```

```text
tests=10 failed=8 flaky=1 healer=1
TEST_BUG    high   HEAL  …T_TRANSFERENCIA_EXITOSA.spec.ts › transferencia exitosa [chromium]
PRODUCT_BUG medium HUMAN …T_TRANSFERENCIA_EXITOSA.spec.ts › saldo origen se descuenta [chromium]
PRODUCT_BUG medium HUMAN …T_TRANSFERENCIAS_API.spec.ts › POST /api/transfers retorna 201 [api]
NETWORK     high   HUMAN …T_TRANSFERENCIAS_API.spec.ts › GET /api/accounts responde [api]
```

- `HUMAN` + `PRODUCT_BUG` → bug tracker, con el error y el trace del retry.
- `HUMAN` + `ENVIRONMENT`/`NETWORK` → retry o infra.
- `HEAL` → paso 4.

### 4. Reparar con presupuesto

```
/pw-ia:heal
```

Para cada candidato: arma el prompt `[STATIC]`+`[DYNAMIC]`, pide un diff mínimo, lo pasa por el
chequeo mecánico (no toca `expect` de valor, no sale de `tests/ pages/ fixtures/`), da el
comando de verificación y escribe `results/heal/HEAL_TRF_01.md`. Si en 2 intentos no hay fix
válido → `HUMAN_REVIEW_REQUIRED`.

```bash
npx playwright test tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts -g "TRF-01" --project chromium
```

### 5. Entregar

```
/curso:entregar
```

`course-pr-skill` abre el PR con el diff y `HEAL_*.md` como evidencia. Revisión humana
obligatoria.

---

## Recorrido BDD — misma HU con Cucumber + POM

### 1. Planificar en modo BDD

```
/pw-ia:plan --bdd HU-231: como cliente retail quiero transferir entre mis cuentas propias…
```

Escribe `specs/transferencias/PLAN_TRANSFERENCIAS.md` (metadatos, riesgos, contrato testid,
fuera de alcance — sin tabla de escenarios) + `features/transferencias/F_TRANSFERENCIAS.feature`
con los escenarios en Gherkin (reglas de `bdd-skill`: keywords en inglés, texto en español,
`# criterio:`, tags `@transferencias @TRF-01 @smoke`).

### 2. Generar el glue

```
npx cucumber-js --profile dryrun     # results/cucumber-usage.txt: qué steps faltan
/pw-ia:generate --bdd features/transferencias/F_TRANSFERENCIAS.feature
```

La skill implementa **solo** los steps `undefined`, uno por uno, cada uno como una llamada a un
método de `pages/TransfersPage.ts` (nuevo o existente) a través de `support/world.ts`. Nunca
locators ni `page.*` en `steps/`. Validar:

```bash
npx tsc --noEmit
npx cucumber-js --profile dryrun     # 0 undefined, 0 ambiguous
npx cucumber-js --tags @TRF-01
```

### 3. Falla en CI → clasificar

```
/pw-ia:classify
```

`scripts/classify-failures.mjs` detecta el formato cucumber (array raíz) solo — sin flags.

```text
tests=6 failed=5 flaky=0 healer=1
TEST_BUG    high   HEAL  …F_TRANSFERENCIAS.feature › Transferencia exitosa entre cuentas propias [cucumber] › When transfiero 500000 de "CA_GS" a "CC_GS"
PRODUCT_BUG medium HUMAN …F_TRANSFERENCIAS.feature › El saldo de origen se descuenta por el monto transferido [cucumber]
UNKNOWN     medium HUMAN …F_TRANSFERENCIAS.feature › Transferencia rechazada por saldo insuficiente [cucumber]
TEST_BUG    medium HUMAN …F_TRANSFERENCIAS_TERCEROS.feature › Transferencia a beneficiario registrado [cucumber]
TEST_BUG    medium HUMAN …F_TRANSFERENCIAS_TERCEROS.feature › Beneficiario duplicado [cucumber]
```

- `TEST_BUG/high` (locator roto en `pages/`) → Healer, igual que en Playwright Test.
- `TEST_BUG/medium` con step `Undefined step:` → no es Healer: correr `/pw-ia:generate --bdd`
  para implementar el glue faltante.
- `TEST_BUG/medium` con step `Ambiguous step:` → dos expresiones Cucumber equivalentes; un
  humano unifica cuál queda en `steps/`.
- `PRODUCT_BUG`/`UNKNOWN` → igual que en Playwright Test: bug tracker / análisis humano.

### 4. Reparar

```
/pw-ia:heal
```

Mismas reglas de presupuesto y blacklist. Además, en BDD el Healer **nunca** toca un
`.feature` ni la expresión Cucumber de un step — solo `pages/` y fixtures técnicos de
`support/`. Ver "Permisos por capa" en `references/bdd-pom-architecture.md`.

### 5. Entregar

```
/curso:entregar
```

Igual que en la variante Playwright Test.

---

## Pipeline sin IA

```
/pw-ia:pipeline
```

Genera `Y_<NOMBRE>_playwright_ai.yml` desde `examples/Y_EXAMPLE_playwright_ai.yml`:

1. **Test Impact Analysis** — en PR, `git diff` contra la rama destino → tags afectados
   (`src/payments/*` → `@pagos|@ledger|@cuentas`) + `@smoke`. En `main`/nightly → suite
   completa. Cambio de `package.json`/`playwright.config.ts` → suite completa.
2. `npx playwright test --grep "<tags>"` con `continueOnError`.
3. `classify-failures.mjs` con `condition: always()` → `CLASIF_*.json` en artefactos.
4. JUnit a Azure Test Plans.

Mantener el mapa ruta→tag del step 1 sincronizado con los tags de los `T_*.spec.ts`.

---

## Presupuesto

```
/pw-ia:budget
```

| Variable | Default | Qué limita |
|---|---|---|
| `AI_MAX_HEAL_ATTEMPTS` | 2 | intentos del Healer por test (incluye escalamientos de tier) |
| `AI_MAX_CALLS` | 3 | llamadas al modelo por test |
| `AI_MAX_TOKENS` | 40000 | tokens in+out por test |
| `AI_BUDGET_PER_TEST` | — | moneda del proveedor, definir con tarifa real |
| `AI_DEFAULT_TIER` | economico | tier inicial |

Ajustar con datos reales — ver `references/metrics.md`.

---

## Extender el classifier

Si un mensaje recurrente cae en `UNKNOWN` (wrappers propios, `expect(x, 'mensaje custom')`):

1. Agregar la regla en `RULES` de `scripts/classify-failures.mjs`, en la posición de prioridad
   correcta, con `id`, `category`, `confidence`, `pattern`.
2. Agregar la fila en `references/failure-taxonomy.md` con el mismo `id` y orden.
3. Agregar un caso en `examples/playwright-results.sample.json` y regenerar
   `examples/CLASIF_EJEMPLO.json` (o el equivalente en `examples/bdd/cucumber-report.sample.json`
   → `examples/bdd/CLASIF_BDD_EJEMPLO.json` si la regla es específica de cucumber).

`confidence: 'high'` en una regla `TEST_BUG` habilita Healer automático — justificarlo en
"Decisiones de diseño" de la taxonomía.

---

## Preguntas frecuentes

**¿Puedo usar Playwright MCP?** Sí, para exploración autónoma de UI desconocida o healing
complejo. No como forma estándar de generar cientos de tests ni nunca para ejecutar.

**¿Y los Test Agents oficiales de Playwright (planner/generator/healer)?** Compatibles: esta
skill aporta lo que no traen por defecto — classifier determinístico previo, presupuesto,
blacklist de reglas de negocio y entrega por PR. Guardar sus planes con prefijo `PLAN_` en
`specs/`.

**¿El Healer puede ajustar un monto que cambió por una nueva regla?** No. Cambios de reglas de
negocio los hace QA a mano, con la historia que lo justifica.

**¿Cuándo uso Cucumber + BDD + POM en vez de Playwright Test + POM?** Cuando el equipo ya
escribe criterios de aceptación en Gherkin o quiere que negocio pueda leer/revisar los
escenarios sin ver código. Si solo QA toca los tests, Playwright Test + POM es más directo —
un archivo menos por escenario (no hay `.feature` + `steps/` separados).

**¿Puedo mezclar steps genéricos por `data-testid` (bdd-skill) con esta variante POM?** No en
el mismo repo — son dos convenciones de `steps/` distintas. Elegir una por proyecto.

**¿Qué pasa con los tests flaky?** Van a `flaky[]` en `CLASIF_*.json` (Playwright Test — el JSON
de cucumber no distingue flaky, por eso los perfiles de `examples/bdd/cucumber.js` usan
`retry: 0`). Un humano revisa el
trace del retry; el Healer no los toca.
