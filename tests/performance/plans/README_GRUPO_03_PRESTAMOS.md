# Grupo 03 — Préstamos: plan de pruebas JMeter

| Archivo | Qué es |
|---|---|
| `P_GRUPO_03_PRESTAMOS.jmx` | Plan de pruebas (un solo plan para todos los perfiles, parametrizado con `${__P(...)}`) |
| `D_GRUPO_03_PRESTAMOS.csv` | Datos variables de cada solicitud: monto, tasa y plazo |
| `../properties/grupo-03.properties` | Perfil de carga ligera (baseline) contra la sandbox v2 |

## Qué prueba

| Paso | Endpoint | Datos | Validaciones |
|---|---|---|---|
| setUp | `POST /api/v2/usuarios` | email `${__UUID()}` y documento con `${__time()}` (únicos por corrida) | `201`; el `id` se extrae con JSON Extractor y se comparte por propiedad |
| 1. Creación | `POST /api/v2/prestamos` | `usuarioId` del setUp + una fila del CSV por iteración | `201`, `estado = solicitado`, monto y plazo iguales a la fila CSV; `$.data.id` → `prestamoId` |
| 2. Consulta | `GET /api/v2/prestamos/${prestamoId}` | ID correlacionado del paso 1 | `200`; id, estado, usuario, monto, tasa y plazo coinciden con lo creado |
| 3. Limpieza | `DELETE /api/v2/prestamos/${prestamoId}` | ID correlacionado | `200`/`204` (un préstamo en `solicitado` se puede borrar) |
| tearDown | `DELETE /api/v2/usuarios/{id}` | usuario del setUp | `200`/`204`/`409` |

En todos los samplers del grupo principal se aplica un umbral de tiempo de respuesta
(`maxResponseMs`, 3000 ms por defecto; es un umbral de práctica, no un SLA contractual).

**Datos dinámicos:** no se usan IDs fijos. El usuario se crea en cada corrida y el ID del préstamo se
toma de la respuesta del POST (correlación), así el plan funciona aunque la sandbox se resetee.

**Rate limit:** la sandbox permite 30 req/min por `x-api-key`. El `Constant Throughput Timer` limita
el grupo principal a 20 req/min para medir latencia sin que los `429` ensucien el resultado.

## Cómo ejecutarlo

La API key nunca se guarda en el plan: se pasa por variable de entorno `API_KEY` o con `-JapiKey`.

**GUI (para revisarlo):** abrir el `.jmx` en JMeter 5.6.3, en *Variables del plan* no tocar nada, y
ejecutar con la key en la línea de comandos que abre JMeter:

```bash
jmeter -JapiKey=TU_API_KEY -t tests/performance/plans/P_GRUPO_03_PRESTAMOS.jmx
```

Ver el resultado en *View Results Tree*.

**Headless (como en CI):**

```bash
cd tests/performance/plans
jmeter -n -t P_GRUPO_03_PRESTAMOS.jmx \
  -q ../properties/grupo-03.properties \
  -JapiKey=TU_API_KEY \
  -l R_GRUPO_03_PRESTAMOS.jtl -e -o informe-html
```

Se corre desde la carpeta `plans/` para que el CSV se encuentre con la ruta relativa (o pasar
`-JcsvFile=<ruta absoluta>`).

## Perfil por defecto (baseline)

1 hilo, 4 iteraciones (una por fila del CSV), 20 req/min: 1 + 4 × 3 + 1 = **14 requests** por corrida.
Para otros perfiles se cambian `threads`, `rampup`, `loops` y `duration` en el `.properties` o con
`-J`, sin editar el XML.

## Pipeline (CI/CD) — `.github/workflows/Y_GRUPO_03_PRESTAMOS_jmeter.yml`

Corre solo en GitHub Actions; no hace falta instalar JMeter en la máquina local.

- **Cuándo corre:** en cada PR que toque el plan, el CSV, el `.properties` o el workflow, y a mano
  desde *Actions → Grupo 03 - Prestamos JMeter... → Run workflow* (con hilos, iteraciones y ritmo
  configurables).
- **Qué hace:** instala Java 17 + JMeter 5.6.3, ejecuta el plan headless con el secret `API_KEY`,
  captura el dashboard público de Grafana, genera `INFORME_PERF_GRUPO_03_PRESTAMOS.pdf` con
  `skills/jmeter-skill/reporter/jmeter_report.py` y publica todo como artefacto (JTL, dashboard HTML,
  log, PDF, captura de Grafana, `resumen.json`, `limpieza.json`).
- **Cuándo queda en rojo:** si el P95 supera 3000 ms o el error rate supera 1 %, si alguna iteración
  no completó POST `201` → GET `200` → DELETE `200/204`, si algún préstamo creado quedó activo en la BD
  (verificado por `POST /api/v2/sql/select`) o si no se pudo capturar Grafana.
