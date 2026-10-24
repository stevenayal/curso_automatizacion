# Base de demostración: tareas

| Dato | Valor |
| --- | --- |
| Requisito | Ejemplo E2E mínimo solicitado; comportamiento de demostración, no requisito de producto |
| Arquitectura | Cucumber + Playwright + POM |
| Nivel | C: CRUD simple local |
| Aplicación | app/index.html servida en loopback con puerto dinámico |
| Auth / seed | Pública, @sin-sesion; contexto nuevo con lista vacía por escenario |
| PO | pages/TasksPage.ts |
| Tags | @tareas, @TAR-01, @TAR-02, @smoke, @negativo |
| Tier | Sin llamadas a modelos durante ejecución |

Los escenarios viven en features/tareas/F_TAREAS.feature.
Locators inferidos del HTML incluido: label Tarea, botón Agregar, lista Tareas,
role alert. No se requieren data-testid.

Expected no healeables: título conservado, mensaje de validación y cantidad de tareas.
Riesgos: aislamiento entre escenarios y persistencia en localStorage al recargar.
Fuera de alcance: backend, autenticación, banca, integración con aplicaciones externas.
