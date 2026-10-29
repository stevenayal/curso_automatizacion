# Semana 7 — Integración de CI, BDD + POM y evidencias

MVP de la semana 7: ejecutar en CI la suite BDD conocida (Cucumber + Playwright + POM),
conservar el informe aunque una prueba falle y dejar una síntesis para decidir.

## Qué ya existía y qué agrega este MVP

| Pieza de la clase | Estado previo en el repo | Este MVP |
| --- | --- | --- |
| Suite BDD + POM | Grupo 03: `prestamos.feature` → `tests/bdd/steps` → `LoansPage` | Se reutiliza sin cambios de negocio |
| Config aislada `tests/bdd/sandbox-pom/cucumber.js` | No existía (solo `cucumber.js` raíz) | Perfiles `sandbox` y `dryrun` |
| `npm run test:bdd:sandbox` | No existía | Agregado (+ `test:bdd:dryrun`, `test:bdd:check`) |
| CI con Chromium sin ventana | `qa-checks.yml` corre `test:bdd`, pero no guarda el informe Cucumber | `bdd-pom-ci.yml` |
| Informe conservado ante fallo (`if: always()`) | Solo `playwright-report/` | Artefacto `evidencia-bdd-<run>` con `cucumber.html` y `cucumber.json` |
| `HEADED=0` | Hooks siempre headless | `HEADED=1` abre ventana en local |
| Control "cero escenarios = fallo" (issue #32) | `test:bdd` termina verde con 0 escenarios | `scripts/check-cucumber-results.mjs` |
| Trazabilidad versión/ejecución | No | Resumen del job: commit, rama, URL del run, ambiente, escenarios |
| Timeout de steps | Default 5 s: el login a la sandbox fallaba por tiempo | `setDefaultTimeout(30_000)` |

## Ejecutar en local (PowerShell)

```powershell
$bddConfig = "tests/bdd/sandbox-pom/cucumber.js"
npx cucumber-js --config $bddConfig --profile dryrun   # revisa enlaces, no toca el sitio
npm run test:bdd:sandbox                               # ejecuta contra BASE_URL
npm run test:bdd:check                                 # resume y falla si hubo 0 escenarios
```

- `BASE_URL` por defecto: `https://aiquaa-sandbox-web.vercel.app`.
- `HEADED=1` para ver el navegador; `CUCUMBER_TAGS` para filtrar (default `not @wip`).
- Informes en `results/cucumber.html` y `results/cucumber.json` (ignorados por git).

## Ejecutar en CI

Workflow [`bdd-pom-ci.yml`](../.github/workflows/bdd-pom-ci.yml):

- Manual: *Actions → BDD + POM (sandbox) → Run workflow* (input `tags`).
- Automático en PR que toque features, steps, page objects o el workflow.
- Pasos: `npm ci` → Chromium → dry-run → suite → resumen/control → artefacto (siempre).
- Variable opcional de repo `BASE_URL_SANDBOX` para cambiar el ambiente.
- No usa secretos ni llamadas a modelos: el escenario actual solo navega la sandbox.

Guardar evidencia no cambia el resultado: si Cucumber falla, el job queda en rojo y el
artefacto igual se publica.

## Fallo controlado (demostración)

1. En una rama de práctica, cambiar la expectativa en `prestamos.feature`, por ejemplo
   `muestra el saldo pendiente "PYG 1,00"`.
2. Abrir PR (o ejecutar el workflow manual sobre esa rama).
3. Comprobar: job rojo, artefacto `evidencia-bdd-<run>` disponible, captura adjunta en el HTML.
4. Restaurar el valor y explicar la diferencia entre ambas ejecuciones (mismo escenario,
   distinta expectativa; el sitio no cambió).

Antes de modificar una prueba que falla: ¿falló el enlace de Cucumber o el ambiente? ¿existen
los datos? ¿la acción llegó al elemento? ¿el resultado contradice el requisito? Documentar la
causa antes de aceptar el cambio. Nunca debilitar la aserción para ponerla en verde.

## Plantilla de síntesis para decidir

```text
Requisito:     <ID y descripción>
Versión:       <commit> · run <URL de Actions>
BDD:           <N> escenarios ejecutados, <M> con fallo (artefacto evidencia-bdd-<run>)
API/SQL:       <colección Newman + run> o "evidencia de semana X, no comparable"
Rendimiento:   <JTL/HTML JMeter + límites p95/errores> o "sin ejecución en esta versión"
Monitoreo:     <ventana Grafana> o "datos insuficientes: análisis inconcluso"
Decisión:      aprobar / no aprobar todavía
Riesgos:       <cobertura pendiente, riesgos residuales>
Siguiente acción: <qué falta comprobar y quién>
```

## Fuera de alcance

- JMeter ya tiene su workflow (`Y_AIQUAAECHO_jmeter.yml`); la carga se programa aparte.
- `qa-checks.yml` usa la misma sandbox (`BASE_URL`) y aplica el mismo control de cero
  escenarios sobre `results/cucumber-report.json` (`npm run test:bdd:check:default`).
