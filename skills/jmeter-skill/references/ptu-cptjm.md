# Mapa LO1–LO23 → esta skill

Referencia cruzada entre los objetivos de aprendizaje del temario **PtU Certified Performance
Tester con JMeter (CPTJM)**, versión 1.0 2019, y dónde se cubre cada uno en `jmeter-skill`.
Útil para dar clase en orden del temario y para que el alumno confirme cobertura antes del
examen de certificación. El temario en sí (© Performance Testing United) no se reproduce acá
más allá del enunciado corto de cada LO — el documento completo lo entrega el docente.

| LO | Enunciado (resumen) | Nivel | Dónde en esta skill |
|----|----------------------|-------|------------------------|
| LO1 | Qué son las pruebas de rendimiento y sus tipos | K2 | `references/perfiles.md` — tabla de perfiles |
| LO2 | Metodología de pruebas de rendimiento | K2 | `SKILL.md` — Context Intake sigue la misma secuencia: planificación → escenarios → automatización → ambiente → ejecución |
| LO3 | Tipos de herramientas de rendimiento | K1 | fuera de alcance — esta skill es JMeter-only por diseño del curso |
| LO4 | Aspectos básicos de HTTP(S) | K2 | prerequisito — cubierto por `hurl-skill`/`postman-newman-skill` en semanas previas |
| LO5 | Por qué JMeter | K2 | `SKILL.md` — intro |
| LO6 | Instalar y ejecutar JMeter en Windows/Linux | K3 | `SKILL.md` — sección Ejecución CLI, instalación |
| LO7 | Elementos del plan de pruebas | K2 | `SKILL.md` — Estructura de un plan .jmx |
| LO8 | Scripts básicos por grabación | K3 | `SKILL.md` — Context Intake (curl/URL → sampler); grabación es manual en GUI, esta skill genera el equivalente sin grabar |
| LO9 | Analizar resultados con reportes | K3 | `reporter/jmeter_report.py`, `/jmeter:report` |
| LO10 | Concepto de correlación y regex | K2 | `SKILL.md` — sección Correlación; `P_SANDBOX_API.jmx` — JSON Extractor y Regex Extractor de `ordenId` |
| LO11 | Aplicar regex para correlación | K3 | mismo ejemplo — Regex Extractor alternativo (deshabilitado, para comparar contra el JSON Extractor) |
| LO12 | Concepto de parametrización | K2 | `SKILL.md` — sección Parametrización |
| LO13 | Construir/configurar fuentes de datos | K3 | `D_SANDBOX_API.csv` + CSV Data Set Config en `P_SANDBOX_API.jmx` |
| LO14 | Temporizadores, aserciones, controladores | K3 | Constant Throughput Timer, Transaction Controller, Response/Duration/JSON assertions — todos en `P_SANDBOX_API.jmx` |
| LO15 | Depuración de un script | K3 | `SKILL.md` — sección Depuración; Debug Sampler (deshabilitado) en el plan |
| LO16 | Preparación de scripts para ejecución | K3 | `SKILL.md` — checklist antes de correr headless (desactivar Debug Sampler / View Results Tree) |
| LO17 | Ejecución en modo línea de comandos | K3 | `SKILL.md` — Ejecución CLI, `references/perfiles.md` |
| LO18 | Ejecución en modo distribuido | K1 | `SKILL.md` — sección Ejecución, flags `-R` / `server.rmi.ssl.disable` |
| LO19 | Monitoreo de recursos e indicadores | K2 | `SKILL.md` — sección Monitoreo |
| LO20 | Herramientas básicas de monitoreo | K3 | `SKILL.md` — PerfMon Server Agent + indicadores específicos del sandbox (pooler, Redis, cold starts) |
| LO21 | Documentación de pruebas de rendimiento | K2 | `SKILL.md` — plantillas de plan/guión/informe; `reporter/jmeter_report.py` |
| LO22 | Mejores prácticas de JMeter | K2 | `SKILL.md` — Fallos comunes y fixes |
| LO23 | Ejecución de scripts para servicios web | K3 | todo el plan `P_SANDBOX_API.jmx` — es un servicio web (API REST/JSON) |

## Objetivos de negocio (BO1–BO4)

| BO | Enunciado | Cobertura |
|----|-----------|-----------|
| BO1 | Comprender conceptos y metodología | `references/perfiles.md` + Context Intake |
| BO2 | Usar JMeter para crear/ejecutar pruebas | toda la skill |
| BO3 | Analizar resultados e identificar mejoras | `reporter/jmeter_report.py` + tabla de fallos comunes |
| BO4 | Identificar indicadores y monitorear | sección Monitoreo |

## Fuente

Performance Testing United (PtU), *PtU Certified Performance Tester con JMeter (CPTJM) —
Programa de estudios*, versión 1.0 2019, © PtU. Este mapeo es un índice de referencia cruzada,
no una reproducción del temario — el documento oficial se descarga de `www.pt-united.com`.
