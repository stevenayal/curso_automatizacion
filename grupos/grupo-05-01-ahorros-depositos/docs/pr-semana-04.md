# PR semanal — Grupo 05-01

## Grupo

Grupo 05-01 — Ahorros y Depósitos. Marcos Flores, Jackelin Peña y Ada Melgarejo.

## Semana

4.

## Objetivo del avance

Ejecutar la colección Postman del grupo en GitHub Actions con Newman, generar
el informe PDF con Python y publicar los resultados como artefactos descargables.

## Cambios realizados

- Workflow del grupo con ejecución por push, PR y manual, basado en el ejemplo de clase y el PR #37.
- Comando `npm run test:api:grupo-05-01` para los 9 escenarios existentes y sus validaciones SQL.
- Credencial mediante `.env` local o secret `API_KEY`; reportes JSON/JUnit con la clave ocultada.
- Generación de PDF y publicación de artefactos aunque falle la ejecución de pruebas.
- Documentación de configuración, ejecución y entrega en `docs/semana-04-ci.md` del grupo.

## Evidencias adjuntas

- PR: **completar con el enlace real después de publicarlo**.
- Run de GitHub Actions: **pendiente de ejecución autenticada**.
- Artefacto: `grupo-05-01-ahorros-depositos-reportes`.
- Informe: `INFORME_GRUPO_05_01_AHORROS_DEPOSITOS.pdf`, generado por ese run.
- Validación local: ver `validacion-semana-04.md`.

## Riesgos o bloqueos

- Configurar `API_KEY` válida en el environment `api_key` de GitHub antes de ejecutar.
- La colección requiere datos semilla y realiza operaciones sobre depósitos de prueba.
- Los escenarios BDD y UI del grupo continúan pendientes; este workflow cubre la colección API existente.

## Checklist

- [x] Actualicé documentación relevante.
- [ ] Adjunté el enlace de la ejecución real y su informe PDF.
- [ ] Verifiqué una ejecución verde de las pruebas contra la sandbox.
- [ ] El PR representa el avance semanal real del grupo y está publicado hacia `main`.
