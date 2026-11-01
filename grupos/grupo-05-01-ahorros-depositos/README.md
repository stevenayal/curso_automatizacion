# Grupo 05-01 — Ahorros y Depósitos

**Módulo:** Ahorros, depósitos, tasas, plazos y vencimientos
**Rama:** `grupo_5`
**Carpeta:** `grupos/grupo-05-01-ahorros-depositos`

> **Nota:** los endpoints REST de ahorros/depósitos ya están publicados en la **v2** de la sandbox
> (`/api/v2/ahorros`, `/api/v2/depositos`). La fuente de verdad del contrato es `GET /api/v2/docs`.

## Integrantes

Máximo 3. Completar con nombre y email (ver [`docs/ROSTER.md`](../../docs/ROSTER.md)):

| # | Nombre y apellido | Email |
|---|---|---|
| 1 | Marcos Flores |  |
| 2 | Jackelin Peña |  |
| 3 | Ada Melgarejo |  |

## Alcance

- **Objetivo:** describir y trazar el comportamiento de ahorros programados y
  depósitos a plazo del Grupo 05-01 según los requerimientos CIT v1.0, distinguiendo
  las reglas de la API de las validaciones adicionales de la web.
- **Supuestos:** se trabaja con la sandbox del curso 2 y su contrato API v2.
  La suite web requiere un cliente activo y, para validar el importe mínimo,
  una cuenta elegible con saldo suficiente. Los dos flujos positivos crean
  clientes y cuentas exclusivos mediante la API oficial y una API key local.
- **Riesgos:** los datos compartidos pueden cambiar durante las comprobaciones
  de saldos y movimientos. Las operaciones crean, debitan o inmovilizan fondos;
  algunos casos de ahorro no permiten recuperarlos desde la API. Se requieren
  datos aislados y una estrategia de limpieza antes de automatizarlos.
- **Cobertura incluida:** diseño de 59 escenarios que representan 99 casos
  (84 de API y 15 de web diseñados; los 15 web están automatizados),
  con casos positivos, negativos y de frontera para
  RF-G5-01 a RF-G5-10, RF-G5-TK y las reglas transversales de acceso y de web.
  La entrega incluye la feature, su trazabilidad con el CIT y la
  validación de sintaxis Gherkin. La suite de la semana 6 conecta 15 casos web
  con Cucumber, Playwright y Page Objects.
- **Cobertura excluida:** según la sección 1 del CIT (página 3), no se probarán
  como funcionalidades disponibles el débito automático mensual de aportes;
  el retiro o rescate del dinero de un plan de ahorro; el pago de intereses
  sobre el ahorro; el vencimiento automático y la renovación de depósitos;
  la capitalización de intereses; las penalidades por cancelación anticipada;
  ni los impuestos. El anexo normativo orientativo del CIT tampoco se utiliza
  como criterio de aprobación. Se mantienen las comprobaciones del comportamiento
  documentado, como la ausencia de acreditación automática y de penalidades.

**Estado de automatización BDD:** los 15 casos web tienen steps y Page Objects;
los 84 casos de API conservan `@wip`. Las pruebas existentes de Newman y JMeter tienen su
propio alcance y no acreditan la ejecución de los casos BDD pendientes.

## API y datos

| Capa | Recursos |
|---|---|
| REST (v2) | `GET\|POST /api/v2/depositos` · `GET /api/v2/depositos/{id}` · `POST /api/v2/depositos/{id}/cancelar` · `GET\|POST /api/v2/ahorros` · `GET\|PUT\|DELETE /api/v2/ahorros/{id}` · `POST /api/v2/ahorros/{id}/aportar` |
| SQL sandbox (v2) | `POST /api/v2/sql/select` sobre el schema `qa_training_v2` (`cuentas`, `movimientos`, `ahorros`, `depositos`, …) |
| DB directa | usuario `qa_g05` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance (sección de arriba completa)
- [x] BDD — `features/ahorros-depositos.feature` (happy path, negativo y edge case)
- [x] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [x] UI — 15 casos BDD conectados con Cucumber + Playwright y Page Objects
- [x] Evidencias de Newman en `evidence/semana-03/`: `newman-run.txt` y `newman-junit.xml`. El reporte `newman-results.json`, si se genera, queda excluido del versionado.
- [ ] CI/CD verde
- [ ] PR de `grupo_5` hacia `main` usando la plantilla del repo

## Semana 4 — GitHub Actions y Newman

El workflow [grupo-05-01-ahorros-depositos.yml](../../.github/workflows/grupo-05-01-ahorros-depositos.yml)
ejecuta los 9 escenarios de la colección existente, genera JSON y JUnit, convierte
los resultados a PDF con Python y publica los reportes como artefactos por 14 días.
Se activa con push a `grupo_5`/`main` que cumpla los filtros de archivos del workflow,
o manualmente desde Actions.

Para ejecutar desde la raíz del repositorio:

```powershell
npm ci
# Crear .env a partir de .env.example y completar API_KEY con la clave del curso 2.
npm run test:api:grupo-05-01
```

Los reportes locales quedan en `newman/grupo-05-01/`, excluido de Git.
La ejecución real de Actions y el PR deben enlazarse al completar la entrega;
el checklist de CI/CD queda pendiente hasta verificar una corrida verde.

## BDD — Requerimientos CIT

La [feature del grupo](features/ahorros-depositos.feature) se actualizó a partir
del documento **Ahorros y Depósitos — Requerimientos funcionales, Grupo 5,
CIT, versión 1.0, 10 de octubre de 2026**.
La [trazabilidad BDD](docs/bdd-api.md) relaciona los casos con RF-G5-01 a RF-G5-10,
RF-G5-TK y las reglas de API y web del documento.

Son 59 definiciones de escenario y 99 casos al expandir sus ejemplos. La suite
web de la semana 6 conecta 15 casos; los otros 84 conservan `@wip` mientras se
implementan sus steps y fixtures. La validación de sintaxis de los pendientes
no representa ejecución de pruebas contra la aplicación.

La feature usa `@grupo-05-01` para identificar nuestro grupo. La
[configuración general de Cucumber](../../cucumber.js) carga sus steps y soporte
desde `tests/bdd/` de la raíz, como los otros grupos. Para ejecutar únicamente
nuestros casos, usar el filtro `@grupo-05-01 and @web and not @wip`.

## Semana 6 — Cucumber con Playwright

Los IDs `S6-G05-01-01` a `S6-G05-01-08` enlazan los escenarios de la feature
con los steps y el reporte. Se comprueban el
rechazo de 999999 PYG sin enviar un POST, el catálogo de plazos y las tasas
sugeridas para 30 y 1095 días, incluyendo que el campo sea editable.
La ampliación agrega 8 casos: cuentas elegibles por titular, cinco validaciones
de ahorro (meta mínima, aporte mayor a la meta, más de 120 meses y límites del
nombre) y saldo insuficiente en aporte y depósito.

Los dos ejemplos de `S6-G05-01-07` constituyen y cancelan depósitos desde la
pantalla: 1.000.000 PYG al 3,5 % durante 30 días y 2.000.000 PYG al 0 % durante
90 días. Cada uno comienza con 5.000.000 PYG propios, comprueba el débito,
el estado activo y el interés proyectado, y cancela el mismo día. Exige interés
pagado cero, un único débito y un único reintegro, y el saldo inicial exacto.
El caso `S6-G05-01-08` comprueba que no se pueda eliminar un ahorro activo con
saldo: botón deshabilitado, aviso de bloqueo, ausencia de DELETE y conservación
del estado del plan, su saldo acumulado y el saldo de la cuenta asociada.
Consulta un plan existente del cliente con saldo positivo; si no existe,
informa un problema de datos, sin crear aportes que la API no permite rescatar.
La suite contiene seis casos positivos y nueve negativos.

El acceso usa `elena.gomez@bancoqa.com` (variable opcional
`GRUPO_05_01_EMAIL`). La sesión se prepara una vez y se reutiliza en memoria;
cada caso recibe un contexto nuevo. No se envía la API key local a la web.
Trece casos consultan datos existentes y bloquean cualquier intento
de escritura al proxy, sin modificar las cuentas de Elena. Las cuentas y planes se descubren
mediante GET; el aporte exige un plan activo asociado a una cuenta elegible y
los importes de rechazo se calculan a partir del saldo leído, sin IDs fijos.

Los dos flujos positivos requieren `API_KEY` del curso 2 en el `.env` local.
El fixture usa esa clave únicamente contra `https://aiquaa-sandbox-api.vercel.app`;
la creación y cancelación bajo prueba se realizan en la web con la sesión normal.
La guarda autoriza una creación con los datos propios exactos y una cancelación
del ID recién creado. No simula las respuestas ni permite operar sobre otros datos.
Se reutiliza el Page Object de depósitos existente en la raíz, sin modificarlo.

El hook de limpieza cancela un depósito propio que haya quedado activo si falla
un paso y registra el resultado en el HTML. Después de verificar la devolución
del saldo, retira el fondeo sintético y da de baja la cuenta y el cliente de prueba.
Los depósitos cancelados permanecen como historial. Un resultado de escritura
incierto conserva los recursos y hace fallar la prueba para su recuperación.
Si la cancelación cruza la fecha del servidor y genera interés, la comprobación
del saldo falla: no se ajusta el resultado esperado para ocultarlo.

Desde la raíz del repositorio:

```powershell
npm ci
npx playwright install chromium
npx tsc --noEmit
npx cucumber-js --tags "@grupo-05-01 and @web and not @wip" --dry-run
npx cucumber-js --tags "@grupo-05-01 and @web and not @wip" `
  --format json:grupos/grupo-05-01-ahorros-depositos/results/semana-06/cucumber-report.json `
  --format html:grupos/grupo-05-01-ahorros-depositos/results/semana-06/cucumber-report.html
```

Si se utiliza Google Chrome instalado, configurar `$env:PLAYWRIGHT_CHANNEL='chrome'`
antes de ejecutar. Para ver el navegador, agregar `$env:HEADED='1'`.

Los steps y el soporte siguen la estructura compartida: `tests/bdd/steps/` y
`tests/bdd/support/` en la raíz. Los Page Objects y el HTML de entrega permanecen
en `playwright/pages/` y `evidence/semana-06/` de nuestra carpeta.
La configuración general genera sus reportes en `results/` de la raíz; el
comando anterior agrega las copias de trabajo en `results/semana-06/` dentro
del grupo. Ambas carpetas de resultados están excluidas de Git por la regla existente.
La ejecución local del 31 de octubre de 2026 aprobó **15 casos y 67 pasos**.
Se registraron cuatro escrituras de negocio autorizadas desde el navegador
(dos creaciones y dos cancelaciones), ninguna escritura no autorizada y limpieza
completa de ambos fixtures. El HTML de entrega es:

- [Ejecución final: 15 casos aprobados](evidence/semana-06/cucumber-report.html).

## JMeter — Depósitos

El [plan JMX](../../tests/performance/plans/P_GRUPO_05_01_DEPOSITOS.jmx) usa el
[CSV](../../tests/performance/plans/D_GRUPO_05_01_DEPOSITOS.csv) para crear un depósito,
listar por usuario y estado, consultar el ID extraído de la creación y cancelarlo
al finalizar. El CSV cubre los filtros `activo`, `vencido` y `cancelado`.

Desde la raíz del repositorio, con JMeter 5.6+ en el `PATH` y Java 17 configurado:

```powershell
# Leer la clave local sin guardarla en el JMX ni en el CSV.
$env:API_KEY = ((Get-Content .env | Where-Object { $_ -match '^API_KEY=' }) -replace '^API_KEY=', '').Trim()
$resultados = "newman/grupo-05-01/jmeter/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $resultados | Out-Null
jmeter -n -t tests/performance/plans/P_GRUPO_05_01_DEPOSITOS.jmx `
  -l "$resultados/resultados.jtl" -j "$resultados/jmeter.log" `
  -e -o "$resultados/dashboard"
```

Los valores predeterminados son 1 usuario, 3 iteraciones y 20 solicitudes/minuto
compartidas: 12 solicitudes HTTP en total. Se pueden ajustar con `-Jthreads=...`,
`-Jrampup=...`, `-Jloops=...` y `-Jthroughput=...`. El tiempo máximo de respuesta
se configura con `-JmaxResponseMs=3000` como umbral de la práctica.
Mantener el CSV junto al JMX o indicar `-JcsvFile` con su ruta absoluta.
El JTL y el dashboard HTML quedan en `newman/`, excluido de Git.

## Rendimiento por pipeline y Grafana

El workflow `Y_GRUPO_05_01_DEPOSITOS_jmeter.yml` ejecuta el plan de depósitos,
captura el Grafana público y genera el PDF con la skill JMeter del repositorio.
Usa 2 usuarios, 3 iteraciones y 30 solicitudes/minuto compartidas: 24 solicitudes
HTTP. Verifica las respuestas, los umbrales y la cancelación de los depósitos.
Los umbrales de la práctica son P95 de hasta 3000 ms y errores de hasta 1 %;
Grafana muestra métricas compartidas de la sandbox.

En GitHub, configurar `API_KEY` en el entorno `api_key`. El workflow se ejecuta
con push a `grupo_5` que cumpla sus filtros de archivos, o manualmente desde Actions.
Publica el PDF, JTL,
dashboard HTML, captura y resumen como artefactos durante 14 días.

Newman y JMeter comparten la cola `grupo-05-01-sandbox` para ejecutarse de forma
secuencial. Ambos usan push como disparador automático para evitar la duplicación
por pull request. Los workflows compartidos del curso conservan sus propios disparadores.

Para usar esta carga localmente, agregar
`-q tests/performance/properties/grupo-05-01.properties` al comando JMeter anterior.
