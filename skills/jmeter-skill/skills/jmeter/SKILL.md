---
name: jmeter
description: >
  Pruebas de rendimiento dinámicas con Apache JMeter, alineadas al temario PtU
  Certified Performance Tester con JMeter (CPTJM). Genera planes .jmx
  property-driven (${__P(...)}) con 5 perfiles de carga — carga, estrés, pico,
  resistencia, escalabilidad — más línea base, correlación (regex/JSON
  extractor), parametrización (CSV + funciones), temporizadores, controladores
  lógicos, aserciones y reportes PDF con comparación contra línea base y SLA
  configurable. Compatible con el stack aiquaa (caveman mode incluido) y con
  el entorno de práctica del curso (ver skill sandbox).
  Usar cuando el usuario mencione "jmeter", "prueba de carga", "prueba de
  estrés", "prueba de pico", "resistencia", "escalabilidad", "rendimiento",
  "threads", "usuarios concurrentes", "throughput", "correlación", "regex
  extractor", "línea base", ".jmx", "PtU", "CPTJM", o pida simular tráfico
  contra una API.
---

JMeter plan write. Claude generate config. Terse output. No fluff.

---

## ¿Qué es JMeter en este contexto?

Apache JMeter ejecuta pruebas de rendimiento contra APIs HTTP/HTTPS. Esta skill sigue el
temario **PtU Certified Performance Tester con JMeter (CPTJM)** — ver
`references/ptu-cptjm.md` para el mapa LO1–LO23 → sección de esta skill.

A diferencia de un escenario fijo, el plan de esta skill es **property-driven**: un solo
`.jmx` se reconfigura por línea de comandos (`-J`) para representar cualquiera de los 5 tipos
de prueba del temario, sin tocar XML. Ver `references/perfiles.md` para los 5 perfiles.

```
threads, rampup, loops, duration, throughput  →  todo por -J
1 .jmx  →  baseline | carga | estrés | pico | resistencia | escalabilidad
```

Los planes de prueba se generan como archivos `.jmx` (XML). Los datos de prueba van en
archivos `.csv`. Los resultados se exportan como `.jtl` y se convierten en PDF con el
reporter Python.

---

## Context Intake — SIEMPRE ejecutar primero

**Antes de generar cualquier archivo, recolectar contexto.** Sin excepciones.
El usuario puede dar nada, una URL, un curl, un contrato OpenAPI o código fuente.
Identificar qué falta y preguntar — una pregunta a la vez, en orden de prioridad.
Nunca generar el .jmx sin tener al menos URL base + un endpoint.

Si el sistema bajo prueba es el sandbox del curso, resolver base URL, endpoints y auth
directo desde la skill `sandbox` en vez de preguntarlos — solo preguntar el perfil y la
decisión de rate limit.

---

### Paso 1 — Detectar qué ya dio el usuario

| Señal | Qué aporta |
|-------|-----------|
| "grupo N del sandbox" | resolver endpoint(s) y auth desde skill `sandbox` |
| URL completa (`https://api.ejemplo.com/v1/users`) | baseUrl + path del endpoint |
| Comando curl | método + url + headers + body |
| Archivo `.jmx` existente | plan de prueba previo — expandir sin pisar |
| Archivo `.csv` de datos | dataset de usuarios, tokens, IDs a usar |
| Spec OpenAPI / Swagger | contrato completo: endpoints, schemas |
| Resultados `.jtl` previos | fallos o métricas a analizar, o línea base para comparar |
| "quiero probar mi API" sin más | casi nada — preguntar |

---

### Paso 2 — Preguntar lo que falta (una pregunta a la vez)

#### Prioridad 1 — La URL base (siempre obligatoria)

> ¿Cuál es la URL base de la API?
> Ejemplo: `https://api.miempresa.com` o `http://localhost:8080`
>
> Si es el sandbox del curso, decime el número de grupo y resuelvo el resto.

No continuar sin esto.

#### Prioridad 2 — El endpoint a estresar

> ¿Qué endpoint querés estresar?
>
> - Método + path: `POST /api/v1/ordenes`, `GET /api/v1/facturas`
> - ¿Es un solo endpoint o una secuencia? (crear → consultar → cerrar)
>
> Si son varios en secuencia, uso un Transaction Controller (ver LO14).

#### Prioridad 3 — Perfil de carga

> ¿Qué tipo de prueba? Ver `references/perfiles.md` para el detalle de cada uno:
>
> - **baseline** — 1 usuario, referencia de mejor tiempo posible
> - **carga** — concurrencia esperada del sistema
> - **estrés** — 2 a 5× la carga esperada, buscar el punto de quiebre
> - **pico** — ráfaga corta, evaluar recuperación
> - **resistencia** — carga sostenida por horas, buscar fugas
> - **escalabilidad** — escalones crecientes de carga
>
> ¿Cuál corremos, o generamos el plan property-driven para poder elegir en el momento
> de ejecutar (recomendado — un solo `.jmx` sirve para los 6)?

Si el usuario no da valores de threads/rampup/loops/duration, usar los defaults de
`references/perfiles.md` para el perfil elegido y confirmarlos en el paso 3.

#### Prioridad 4 — Rate limit (obligatoria si el sistema es el sandbox del curso)

> El sandbox limita 30 req/min **por API key**. Con los threads que pediste, ¿repartimos
> varias keys (una por grupo de hilos) o dejamos una sola key y medimos en qué punto
> aparecen los 429 como parte del resultado?
>
> Ver `references/perfiles.md` sección "rate limit del sandbox" antes de decidir.

Si el sistema NO es el sandbox, preguntar si existe algún rate limit conocido — nunca asumir
que no hay.

#### Prioridad 5 — Autenticación

> ¿La API requiere autenticación?
>
> - Sin auth (pública)
> - `x-api-key` en header (caso del sandbox — ver skill `sandbox`)
> - Bearer token estático
> - Bearer token dinámico (endpoint de login que devuelve el token — requiere correlación)
> - Basic Auth
> - Otro

Si Bearer dinámico: el primer sampler es el login, capturar el token con JSON/Regex Extractor
(LO10-11) y usarlo como `${token}` en los siguientes samplers.

#### Prioridad 6 — Body del request (para POST / PUT / PATCH)

> Para `<MÉTODO> <endpoint>` necesito la estructura del body. Podés dar JSON de ejemplo, un
> DTO, o el contrato de la skill `sandbox` si aplica.

Nunca inventar nombres de campos.

#### Prioridad 7 — Datos variables (parametrización, LO12-13)

> ¿Cada request necesita datos distintos o todos usan los mismos valores?
>
> - **Mismos valores** → User Defined Variables
> - **Datos distintos por request, desde archivo** → CSV Data Set Config
> - **Datos únicos generados en el momento** (para evitar choques con UNIQUE, ej.
>   `usuarios.email`) → funciones JMeter (`__UUID`, `__Random`, `__RandomString`, `__time`)
>
> ¿Generamos el CSV de ejemplo o tenés uno real?

#### Prioridad 8 — Correlación (LO10-11, si hay una secuencia de requests)

> ¿Hay un valor que un endpoint devuelve y otro necesita? (id creado, token, etc.)
>
> Lo capturo con JSON Extractor (preferido si la respuesta es JSON) o Regex Extractor
> (si necesitás matchear texto plano o headers).

#### Prioridad 9 — Temporizadores y pacing (LO14)

> ¿Simulamos "golpe instantáneo" (sin pacing, default) o pacing realista con
> Constant Throughput Timer / Uniform Random Timer?
>
> Sin pacing es más agresivo y encuentra el techo más rápido — útil para estrés.
> Con pacing simula mejor el uso real — útil para carga y resistencia.

#### Prioridad 10 — Assertions y SLA

> ¿Qué validamos en cada response?
>
> - HTTP Status esperado
> - Response time < X ms — este valor también define el SLA del informe (`--sla-p95`)
> - Body contiene / JSON path específico
>
> Si no especificás, agrego status code + duration < 2000ms.

#### Prioridad 11 — Línea base para comparar

> ¿Tenés un `.jtl` de una corrida `baseline` previa? Si sí, el informe compara degradación
> contra esa línea base (`--baseline`). Si no, generamos baseline primero — es rápido
> (pocos usuarios, pocas iteraciones).

#### Prioridad 12 — Metadata del informe (opcional)

> Nombre de la API, versión, link del repositorio, autor — todo opcional, aparece en la
> portada del PDF.

---

### Paso 3 — Confirmar antes de generar

```
CONTEXTO DETECTADO:
  API:          <nombre>
  BASE URL:     <url completa>
  ENDPOINT(S):  <lista de MÉTODO /path>
  PERFIL:       <baseline|carga|estres|pico|resistencia|escalabilidad>
  CARGA:        threads=<n> rampup=<s> loops=<n|-1> duration=<s>
  RATE LIMIT:   <una key, medir 429 | N keys repartidas | sin rate limit conocido>
  AUTH:         <tipo o "ninguna">
  BODY:         <schema o "no aplica">
  DATOS:        <CSV columnas | User Defined Variables | funciones de generación>
  CORRELACIÓN:  <valor(es) a extraer o "no aplica">
  PACING:       <sin pacing | Constant Throughput Timer a N/min>
  ASSERTIONS:   <status + response time + body>
  SLA:          p95 < <n>ms, error rate < <n>%
  BASELINE:     <archivo .jtl o "se genera en esta corrida">
  VERSIÓN API:  <versión o "no proporcionada">
  REPO:         <url o "no proporcionado">
  AUTOR:        <nombre o "anónimo">
  SALIDA:       P_<NOMBRE>.jmx + D_<NOMBRE>.csv + INFORME_PERF_<NOMBRE>.pdf

¿Confirmás o corregís algo antes de que genere?
```

Esperar confirmación. Luego generar.

---

### Escalation rules

- Usuario dice "quiero probar mi API" → preguntar Prioridad 1
- Usuario da URL sin endpoint → preguntar Prioridad 2
- Usuario pide "1000 usuarios" sin perfil → preguntar Prioridad 3, ubicar en el perfil que
  corresponda (probablemente estrés) y avisar del rate limit si es el sandbox
- Usuario da endpoint sin auth info → preguntar Prioridad 5
- Usuario pide CSV pero no da campos → preguntar Prioridad 7
- Usuario pide "arreglá el plan" sin .jmx → pedir el archivo o el error
- Usuario dice "ya te dije todo" con contexto incompleto → listar exactamente qué falta, de a uno

---

## Convención de nombres de archivos

**Siempre respetar este patrón. Sin excepciones.**

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Plan de prueba | `P_NOMBRE_DE_API.jmx` | `P_SANDBOX_API.jmx` |
| Datos CSV | `D_NOMBRE_DE_API.csv` | `D_SANDBOX_API.csv` |
| Perfiles | `V_PERFILES.properties` | (uno por proyecto, no por API) |
| Resultados JTL | `R_NOMBRE_DE_API.jtl` o `R_NOMBRE_DE_API_<perfil>.jtl` | `R_SANDBOX_API_estres.jtl` |
| Informe PDF | `INFORME_PERF_NOMBRE_DE_API.pdf` | `INFORME_PERF_SANDBOX_API.pdf` |
| Pipeline Azure/GitHub | `Y_NOMBRE_DE_API_jmeter.yml` | `Y_SANDBOX_API_jmeter.yml` |

Reglas:
- `NOMBRE_DE_API` = UPPER_SNAKE_CASE
- Mismo nombre base en todos los archivos del mismo set
- Un `.jmx` sirve para todos los perfiles — no generar uno por perfil

Estructura recomendada:
```
tests/
  jmeter/
    P_MI_API.jmx
    V_PERFILES.properties
    data/
      D_MI_API.csv
results/
  R_MI_API_baseline.jtl
  R_MI_API_carga.jtl
  INFORME_PERF_MI_API.pdf
azure-pipelines/
  Y_MI_API_jmeter.yml
```

---

## Stack

- Runner: Apache JMeter 5.6+ (Java 11+)
- Formato de plan: `.jmx` (XML), 100% property-driven vía `${__P(prop,default)}`
- Datos: CSV Data Set Config + funciones JMeter (`__UUID`, `__Random`, `__time`)
- Resultados: Simple Data Writer → `.jtl` (CSV format)
- Reporters: JMeter Dashboard (HTML) + reporter Python → PDF con SLA y comparación baseline
- CI target: Azure Pipelines y GitHub Actions (`Y_*_jmeter.yml`)
- Ejecución headless: `jmeter -n -t plan.jmx -l results.jtl -J<prop>=<valor>`

## Comandos

| Comando | Acción |
|---------|--------|
| `/jmeter:generate` | Generar `.jmx` property-driven desde spec / curl / URL / grupo del sandbox |
| `/jmeter:csv` | Generar o actualizar archivo CSV de datos |
| `/jmeter:perfil` | Calcular los valores `-J` de un perfil (carga/estrés/pico/resistencia/escalabilidad) |
| `/jmeter:fix` | Analizar y reparar un plan fallido o resultado anómalo |
| `/jmeter:ci` | Generar pipeline Azure Pipelines o GitHub Actions |
| `/jmeter:run` | Mostrar comando de ejecución correcto para el perfil elegido |
| `/jmeter:report` | Analizar `.jtl` y generar descripción del PDF, con comparación a baseline si existe |

---

## Estructura de un plan .jmx — property-driven

```
TestPlan (User Defined Variables: baseUrl, port, protocol, apiKey, perfil)
└── ThreadGroup (threads/rampup por -J, scheduler=true + loops+duration combinados)
    ├── CSV Data Set Config (si hay datos variables)
    ├── HTTP Request Defaults (baseUrl, puerto, protocolo)
    ├── HTTP Header Manager (Content-Type, Authorization / x-api-key)
    ├── Constant Throughput Timer (deshabilitado por defecto — pacing opcional, LO14)
    ├── Transaction Controller — agrupa una secuencia de negocio (LO14)
    │   ├── [Sampler 1] HTTP Request
    │   │   ├── JSON/Regex Extractor — correlación (LO10-11)
    │   │   └── Assertions (Response, Duration, JSON)
    │   └── [Sampler 2] HTTP Request — reusa el valor correlacionado
    ├── Debug Sampler (deshabilitado — solo GUI, LO15)
    └── Simple Data Writer → results/R_MI_API.jtl
```

Ejemplo completo funcionando contra el sandbox: `examples/P_SANDBOX_API.jmx`.

### Thread Group — property-driven, cubre los 6 perfiles con un solo plan

`loops` y `duration` combinados: el hilo termina cuando se cumple **lo que ocurra primero**.
`loops=N` finito con `duration` grande (default) → modo baseline/estrés por iteraciones.
`loops=-1` (infinito) con `duration=N` → modo carga/resistencia por tiempo.

```xml
<ThreadGroup>
  <stringProp name="ThreadGroup.num_threads">${__P(threads,1)}</stringProp>
  <stringProp name="ThreadGroup.ramp_time">${__P(rampup,0)}</stringProp>
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
  <stringProp name="ThreadGroup.duration">${__P(duration,3600)}</stringProp>
  <stringProp name="ThreadGroup.delay">0</stringProp>
  <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
    <boolProp name="LoopController.continue_forever">false</boolProp>
    <stringProp name="LoopController.loops">${__P(loops,10)}</stringProp>
  </elementProp>
</ThreadGroup>
```

Valores por perfil: ver `references/perfiles.md`.

### HTTP Request Defaults

```xml
<ConfigTestElement testclass="ConfigTestElement" testname="HTTP Request Defaults">
  <stringProp name="HTTPSampler.domain">${baseUrl}</stringProp>
  <stringProp name="HTTPSampler.port">${port}</stringProp>
  <stringProp name="HTTPSampler.protocol">${protocol}</stringProp>
  <stringProp name="HTTPSampler.implementation">HttpClient4</stringProp>
</ConfigTestElement>
```

### HTTP Header Manager — `x-api-key` (caso sandbox)

```xml
<HeaderManager testname="HTTP Header Manager — x-api-key">
  <collectionProp name="HeaderManager.headers">
    <elementProp name="x-api-key" elementType="Header">
      <stringProp name="Header.name">x-api-key</stringProp>
      <stringProp name="Header.value">${apiKey}</stringProp>
    </elementProp>
    <elementProp name="Content-Type" elementType="Header">
      <stringProp name="Header.name">Content-Type</stringProp>
      <stringProp name="Header.value">application/json</stringProp>
    </elementProp>
  </collectionProp>
</HeaderManager>
```

### HTTP Header Manager — Bearer token (otras APIs)

```xml
<elementProp name="Authorization" elementType="Header">
  <stringProp name="Header.name">Authorization</stringProp>
  <stringProp name="Header.value">Bearer ${token}</stringProp>
</elementProp>
```

---

## Correlación (LO10-11)

La correlación captura un valor dinámico de una respuesta y lo reusa en un request posterior.
Sin ella, un script que crea un recurso y después lo consulta por id simplemente no funciona
bajo carga real (cada thread crea un id distinto).

### JSON Extractor — preferido cuando la respuesta es JSON

```xml
<JSONPostProcessor testname="JSON Extractor — ordenId">
  <stringProp name="JSONPostProcessor.referenceNames">ordenId</stringProp>
  <stringProp name="JSONPostProcessor.jsonPathExprs">$.data.id</stringProp>
  <stringProp name="JSONPostProcessor.match_numbers">1</stringProp>
  <stringProp name="JSONPostProcessor.defaultValues">ORDEN_ID_NO_ENCONTRADO</stringProp>
</JSONPostProcessor>
```

### Regular Expression Extractor — para texto plano, headers, o cuando no hay JSON

```xml
<RegexExtractor testname="Regex Extractor — ordenId">
  <stringProp name="RegexExtractor.useHeaders">false</stringProp>
  <stringProp name="RegexExtractor.refname">ordenId_regex</stringProp>
  <stringProp name="RegexExtractor.regex">"id":(.+?),</stringProp>
  <stringProp name="RegexExtractor.template">$1$</stringProp>
  <stringProp name="RegexExtractor.default">ORDEN_ID_NO_ENCONTRADO</stringProp>
  <stringProp name="RegexExtractor.match_number">1</stringProp>
</RegexExtractor>
```

`(.+?)` es la expresión más usada — no-codiciosa, sirve para la mayoría de valores dinámicos
con estructura similar. No siempre alcanza — revisar la respuesta real antes de asumir.

Ejemplo end-to-end en `examples/P_SANDBOX_API.jmx`: `POST /api/v1/ordenes` → extrae
`$.data.id` → `GET /api/v1/ordenes/${ordenId}`.

**Siempre poner un `defaultValues`/`default` explícito** (nunca vacío) — si la correlación
falla, el default hace que el siguiente sampler falle de forma visible (`.../ORDEN_ID_NO_ENCONTRADO`)
en vez de silenciosa.

---

## Parametrización (LO12-13)

### Variables — mismos valores para todos los threads

```xml
<Arguments guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables">
  <collectionProp name="Arguments.arguments">
    <elementProp name="canal" elementType="Argument">
      <stringProp name="Argument.name">canal</stringProp>
      <stringProp name="Argument.value">email</stringProp>
    </elementProp>
  </collectionProp>
</Arguments>
```

### CSV Data Set Config — datos distintos por request, desde archivo

```xml
<CSVDataSet testname="CSV Data Set Config">
  <stringProp name="filename">${__P(csvFile,data/D_MI_API.csv)}</stringProp>
  <stringProp name="variableNames">usuarioId,producto,precioUnitario</stringProp>
  <stringProp name="delimiter">,</stringProp>
  <boolProp name="recycle">true</boolProp>
  <boolProp name="stopThread">false</boolProp>
  <stringProp name="shareMode">shareMode.all</stringProp>
</CSVDataSet>
```

### Funciones — datos únicos generados en el momento

Necesario cuando el campo tiene restricción `UNIQUE` (ej. `usuarios.email`,
`usuarios.documento_numero` en el sandbox) y un valor fijo del CSV produciría 400
`EXECUTION_ERROR` a partir del segundo loop.

| Función | Uso |
|---------|-----|
| `${__UUID()}` | id único por request — ideal para emails/documentos de prueba |
| `${__Random(1,100)}` | entero aleatorio en rango — cantidades, montos |
| `${__RandomString(8,abcdefghijk)}` | string aleatorio de longitud fija |
| `${__time(,)}` | timestamp epoch actual |
| `${__threadNum}` | número de thread — útil para sufijos deterministas por hilo |

Ejemplo — email único por request:
```
${__UUID()}@example.com
```

---

## Temporizadores (LO14)

| Timer | Uso |
|-------|-----|
| Constant Timer | espera fija entre requests |
| Uniform Random Timer | espera aleatoria uniforme — simula variabilidad humana |
| Gaussian Random Timer | espera con distribución normal — más realista que uniforme |
| **Constant Throughput Timer** | fija un throughput objetivo (muestras/min) — el que convierte "golpe instantáneo" en carga realista |

### Constant Throughput Timer — pacing

```xml
<ConstantThroughputTimer testname="Constant Throughput Timer — pacing">
  <intProp name="calcMode">2</intProp> <!-- 2 = all active threads -->
  <doubleProp>
    <name>throughput</name>
    <value>${__P(throughput,600)}</value>
  </doubleProp>
</ConstantThroughputTimer>
```

`throughput` en muestras por minuto, para **todos los threads activos combinados**
(`calcMode=2`). 600/min = 10 req/seg total, sin importar cuántos threads.

Sin este timer (o deshabilitado, default en `examples/P_SANDBOX_API.jmx`), JMeter dispara
requests tan rápido como el sistema responda — el "golpe instantáneo" clásico, correcto para
estrés, poco realista para carga o resistencia.

---

## Controladores lógicos (LO14)

| Controlador | Uso |
|-------------|-----|
| **Transaction Controller** | agrupa varios samplers como una transacción de negocio — se reporta como una unidad ("Crear y consultar orden" en vez de 2 filas sueltas) |
| If Controller | ejecuta samplers condicionalmente (ej. solo si el login devolvió 200) |
| Loop Controller | repite un subárbol N veces — ya usado internamente por el Thread Group |
| Once Only Controller | ejecuta el subárbol una sola vez por thread — típico para el login cuando el token dura toda la sesión |

### Transaction Controller

```xml
<TransactionController testname="Transacción — Crear y consultar orden">
  <boolProp name="TransactionController.includeTimers">true</boolProp>
  <boolProp name="TransactionController.parent">true</boolProp>
</TransactionController>
```

### Once Only Controller — login una sola vez por thread

```xml
<OnceOnlyController testname="Once Only — Login">
</OnceOnlyController>
```

---

## Aserciones

```xml
<ResponseAssertion testname="Assert Status 200">
  <collectionProp name="Asserion.test_strings">
    <stringProp>200</stringProp>
  </collectionProp>
  <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
  <intProp name="Assertion.test_type">8</intProp> <!-- Contains -->
</ResponseAssertion>

<DurationAssertion testname="Assert Tiempo &lt; 2000ms">
  <longProp name="DurationAssertion.duration">2000</longProp>
</DurationAssertion>

<JSONPathAssertion testname="Assert JSON path">
  <stringProp name="JSON_PATH">$.data.items</stringProp>
  <boolProp name="JSONVALIDATION">false</boolProp>
  <boolProp name="EXPECT_NULL">false</boolProp>
</JSONPathAssertion>
```

---

## Depuración (LO15)

- **View Results Tree** — solo en GUI, muestra request/response completos. Nunca en headless
  (consume memoria proporcional a la cantidad de requests — con miles de threads, cuelga JMeter).
- **Debug Sampler** — vuelca variables/propiedades de JMeter en el momento. Útil para verificar
  que la correlación capturó el valor esperado antes de correr el perfil completo.
  `examples/P_SANDBOX_API.jmx` lo incluye deshabilitado (`enabled="false"`) — habilitar solo
  en GUI, deshabilitar antes de cualquier corrida headless o de CI.
- **Aserciones que fallan en el primer loop, no después** → normalmente es correlación rota
  (revisar el `default` del extractor) o body mal armado — no un problema de carga.

Checklist antes de pasar a headless: Debug Sampler deshabilitado, View Results Tree
deshabilitado o quitado, `ResultCollector` (Simple Data Writer) sí habilitado.

---

## Ejecución CLI — referencia rápida (LO16-18)

```bash
# Instalación (Ubuntu/Debian)
apt-get install -y default-jdk
wget https://downloads.apache.org/jmeter/binaries/apache-jmeter-5.6.3.tgz
tar xzf apache-jmeter-5.6.3.tgz
export JMETER_HOME=$PWD/apache-jmeter-5.6.3
export PATH=$JMETER_HOME/bin:$PATH

# Baseline — referencia, un solo hilo
jmeter -n -t P_SANDBOX_API.jmx -l results/R_BASELINE.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=baseline -Jthreads=1 -Jrampup=0 -Jloops=10

# Perfil de carga — ver references/perfiles.md para el resto
jmeter -n -t P_SANDBOX_API.jmx -l results/R_CARGA.jtl -e -o results/dashboard/ \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=carga -Jthreads=10 -Jrampup=30 -Jloops=-1 -Jduration=120

# Leer todos los -J desde un archivo de propiedades
jmeter -n -t P_SANDBOX_API.jmx -l results/R_CARGA.jtl -q V_PERFILES.properties

# Generar dashboard HTML a partir de un .jtl existente
jmeter -g results/R_CARGA.jtl -o results/dashboard/

# Verificar sintaxis del .jmx sin correrlo
jmeter -n -t P_SANDBOX_API.jmx --loglevel INFO 2>&1 | head -30
```

### Modo distribuido (LO18)

```bash
# En cada máquina generadora de carga (servidor JMeter):
jmeter-server -Dserver.rmi.ssl.disable=true

# Desde el controlador:
jmeter -n -t P_SANDBOX_API.jmx -R 10.0.0.1,10.0.0.2 \
  -Dserver.rmi.ssl.disable=true -l results/R_DISTRIBUIDO.jtl
```

`-R` lista los generadores remotos. Cada uno corre el mismo `.jmx` con la misma cantidad de
threads — el total real es `threads × cantidad de máquinas`, tenerlo en cuenta al calcular
carga total (y contra el rate limit del sandbox si aplica).

---

## Monitoreo (LO19-20)

Indicadores primarios estándar: CPU, memoria, I/O de disco, conexiones de red del sistema
bajo prueba. Herramienta clásica: **PerfMon Server Agent** + el listener PerfMon en JMeter.

Específico del entorno sandbox — qué mirar más allá de CPU/memoria genéricos:

| Indicador | Por qué importa acá |
|-----------|----------------------|
| Crecimiento de `public.sql_audit_log` | cada request de SQL sandbox escribe ahí — bajo carga sostenida, crece rápido |
| Conexiones al pooler de Supabase | `pg.Pool` con `max: 1` por instancia lambda — Vercel escala instancias horizontalmente, el techo real puede ser el pooler, no la API |
| Cold starts de Vercel | Node runtime + `pg` + `node-sql-parser` (parser JS grande) — causa típica de p99 largo, no confundir con degradación real |
| Comandos consumidos en Upstash Redis | el rate limiter hace un round-trip a Redis por request — un free tier tiene su propio techo |
| Cabecera `X-RateLimit-Remaining` | mejor indicador en vivo de cuánto falta para el 429 que contar requests manualmente |

---

## Documentación (LO21)

Plantillas mínimas a completar por escenario (no generadas automáticamente — son texto libre
del alumno, esta skill da la estructura):

- **Plan de pruebas de rendimiento**: escenarios, datos de prueba, infraestructura, criterio
  de aceptación (ver metodología completa en `references/perfiles.md`).
- **Guión de pruebas**: por transacción — acción, datos usados, respuesta esperada.
- **Informe de resultados**: generado por `reporter/jmeter_report.py` — portada, métricas,
  comparación con línea base, veredicto.

---

## Informe PDF (`reporter/jmeter_report.py`)

```bash
pip install reportlab pandas

python reporter/jmeter_report.py \
  --results  results/R_CARGA.jtl \
  --api-name "Sandbox API" \
  --perfil carga \
  --baseline results/R_BASELINE.jtl \
  --sla-p95 800 \
  --sla-error-rate 2 \
  --sla-throughput 20 \
  --author "Nombre — email@empresa.com"
```

Flags de SLA (con default = umbral histórico de esta skill, se pueden ajustar por corrida):

| Flag | Default | Qué controla |
|------|---------|----------------|
| `--sla-error-rate` | 2 (%) | por encima → DEGRADACIÓN; > 10% → COLAPSO |
| `--sla-p95` | 3000 (ms) | p95 por encima → DEGRADACIÓN |
| `--sla-throughput` | ninguno | si se da, throughput por debajo → DEGRADACIÓN |
| `--baseline` | ninguno | si se da, agrega sección de comparación % contra esa corrida |
| `--perfil` | ninguno | aparece en la portada, para distinguir corridas del mismo API |

---

## Formato de salida — análisis de resultados (`/jmeter:report`)

```
FILE: R_<NOMBRE>.jtl
PLAN: P_<NOMBRE>.jmx
PERFIL: <baseline|carga|estres|pico|resistencia|escalabilidad>
CARGA: threads=<n> rampup=<s>s loops=<n|-1> duration=<s>s

MÉTRICAS:
  Throughput:        <n> req/seg
  Avg response time: <n> ms
  90th percentile:   <n> ms
  95th percentile:   <n> ms
  99th percentile:   <n> ms
  Min:               <n> ms
  Max:               <n> ms
  Error rate:        <n>%

COMPARACIÓN CON LÍNEA BASE (si --baseline):
  Avg: <n>ms → <n>ms (<+n%>)
  p95: <n>ms → <n>ms (<+n%>)

ERRORES (si hay):
  ❌ <sampler> → HTTP <code> — <n> ocurrencias
     CAUSA: <una línea — distinguir 429 de rate limit vs error real del sistema>
     FIX:   <acción>

VEREDICTO: ✅ dentro de SLA | ⚠️ degradación | ❌ colapso bajo estrés
```

---

## Pipeline CI — plantillas

Ver `examples/Y_EXAMPLE_API_jmeter.yml`. Mismo patrón que las otras skills del stack:
`continueOnError` en el paso de JMeter, `condition: always()` en el de reporte,
`PublishBuildArtifacts@1` (Azure) o `upload-artifact` (GitHub) siempre.

Diferencia frente a un pipeline funcional: el perfil corrido en CI debería ser **carga**, no
estrés/resistencia — esos se corren manualmente o en un job aparte con aprobación, no en cada
push (consumen tiempo y, contra el sandbox, cuota de rate limit compartida).

---

## Fallos comunes y fixes

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `Connection refused` en todos los samplers | Servicio no levantado | Verificar que la API esté corriendo antes de JMeter |
| 429 desde el primer loop | Rate limit del sandbox (30/min) alcanzado con una sola key | repartir keys o bajar threads — ver `references/perfiles.md` |
| Error rate > 5% con status 503 | Servidor saturado — esperado en estrés | Documentar el límite encontrado en el informe |
| `${token}` o `${ordenId}` sin resolver — literal en request | Extractor no capturó el valor | revisar el `jsonPathExprs`/`regex` contra la respuesta real, y el `default` del extractor |
| JMeter termina en segundos con 0 requests | `.jmx` mal formado | Correr con `--loglevel DEBUG` para ver el error |
| Todos los threads fallan en loop 1 | Login falla — token no capturado, o falta Once Only Controller | Verificar extractor: path y default value |
| `OutOfMemoryError` en JMeter | Heap insuficiente, o View Results Tree habilitado en corrida grande | `-Xms2g -Xmx4g`; deshabilitar View Results Tree en headless |
| Dashboard HTML vacío | `-e -o` path incorrecto o .jtl vacío | Verificar que el .jtl tenga datos antes de generar dashboard |
| Percentiles 99 altísimos, avg normal | Algunos threads colapsan (comportamiento esperado), o cold starts de Vercel | Documentar en informe — distinguir colapso real de cold start puntual |
| `EXECUTION_ERROR` 400 creciente durante la corrida | Dato del CSV se repite y choca con UNIQUE (ej. email) | Usar `${__UUID()}` en vez de valor fijo — ver sección Parametrización |
| Duration Assertion falla en baseline también | SLA copiado de otro perfil | El SLA de baseline debería ser el más estricto — es la referencia, no el límite tolerable |

---

## Auto-Clarity

Salir de caveman para: error rate > 20% (documentar límite con precisión), hallazgos de
seguridad encontrados durante estrés, recomendaciones de arquitectura para escalar, y cuando
el usuario pide entender la diferencia entre los 5 tipos de prueba del temario. Retomar
caveman después.

## Boundaries

Escribe archivos `.jmx`, `.csv`, `.properties`, comandos CLI, pipelines Azure/GitHub.
NO ejecuta JMeter — da los comandos listos para ejecutar.
NO inventa campos de body, reglas de validación ni valores de CSV — pregunta si no los tiene.
NO recomienda umbrales de performance sin datos reales — los describe como configurables
(`--sla-*`), nunca como verdad fija.
"stop jmeter" o "normal mode": volver a estilo verbose.
