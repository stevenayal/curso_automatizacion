# BDD workspace

Acá van los step definitions y el soporte de Cucumber que escribe cada grupo.

- `tests/bdd/steps/` — steps por módulo (`<modulo>.steps.ts`). Sin locators: llaman a Page Objects.
- `tests/bdd/support/` — hooks y world (`<modulo>.hooks.ts`, `<modulo>.world.ts`).

## Cómo se descubren

[`cucumber.js`](../../cucumber.js) carga `tests/bdd/**/*.ts` (vía `ts-node`) y corre los `.feature`
de `features/` y de `grupos/**/features/`, **excluyendo los que tienen el tag `@wip`**.

## Habilitar la suite de un grupo

1. Escribir los escenarios en `grupos/grupo-0N-modulo/features/<modulo>.feature`, con el tag del
   grupo (`@grupo-0N`) a nivel de feature.
2. Implementar los steps en `tests/bdd/steps/<modulo>.steps.ts` y, si usan navegador, un hook
   filtrado por tag (ver [`loans.hooks.ts`](support/loans.hooks.ts):
   `Before({ tags: '@grupo-03 and @web and not @wip' }, ...)`).
3. Quitar `@wip` del feature o **escenario por escenario**. Un escenario que modifica datos
   (transferencias, pagos, altas) solo sale de `@wip` si usa un fixture aislado.
4. Correr local:

```bash
npm run test:bdd
```

```bash
npx cucumber-js --tags "@grupo-04 and not @wip"
```

Para ver los snippets de los steps que faltan, sin filtrar por tag:

```bash
npx cucumber-js -p wip
```

## Control de cobertura en CI

`npm run test:bdd` escribe `newman/cucumber-report.json` y `newman/cucumber-report.html`.
Después, `npm run test:bdd:check:default` ([`scripts/check-cucumber-results.mjs`](../../scripts/check-cucumber-results.mjs))
**falla si no se ejecutó ningún escenario** (por ejemplo, porque todo quedó `@wip`) y publica el
detalle por escenario en el resumen del job. Los dos reportes se suben como artefacto
`cucumber-report` en cada ejecución del workflow *QA checks*.

El smoke UI (`npm run smoke`) corre todos los tests de Playwright con `@smoke` en el título. Si
ninguno coincide, Playwright falla con *No tests found*.

## Ambiente

Local y CI apuntan por defecto a `https://aiquaa-sandbox-web.vercel.app`. Para otro ambiente,
definir `BASE_URL` en `.env` (local) o como variable del repositorio `BASE_URL` (CI).
