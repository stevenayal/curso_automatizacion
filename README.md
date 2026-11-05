# Curso de Automatización de Pruebas — Grupo 2 (Banca)

Repositorio base del curso. Cada grupo trabaja en su propia carpeta y rama, y entrega por Pull
Request.

- **Sitio bajo prueba (UI):** <https://aiquaa-sandbox-web.vercel.app> (Curso 2 · Productos Bancarios, `/v2`). Local y CI usan la misma URL por defecto; se cambia con `BASE_URL` (`.env` o variable de repo en GitHub).
- **API de práctica:** <https://aiquaa-sandbox-api.vercel.app/docs> — ver [`docs/API-SANDBOX.md`](docs/API-SANDBOX.md)
- **Base de datos de pruebas:** Postgres, un usuario por grupo — ver [`docs/ACCESO-DB.md`](docs/ACCESO-DB.md)

## Grupos

| Grupo | Carpeta / Rama | Módulo |
|---|---|---|
| 01 | [`grupo-01-cuentas-bancarias`](grupos/grupo-01-cuentas-bancarias) | Cuentas, saldos, estados y movimientos |
| 02 | [`grupo-02-tarjetas`](grupos/grupo-02-tarjetas) | Tarjetas, límites, disponible, estado y vencimiento |
| 03 | [`grupo-03-prestamos`](grupos/grupo-03-prestamos) | Préstamos, cuotas, saldo, vencimientos y estado |
| 04 | [`grupo-04-transferencias-pagos`](grupos/grupo-04-transferencias-pagos) | Transferencias, beneficiarios, importes y estados |
| 05 | [`grupo-05-ahorros-depositos`](grupos/grupo-05-ahorros-depositos) | Ahorros, depósitos, tasas, plazos y vencimientos |
| 05-01 | [`grupo-05-01-ahorros-depositos`](grupos/grupo-05-01-ahorros-depositos) | Ahorros y depósitos — equipo de la rama `grupo_5` |

Un solo grupo por estudiante, máximo 3 integrantes. Lista de la clase en
[`docs/ROSTER.md`](docs/ROSTER.md).

Los requerimientos funcionales de cada módulo (un PDF por grupo, base para los escenarios BDD)
están en [`docs/requerimientos/`](docs/requerimientos/README.md).

> Préstamos y Ahorros/Depósitos todavía no tienen endpoints REST publicados: esos grupos
> arrancan por BDD + validación SQL contra la base. Detalle en el README de cada grupo.

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18 LTS o superior |
| npm         | incluido con Node.js |
| Git         | cualquier versión reciente |
| VS Code     | recomendado (con extensión Playwright) |
| Postman     | para la parte de API |

## Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd curso_automatizacion

# 2. Instalar dependencias
npm install

# 3. Instalar el navegador de Playwright
npx playwright install chromium

# 4. Configurar variables de entorno
cp .env.example .env
# Completar .env con la API key y las credenciales de DB del grupo (nunca subir .env)
```

## Cómo correr los tests

```bash
npm run test:bdd          # escenarios Gherkin con Cucumber
npm run test:e2e          # tests UI con Playwright (headless)
npm run test:e2e:headed   # tests UI con el navegador visible
npm run smoke             # solo el smoke test
npm run test:e2e:report   # abre el reporte HTML de Playwright
npm run test:api          # colección Postman via Newman
npm run verify            # BDD + UI
```

Si `npm run smoke` pasa sin errores, el entorno está bien configurado.

---

## Estructura del repositorio

```
curso_automatizacion/
├── .github/
│   ├── pull_request_template.md   # plantilla de PR
│   └── workflows/
│       ├── qa-checks.yml              # CI: BDD + smoke UI, y Newman a demanda
│       └── Y_AIQUAAECHO_jmeter.yml    # flujo de prueba: carga JMeter + informe PDF
├── ci/                            # plantilla de pipeline de referencia
├── docs/
│   ├── ACCESO-DB.md               # host, usuarios por grupo, cómo conectarse
│   ├── API-SANDBOX.md             # endpoints por grupo y sandbox SQL
│   ├── FLUJO_SEMANAL.md           # ramas, entregas y objetivo por semana
│   ├── ROSTER.md                  # lista de estudiantes
│   ├── TAREA-SQL-REST-DINAMICO.md # tarea del patrón pre-request/post-response
│   └── patron-postman-pre-post-request.pdf
├── evidence/                      # evidencias generales del curso
├── features/                      # .feature de ejemplo (los de cada grupo van en grupos/)
├── grupos/                        # un vertical slice por grupo (ver grupos/README.md)
├── playwright/pages/BasePage.ts   # clase base de los Page Objects
├── postman/                       # colección de referencia del sandbox + environment
├── skills/                        # skills de apoyo (BDD y Postman/Newman)
├── templates/                     # plantillas de bug report y plan de pruebas
├── tests/
│   ├── bdd/                       # step definitions y soporte de Cucumber
│   └── e2e/smoke.spec.ts          # smoke test inicial
├── .env.example
├── BACKLOG.md
├── ENTREGABLES.md                 # qué entrega cada grupo
├── cucumber.js
└── playwright.config.ts
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `BASE_URL` | URL del sitio bajo prueba (UI) |
| `API_URL` | URL base de la sandbox API |
| `API_KEY` | API key del curso (header `x-api-key`) |
| `GROUP_NAME` | Identificador del grupo (`grupo-01` … `grupo-05`) |
| `PGHOST` `PGPORT` `PGDATABASE` `PGUSER` `PGPASSWORD` | Conexión a la base de pruebas |

> **Importante:** nunca subir el archivo `.env` ni las passwords al repositorio.

## Convenciones

### Ramas
- Tarea grupal: `grupo-0N-modulo` (mismo nombre que la carpeta del grupo)
- Entrega semanal individual: `semana-N/<apellido>` (ej. `semana-1/bernal`)
- Nunca trabajar directo en `main`

### Archivos de test
- Specs Playwright: `<modulo>.spec.ts` en `grupos/grupo-0N-modulo/tests/e2e/`
- Page Objects: `NombrePage.ts` en `grupos/grupo-0N-modulo/playwright/pages/`, extendiendo
  `BasePage` de [`playwright/pages/BasePage.ts`](playwright/pages/BasePage.ts)
- Features: un `.feature` por módulo, en español, en `grupos/grupo-0N-modulo/features/`
- Los `.feature` sin steps implementados llevan el tag `@wip` (los excluye `cucumber.js`)

### Commits
- Español, tiempo presente: `agrega escenario de bloqueo de tarjeta`,
  `corrige selector del boton transferir`, `actualiza coleccion postman`

## Onboarding paso a paso

```bash
git clone <url-del-repo>
cd curso_automatizacion
npm install
npx playwright install chromium
cp .env.example .env          # completar con los datos del grupo
npm run smoke                 # verificar el entorno

git checkout -b grupo-0N-modulo
# trabajar dentro de grupos/grupo-0N-modulo/
git add .
git commit -m "agrega escenarios BDD del modulo"
git push origin grupo-0N-modulo
# abrir el Pull Request hacia main desde GitHub
```

## Entregas

Qué se entrega y cómo se evalúa: [`ENTREGABLES.md`](ENTREGABLES.md).
Calendario y flujo semanal: [`docs/FLUJO_SEMANAL.md`](docs/FLUJO_SEMANAL.md).
