# Guía de uso — jmeter-skill

## Instalación

```bash
npx skills add aiquaa-labs/jmeter-skill
```

Para agentes específicos:

```bash
npx skills add aiquaa-labs/jmeter-skill -a cursor
npx skills add aiquaa-labs/jmeter-skill -a windsurf
npx skills add aiquaa-labs/jmeter-skill -a cline
```

---

## Instalar JMeter localmente

```bash
# Windows — descargar binario desde:
# https://jmeter.apache.org/download_jmeter.cgi
# Extraer y agregar /bin al PATH

# Ubuntu / Debian
sudo apt-get install -y default-jdk
wget https://downloads.apache.org/jmeter/binaries/apache-jmeter-5.6.3.tgz
tar xzf apache-jmeter-5.6.3.tgz
export JMETER_HOME=$PWD/apache-jmeter-5.6.3
export PATH=$JMETER_HOME/bin:$PATH
jmeter --version
```

---

## Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `/jmeter:generate` | Genera `.jmx` property-driven desde spec, curl, código fuente, URL o grupo del sandbox |
| `/jmeter:csv` | Genera o actualiza archivo CSV de datos de prueba |
| `/jmeter:perfil` | Calcula los valores `-J` de un perfil (carga/estrés/pico/resistencia/escalabilidad) |
| `/jmeter:fix` | Analiza y repara plan fallido o resultado anómalo |
| `/jmeter:ci` | Genera pipeline Azure Pipelines o GitHub Actions |
| `/jmeter:run` | Muestra el comando de ejecución correcto para el perfil elegido |
| `/jmeter:report` | Analiza `.jtl` y describe qué incluirá el PDF, con comparación a baseline si corresponde |

La skill siempre pregunta antes de generar. En orden de prioridad (ver `SKILL.md` para el
detalle completo):
1. URL base de la API (o número de grupo del sandbox)
2. Endpoint(s) a estresar
3. Perfil de carga (baseline/carga/estrés/pico/resistencia/escalabilidad) — ver `references/perfiles.md`
4. Rate limit conocido (obligatorio si el sistema es el sandbox del curso)
5. Autenticación (`x-api-key`, Bearer, API Key, Basic, ninguna)
6. Body del request (para POST/PUT/PATCH)
7. Datos variables — CSV, User Defined Variables, o funciones de generación única
8. Correlación (si hay una secuencia de requests)
9. Temporizadores y pacing (golpe instantáneo vs Constant Throughput Timer)
10. Assertions y SLA (status, response time, body)
11. Línea base para comparar (`.jtl` de una corrida `baseline` previa)
12. Metadata del informe (nombre, versión, repo, autor — opcionales)

---

## Perfiles de carga — property-driven

Ya no hay un único escenario fijo. Un solo `.jmx` cubre los 5 tipos de prueba del temario
PtU CPTJM más línea base — ver `references/perfiles.md` para valores y comandos de cada uno.

```bash
# baseline — referencia
jmeter -n -t P_MI_API.jmx -l R_BASELINE.jtl -Jperfil=baseline -Jthreads=1 -Jrampup=0 -Jloops=10

# carga — concurrencia esperada
jmeter -n -t P_MI_API.jmx -l R_CARGA.jtl \
  -Jperfil=carga -Jthreads=10 -Jrampup=30 -Jloops=-1 -Jduration=120
```

`loops=-1` + `duration=N` = modo por tiempo (carga/resistencia). `loops=N` finito con
`duration` grande (default) = modo por iteraciones (baseline/estrés). Ver `SKILL.md` sección
Thread Group para el detalle de por qué ambos modos conviven en el mismo XML.

---

## Uso rápido — ejecución local

### Correr el plan de ejemplo contra el sandbox

```bash
jmeter -n \
  -t examples/P_SANDBOX_API.jmx \
  -l results/R_SANDBOX_API.jtl \
  -e -o results/dashboard/ \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -Jport=443 -Jprotocol=https \
  -JapiKey=$SANDBOX_API_KEY \
  -JcsvData=examples/D_SANDBOX_API.csv \
  -Jperfil=carga -Jthreads=10 -Jrampup=30 -Jloops=-1 -Jduration=120
```

### Con más heap para 1000 threads

```bash
JVM_ARGS="-Xms2g -Xmx4g" jmeter -n \
  -t tests/jmeter/P_MI_API.jmx \
  -l results/R_MI_API.jtl \
  -e -o results/dashboard/
```

### Generar solo el dashboard HTML desde un .jtl existente

```bash
jmeter -g results/R_MI_API.jtl -o results/dashboard/
```

---

## CSV de datos — convención

El archivo de datos se llama `D_NOMBRE_DE_API.csv`.
Primera fila = headers. Los headers son los nombres de las variables en JMeter (`${variable}`).

```csv
usuarioId,producto,precioUnitario
1,Teclado,97.72
2,Monitor,8.63
```

Reglas:
- Filas suficientes para el perfil más largo (JMeter recicla con `recycle=true`, pero más
  filas = menos repetición de combinaciones)
- Sin comillas salvo que el valor contenga comas
- Encoding UTF-8 sin BOM
- Va en `tests/jmeter/data/D_MI_API.csv`
- Campos con restricción `UNIQUE` en el sistema bajo prueba (ej. `usuarios.email` en el
  sandbox) **no van fijos en el CSV** — generarlos con `${__UUID()}` en el body del sampler,
  o el segundo loop sobre la misma fila da 400 `EXECUTION_ERROR`

---

## Generar el informe PDF

### Instalación de dependencias

```bash
pip install reportlab pandas
```

### Uso básico

```bash
python reporter/jmeter_report.py \
  --results results/R_CARGA.jtl \
  --api-name "Mi API" \
  --perfil carga \
  --threads 10 \
  --loops -1
```

### Uso completo — con SLA y comparación a línea base

```bash
python reporter/jmeter_report.py \
  --results   results/R_CARGA.jtl \
  --output    results/INFORME_PERF_MI_API_CARGA.pdf \
  --api-name  "Mi API" \
  --perfil carga \
  --threads   10 \
  --loops     -1 \
  --baseline  results/R_BASELINE.jtl \
  --sla-error-rate 2 \
  --sla-p95 800 \
  --sla-throughput 20 \
  --api-version "v1.2.0" \
  --repo-url "https://dev.azure.com/org/repo" \
  --author   "Juan Pérez — juan@empresa.com"
```

### Qué contiene el informe

- Portada con estadísticas reales de la corrida (total requests = filas del `.jtl`, no
  `threads × loops` — ese producto no aplica en perfiles por duración)
- Tabla de percentiles: mínimo, mediana, P90, P95, P99
- **Comparación con línea base** (% de cambio en avg/p95/error rate) si se pasa `--baseline`
- Veredicto automático, SLA configurable por flag:
  - `DENTRO DE SLA` → error rate ≤ `--sla-error-rate` y P95 ≤ `--sla-p95` (y throughput ≥
    `--sla-throughput` si se dio)
  - `DEGRADACIÓN DETECTADA` → por encima de cualquiera de esos umbrales
  - `COLAPSO BAJO ESTRÉS` → error rate > 5× el SLA (mínimo 10%)
- Detalle por sampler: total, errores, error %, avg, P90, P95, max
- Top 10 errores por sampler y código HTTP
- Footer con autor y `Powered by skill jmeter · aiquaa.com`

---

## Azure Pipelines — puntos clave

El pipeline estándar (`Y_*_jmeter.yml`) incluye:

1. Instalación de Java + JMeter desde binario
2. Ejecución headless con `jmeter -n`
3. Generación de dashboard HTML (`-e -o`)
4. Generación de informe PDF (`jmeter_report.py`) con `condition: always()`
5. Upload de artefactos (JTL + PDF + dashboard)

Variables sensibles se pasan como secrets de Azure/GitHub — nunca como `-J` en texto plano
en el propio YAML si el pipeline es público:
```yaml
env:
  SANDBOX_API_KEY: $(apiKey)      # secret en Pipeline > Variables
```

En el .jmx se leen como:
```xml
<stringProp name="Argument.value">${__P(apiKey,)}</stringProp>
```

El perfil también se parametriza por variable de pipeline (`perfil: carga` en
`Y_EXAMPLE_API_jmeter.yml`) — correr `carga` en cada push, reservar `estrés`/`resistencia`/
`escalabilidad` para un job manual o con aprobación.

---

## Convención de archivos

```
tests/jmeter/
  P_MI_API.jmx              ← plan de prueba
  data/
    D_MI_API.csv            ← datos de prueba
results/
  R_MI_API.jtl              ← resultados crudos (generado por JMeter)
  dashboard/                ← dashboard HTML (generado por -e -o)
  INFORME_PERF_MI_API.pdf   ← informe PDF (generado por reporter)
azure-pipelines/
  Y_MI_API_jmeter.yml       ← pipeline Azure
```

---

## Stack aiquaa — cuándo usar cada skill

| Necesidad | Skill |
|-----------|-------|
| Contrato del entorno de práctica del curso | `sandbox-skill` |
| Pruebas funcionales con GUI Postman | `postman-newman-skill` |
| Pruebas funcionales declarativas, CI-native | `hurl-skill` |
| Pruebas E2E de navegador + API | `playwright-skill` |
| BDD — Gherkin + Cucumber | `bdd-skill` |
| Pruebas de rendimiento — carga, estrés, pico, resistencia, escalabilidad | `jmeter-skill` |

---

## Créditos

Creado por [aiquaa](https://aiquaa.com/) — *Saber es calidad*
