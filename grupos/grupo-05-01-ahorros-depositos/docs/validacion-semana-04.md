# Validación — Semana 4 — Grupo 05-01

## Ejecución real local

El 25 de octubre de 2026 se ejecutó `npm run test:api:grupo-05-01` contra
`https://aiquaa-sandbox-api.vercel.app`, con la credencial del curso 2 en `.env`.

| Comprobación | Resultado |
|---|---|
| Escenarios de la colección | 9 |
| Requests, incluidas consultas auxiliares SQL | 21 ejecutados, 0 fallidos |
| Aserciones | 47 ejecutadas, 0 fallidas |
| Scripts de test | 9 ejecutados, 0 fallidos |
| Scripts de pre-request | 17 ejecutados, 0 fallidos |
| Duración | 31 609 ms |
| Código de salida | 0 |

Se generaron JSON y JUnit reales, y se convirtió ese JSON al informe
`newman/grupo-05-01/INFORME_GRUPO_05_01_AHORROS_DEPOSITOS.pdf` (9 páginas).
Los reportes locales están excluidos de Git; la entrega de evidencias se realiza
con los artefactos de GitHub Actions y el enlace del run indicado en el PR.

## Comprobaciones de la integración

- YAML parseado sin errores y sin claves duplicadas; disparadores y pasos de reportes con `always()` verificados.
- Sintaxis Bash de los comandos del workflow verificada con `bash -n`.
- Rutas de colección, environment, generador PDF y recursos gráficos verificadas.
- Runner comprobado en cuatro condiciones mediante simulación aislada: éxito, aserción fallida, error de ejecución y credencial ausente. Solo el éxito devuelve código 0.
- Ocultamiento de la API key verificado en los reportes JSON y JUnit reales y en las simulaciones.
- JUnit validado como XML; informe y guía personal abiertos con un lector PDF y contenido extraído correctamente.
- `.env`, los reportes y la guía personal excluidos del versionado mediante las reglas existentes de `.gitignore`.
- `git diff --check` sin errores.

La validación local no sustituye el run de GitHub Actions. El enlace y el estado
de esa ejecución se registran en el PR grupal al publicar la entrega.
