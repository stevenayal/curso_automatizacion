# Semana 4 — Newman en GitHub Actions

## Implementación

Adaptación al grupo 05-01 del [PR #37](https://github.com/stevenayal/curso_automatizacion/pull/37)
y del [workflow de préstamos de la clase](https://github.com/stevenayal/curso_automatizacion/blob/main/.github/workflows/grupo-03-prestamos.yml).
El alcance de esta entrega es Postman/Newman, GitHub Actions e informe Python.

- Colección existente: `grupos/grupo-05-01-ahorros-depositos/postman/grupo-05-ahorros-y-depositos.postman_collection.json`.
- Workflow: `.github/workflows/grupo-05-01-ahorros-depositos.yml`.
- Comando local y CI: `npm run test:api:grupo-05-01`.
- Runner: `scripts/run-grupo-05-01-api.cjs`; carga `.env` y pasa `API_KEY` a la variable Postman `apiKey`.
- Reportes: `newman/grupo-05-01/newman-results.json`, `newman-junit.xml` e `INFORME_GRUPO_05_01_AHORROS_DEPOSITOS.pdf`.
- En Actions se agrega `newman-run.txt`. El JSON y JUnit se guardan con la API key ocultada.

Se ejecutan los 9 escenarios completos, en orden, incluyendo las consultas SQL
de precondición y persistencia. Una falla de Newman deja el job rojo; `always()`
permite generar el PDF y subir los archivos disponibles igualmente.
La pausa entre requests es de 2500 ms; las consultas `pm.sendRequest` también
consumen cuota. Se limita la concurrencia para reducir interferencias entre runs.

## Configuración de GitHub

En el repositorio de la entrega:

1. En **Settings → Environments**, verificar/crear el environment `api_key`, como en el ejemplo de préstamos.
2. En ese environment, configurar el secret **API_KEY** con la clave válida del curso 2. También puede usarse un secret de repositorio con ese nombre si no existe uno de environment que lo reemplace.
3. Opcional: en **Settings → Secrets and variables → Actions → Variables**, crear `GRUPO_05_01_BASE_URL`. Por defecto se usa `https://aiquaa-sandbox-api.vercel.app`.
4. Subir los cambios a la rama `grupo_5` y abrir el PR hacia `main`.
5. Abrir **Actions → Grupo 05-01 - Ahorros y Depositos API** y revisar la corrida iniciada por el push/PR.
6. Para repetir manualmente, usar **Run workflow** y elegir `grupo_5`. Si el workflow aún no existe en la rama por defecto, primero usar la corrida automática de push/PR; el botón manual puede no estar disponible todavía.
7. Descargar el artefacto `grupo-05-01-ahorros-depositos-reportes`. Se conserva 14 días; descargarlo antes de que venza.
8. Copiar el enlace del run (`https://github.com/<owner>/<repo>/actions/runs/<id>`) y agregarlo al PR junto con el PDF real generado.

Los PR desde forks no reciben los secrets del repositorio base. Para esos casos,
ejecutar el workflow en el repositorio del equipo con su secret configurado y
adjuntar ese enlace al PR. No usar `pull_request_target` para ejecutar código del PR.

## Ejecución local en PowerShell

Desde `curso_automatizacion/`, con Node.js 22 y Python 3.12 o superior:

```powershell
npm ci
# Solo si .env todavía no existe:
Copy-Item .env.example .env
# Editar .env y completar API_KEY. API_URL ya apunta a la sandbox.
npm run test:api:grupo-05-01
```

El runner lee `.env` automáticamente. Las variables del proceso tienen prioridad.
No agregar `--env-var` al comando npm ni guardar la clave en la colección.
Falta de credencial o pruebas fallidas devuelven código de salida 1.
Las pruebas crean y cancelan depósitos de la sandbox, y validan saldos y movimientos;
requieren los datos semilla del curso y no deben ejecutarse simultáneamente sobre la misma cuenta.

Para generar el informe local después de Newman:

```powershell
python -m pip install -r skills/postman-newman-skill/reporter/requirements.txt
python skills/postman-newman-skill/reporter/newman_report.py `
  --results newman/grupo-05-01/newman-results.json `
  --output newman/grupo-05-01/INFORME_GRUPO_05_01_AHORROS_DEPOSITOS.pdf `
  --banner skills/postman-newman-skill/reporter/assets/banner_portada.png `
  --logo-aiquaa skills/postman-newman-skill/reporter/assets/logo_aiquaa_circle.png `
  --logo-postman skills/postman-newman-skill/reporter/assets/logo_postman_clean.png `
  --api-version v2 `
  --repo-url https://github.com/stevenayal/curso_automatizacion `
  --author "Grupo 05-01 - Ahorros y Depositos"
```

Los reportes generados están excluidos de Git mediante `newman/`.
En Postman también puede importarse la colección y el environment de `postman/`
del grupo, configurar `apiKey` localmente y ejecutar **Run collection**, en orden.

## Qué pruebas existen hasta ahora

- **API:** 9 escenarios ejecutables en Newman con validaciones SQL. Las evidencias
  históricas de semana 3 registran 21 requests (incluyen consultas auxiliares),
  47 aserciones y 0 fallos. No prueban el estado actual de la API.
- **BDD:** el feature del grupo sigue marcado `@wip`; sus steps están pendientes.
  `npm run test:bdd` lo excluye. No corresponde afirmar que ejecuta estos escenarios.
- **UI:** la prueba del grupo es un placeholder con `test.skip`; todavía no valida
  un flujo real del módulo.

## Diagnóstico rápido

| Síntoma | Qué revisar |
|---|---|
| Falta API_KEY | `.env` local o secret `API_KEY` del environment `api_key`. |
| HTTP 401/403 | Vigencia de la clave y que corresponda al curso 2. |
| HTTP 429 | Cuota compartida; esperar antes de repetir y evitar otras corridas con la misma clave. |
| Precondiciones SQL fallidas | Disponibilidad de cuentas activas con saldo y datos semilla. |
| Aserción de tiempo fallida | Respuesta real de la API; no ocultar el fallo para que CI quede verde. |
| No hay PDF | Confirmar que existe JSON y revisar el paso de Python. |
| Workflow rojo con artefactos | Abrir JSON/PDF/JUnit: publicar evidencias no convierte las pruebas fallidas en exitosas. |

## Entrega pendiente de publicación

Usar [pr-semana-04.md](pr-semana-04.md) como cuerpo del PR y completar los enlaces
con valores reales. La guía personal queda en `newman/grupo-05-01/estudio/`, fuera
de la carpeta desechable y fuera del versionado. Ningún workflow, script o guía
de entrega depende de `tarea_semana_4/`.
