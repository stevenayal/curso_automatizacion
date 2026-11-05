# jmeter-skill

> Pruebas de rendimiento dinámicas con Apache JMeter — powered by [aiquaa](https://aiquaa.com/)

Skill para Claude Code, Cursor, Windsurf y más de 40 agentes de IA. A partir de una URL,
especificación o grupo del curso, genera **un solo plan `.jmx` property-driven** que cubre los
5 tipos de prueba del temario [PtU Certified Performance Tester con JMeter (CPTJM)](https://www.pt-united.com/) —
carga, estrés, pico, resistencia, escalabilidad — más línea base, sin editar XML entre corridas.

---

## ¿Qué problema resuelve?

Un plan de JMeter clavado a un solo escenario (ej. "1000 usuarios × 30 loops") sirve para una
sola pregunta. Esta skill genera un plan **parametrizado por `-J`**: el mismo `.jmx` responde
"¿cuál es el mejor tiempo posible?" (baseline), "¿aguanta la carga esperada?" (carga), "¿dónde
rompe?" (estrés), "¿se recupera después de una ráfaga?" (pico), "¿hay fugas sostenidas?"
(resistencia) y "¿cómo escala?" (escalabilidad) — con los mismos elementos de correlación,
parametrización, temporizadores y aserciones que exige el temario PtU CPTJM.

---

## ¿Qué incluye?

| Componente | Descripción |
|------------|-------------|
| `skills/jmeter/SKILL.md` | Instrucciones del agente — Context Intake, perfiles, correlación, parametrización, temporizadores, controladores, depuración |
| `references/perfiles.md` | Los 5 perfiles de carga + baseline, con valores y comandos listos |
| `references/ptu-cptjm.md` | Mapa LO1–LO23 del temario PtU CPTJM → sección de esta skill |
| `examples/P_SANDBOX_API.jmx` | Plan property-driven completo contra el [sandbox del curso](../sandbox-skill) — correlación, CSV, Constant Throughput Timer, Transaction Controller |
| `examples/D_SANDBOX_API.csv` | Datos de ejemplo (30 filas) |
| `examples/V_PERFILES.properties` | Valores `-J` de cada perfil, listos para copiar |
| `examples/Y_EXAMPLE_API_jmeter.yml` | Pipeline Azure Pipelines, perfil `carga` por defecto |
| `reporter/jmeter_report.py` | Informe PDF — SLA configurable por flag, comparación contra línea base |

---

## Instalación

```bash
# Claude Code
npx skills add aiquaa-labs/jmeter-skill

# Cursor
npx skills add aiquaa-labs/jmeter-skill -a cursor

# Windsurf
npx skills add aiquaa-labs/jmeter-skill -a windsurf

# Cualquier otro agente
npx skills add aiquaa-labs/jmeter-skill
```

---

## Uso rápido

```
/jmeter:generate   → generar plan .jmx property-driven desde spec / curl / URL / grupo del sandbox
/jmeter:csv        → generar o actualizar archivo de datos CSV
/jmeter:perfil      → calcular los valores -J de un perfil (carga/estrés/pico/resistencia/escalabilidad)
/jmeter:fix        → analizar y reparar plan fallido o resultado anómalo
/jmeter:ci         → generar pipeline Azure Pipelines o GitHub Actions
/jmeter:run        → mostrar el comando de ejecución correcto para el perfil elegido
/jmeter:report     → analizar .jtl y generar descripción del PDF, con comparación a baseline
```

La skill siempre recolecta contexto antes de generar — URL, endpoint, perfil, rate limit
conocido, auth, datos, correlación, pacing y SLA. Ver el Context Intake completo en `SKILL.md`.

---

## Perfiles de carga

```
baseline       →  1 usuario, sin ramp-up — la referencia contra la que se compara todo
carga          →  concurrencia esperada del sistema
estrés         →  2 a 5× la carga esperada — encontrar dónde rompe
pico           →  ráfaga corta — ¿se recupera después?
resistencia    →  carga sostenida por horas — buscar fugas
escalabilidad  →  escalones crecientes — proyectar el crecimiento
```

Un solo `.jmx`, todo por línea de comandos:

```bash
jmeter -n -t P_SANDBOX_API.jmx -l results/R_CARGA.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=carga -Jthreads=10 -Jrampup=30 -Jloops=-1 -Jduration=120
```

→ [Detalle de cada perfil, con comandos](./references/perfiles.md)

---

## Correlación, parametrización y temporizadores

`examples/P_SANDBOX_API.jmx` incluye, ya conectados:

- **Correlación (LO10-11)** — JSON Extractor y Regex Extractor capturando `data.id` de
  `POST /api/v1/ordenes` para reusarlo en `GET /api/v1/ordenes/{id}`.
- **Parametrización (LO12-13)** — CSV Data Set Config + funciones `__Random`/`__UUID` para
  evitar choques con campos `UNIQUE` del sandbox.
- **Temporizadores (LO14)** — Constant Throughput Timer para pacing (deshabilitado por
  defecto — "golpe instantáneo" sigue siendo el comportamiento base).
- **Controladores lógicos (LO14)** — Transaction Controller agrupando la secuencia de negocio.

---

## Informe PDF

```bash
pip install reportlab pandas

python reporter/jmeter_report.py \
  --results  results/R_CARGA.jtl \
  --api-name "Sandbox API" \
  --perfil carga \
  --baseline results/R_BASELINE.jtl \
  --sla-error-rate 2 \
  --sla-p95 800 \
  --author   "Nombre — email@empresa.com"
```

El informe incluye portada con estadísticas reales de la corrida (no `threads × loops` —
inválido en perfiles por duración), tabla de percentiles, **comparación con línea base** si se
pasa `--baseline`, detalle por sampler, top errores y veredicto según el SLA dado:

| Veredicto | Condición (con los defaults) |
|-----------|-------------------------------|
| ✅ Dentro de SLA | Error rate ≤ 2% y P95 ≤ 3000 ms |
| ⚠️ Degradación detectada | Error rate > 2% o P95 > 3000 ms (o bajo `--sla-throughput`) |
| ❌ Colapso bajo estrés | Error rate > 10% |

Salida: `INFORME_PERF_<NOMBRE>[_<PERFIL>].pdf`

---

## Convención de nombres

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Plan de prueba | `P_NOMBRE_DE_API.jmx` | `P_SANDBOX_API.jmx` |
| Datos CSV | `D_NOMBRE_DE_API.csv` | `D_SANDBOX_API.csv` |
| Perfiles | `V_PERFILES.properties` | (uno por proyecto) |
| Resultados | `R_NOMBRE_DE_API.jtl` | `R_SANDBOX_API_estres.jtl` |
| Informe PDF | `INFORME_PERF_NOMBRE_DE_API.pdf` | `INFORME_PERF_SANDBOX_API_CARGA.pdf` |
| Pipeline CI | `Y_NOMBRE_DE_API_jmeter.yml` | `Y_SANDBOX_API_jmeter.yml` |

---

## Estructura del repositorio

```
jmeter-skill/
├── skills/jmeter/
│   └── SKILL.md                      ← instrucciones del agente
├── references/
│   ├── perfiles.md                   ← los 5 perfiles + baseline
│   └── ptu-cptjm.md                  ← mapa LO1-23 → esta skill
├── examples/
│   ├── P_SANDBOX_API.jmx             ← plan property-driven contra el sandbox
│   ├── D_SANDBOX_API.csv             ← datos de ejemplo
│   ├── V_PERFILES.properties         ← valores -J por perfil
│   ├── P_EXAMPLE_API.jmx             ← plan genérico (no-sandbox), referencia
│   ├── D_EXAMPLE_API.csv
│   └── Y_EXAMPLE_API_jmeter.yml      ← pipeline Azure de ejemplo
├── reporter/
│   ├── jmeter_report.py              ← generador de PDF (SLA + baseline)
│   └── requirements.txt
├── docs/
│   └── uso.md
└── .github/workflows/
    └── Y_JMETER_SKILL_CI.yml
```

---

## Stack de skills aiquaa

| Skill | Tipo de prueba |
|-------|----------------|
| [`sandbox-skill`](../sandbox-skill) | Contrato del entorno de práctica del curso |
| [`postman-newman-skill`](../postman-newman-skill) | Funcional — colecciones Postman, GUI-first |
| [`hurl-skill`](../hurl-skill) | Funcional — declarativo, diff-friendly, CI-native |
| [`playwright-skill`](../playwright-skill) | E2E navegador + API |
| [`bdd-skill`](../bdd-skill) | BDD — Gherkin + Cucumber + Playwright |
| [`jmeter-skill`](.) | Rendimiento — carga, estrés, pico, resistencia, escalabilidad |

---

## Créditos

Creado por [aiquaa](https://aiquaa.com/) — *Saber es calidad*

## Licencia

MIT
