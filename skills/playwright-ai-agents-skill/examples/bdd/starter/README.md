# Base reproducible BDD + Playwright

Proyecto independiente: Cucumber ejecuta Gherkin en español con keywords en inglés,
TypeScript estricto y Chromium real. No necesita servicios externos ni IA al ejecutar.
Requiere Node.js 22 o 24 LTS y npm. Dependencias fijadas en package-lock.json.

```powershell
cd Z:\Proyectos\aiquaa-labs\playwright-ai-agents-skill\examples\bdd\starter
npm ci
npm run browsers:install
npm run check
```

En este equipo la descarga requiere los certificados de confianza de Windows.
Si npm muestra UNABLE_TO_VERIFY_LEAF_SIGNATURE, con Node 24:
`$env:NODE_USE_SYSTEM_CA = '1'` antes de instalar. No desactivar strict-ssl.
En Linux CI: `npx playwright install --with-deps chromium`.

## Comandos

| Comando | Resultado |
| --- | --- |
| npm test | Tres escenarios E2E, sin retries |
| npm run test:sandbox | E2E contra el sandbox: valida rechazo y login con un usuario activo consultado por API |
| npm run typecheck | Validación TypeScript |
| npm run test:dryrun | Catálogo y detección de steps undefined/ambiguous sin navegador |
| npm run test:smoke | Dos ejemplos de persistencia |
| npm run test:parallel | Suite con dos workers aislados |
| npm test -- --tags @TAR-02 | Caso negativo |
| npm run classify | Clasificación determinística del último JSON |
| npx cucumber-js --profile pr | Smoke o expresión de CUCUMBER_TAGS |

Para ver el navegador: `$env:HEADED = '1'; npm test`.
Para volver a headless: `Remove-Item Env:HEADED`.

## Estructura y configuración

- `features/tareas/F_TAREAS.feature`: intención y criterios de demostración.
- `steps/S_tareas.steps.ts`: glue y assertions de negocio.
- `pages/TasksPage.ts`: locators semánticos y acciones; fuente real: `app/index.html`.
- `support/world.ts`: Page Object lazy por escenario.
- `support/hooks.ts`: configuración de Playwright, browser por worker, contexto por escenario.
- `support/demo-server.ts`: servidor local automático en puerto libre, cierre al finalizar.
- `cucumber.js`: perfiles, reporter JSON/HTML, retry 0.
- `specs/tareas/PLAN_TAREAS.md`: alcance, riesgos y contrato de locators.
- `scripts/classify-failures.mjs`: copia del classifier de la skill, sin dependencias ni IA.

No hay `playwright.config.ts`: este runner es Cucumber y no lee ese archivo.
Las opciones de Chromium, contexto, timeouts y evidencias viven en `support/hooks.ts`.
La aplicación pública guarda tareas en localStorage; cada escenario parte de un contexto
vacío y comprueba persistencia al recargar. No se necesita auth.setup ni un backend ficticio.

`BASE_URL` permite conectar una aplicación que cumpla el mismo contrato; si no existe,
se arranca la demo local. Para escenarios autenticados, quitar `@sin-sesion` y proporcionar
`STORAGE_STATE` generado por el setup de la aplicación real. Nunca versionar sesiones.

## Resultados

`results/cucumber-report.json` y `results/cucumber-report.html` contienen el último run.
Los fallos adjuntan screenshot al reporte y guardan `results/traces/<uuid>.zip`.
Abrir un trace con `npx playwright show-trace results/traces/<uuid>.zip`.
Las trazas se capturan durante el escenario y se descartan si pasa; no hay videos permanentes.
`results/CLASIF_BDD_STARTER.json` se genera con `npm run classify`.
El dry-run no reemplaza el reporte E2E y puede devolver código 0 con undefined;
revisar el resumen y ejecutar siempre la suite real como hace `npm run check`.

Los ejemplos bancarios del directorio padre siguen siendo plantillas independientes:
no se cargan ni se ejecutan aquí. Requieren aplicación, seed y auth reales.
Esta demo verifica la base técnica; no acredita reglas de negocio de otra aplicación.

El caso `@sandbox` está separado de la demo local para que `npm test` sea reproducible sin red.
Sus locators se inspeccionaron en la interfaz real: campo accesible `Email`, botón `Ingresar` y
el mensaje exacto `Usuario no encontrado o inactivo.`. No usa credenciales ni modifica datos.

El login positivo consulta primero `POST https://aiquaa-sandbox-api.vercel.app/api/v1/sql/select`
con la consulta parametrizada de usuarios activos. La clave no se guarda en el proyecto:

```powershell
$env:SANDBOX_API_KEY = '<tu clave del sandbox>'
npm run test:sandbox
Remove-Item Env:SANDBOX_API_KEY
```

El lanzador usa el almacén de certificados de Windows/Linux mediante Node; no reduce la
validación TLS ni guarda la clave en los reportes versionados.

Referencias: [configuración Cucumber](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md),
[aislamiento Playwright](https://playwright.dev/docs/browser-contexts).
