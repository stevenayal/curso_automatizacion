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

Completar antes de escribir el primer escenario:

- **Objetivo:**
- **Supuestos:**
- **Riesgos:**
- **Cobertura incluida:**
- **Cobertura excluida:**

## API y datos

| Capa | Recursos |
|---|---|
| REST (v2) | `GET\|POST /api/v2/depositos` · `GET /api/v2/depositos/{id}` · `POST /api/v2/depositos/{id}/cancelar` · `GET\|POST /api/v2/ahorros` · `GET\|PUT\|DELETE /api/v2/ahorros/{id}` · `POST /api/v2/ahorros/{id}/aportar` |
| SQL sandbox (v2) | `POST /api/v2/sql/select` sobre el schema `qa_training_v2` (`cuentas`, `movimientos`, `ahorros`, `depositos`, …) |
| DB directa | usuario `qa_g05` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance (sección de arriba completa)
- [x] BDD — `features/ahorros-depositos.feature` (happy path, negativo y edge case)
- [x] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/ahorros-depositos.spec.ts` con Playwright
- [x] Evidencias de Newman en `evidence/semana-03/`: `newman-run.txt` y `newman-junit.xml`. El reporte `newman-results.json`, si se genera, queda excluido del versionado.
- [ ] CI/CD verde
- [ ] PR de `grupo_5` hacia `main` usando la plantilla del repo

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
