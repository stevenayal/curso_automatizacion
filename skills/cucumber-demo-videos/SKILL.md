---
name: cucumber-demo-videos
description: Grabar pruebas Cucumber que usan Playwright y crear una galería HTML externa con videos de casos aprobados y fallidos, como demo-web, sin editar los tests ni la configuración del proyecto.
---

# Videos de Cucumber + Playwright

Generar una carpeta portátil con `index.html`, videos `.webm`, reporte HTML/JSON
de Cucumber, log y resumen. Cucumber sigue siendo el runner; la galería no es el
reporte nativo de Playwright Test.

## Preparación

- Crear esta skill no autoriza ejecutar pruebas reales. Cuando el usuario pida
  grabar o volver a correr sus pruebas, proceder dentro de esa autorización y
  conservar las restricciones sobre commits, push y publicación.
- Revisar los hooks y fixtures seleccionados. El helper intercepta
  `chromium.launch()` y requiere una página en `this.grupo0501.page` por defecto.
  Otro grupo puede indicar `--world-property`, `--feature` y `--tags`.
- Conservar las aserciones, guardas de escritura y limpieza originales. Los flujos
  reales pueden crear recursos y mover saldo; no sustituirlos por navegación
  inventada ni convertir un rechazo inesperado en aprobación.
- Guardar resultados fuera del repositorio y de `auxiliares`. No copiar `.env`,
  credenciales ni storageState. Revisar visualmente los videos antes de compartir.

## Ejecución desde la raíz curso_automatizacion

Con dependencias y Chromium instalados:

```powershell
node skills/cucumber-demo-videos/scripts/capture.cjs `
  --output "$env:USERPROFILE/Downloads/info_cucumber/capturas-grupo-05-01" `
  --slow 300
```

Opciones: `--channel chrome` usa Chrome instalado; `--headless` graba sin ventana;
`--dry-run` valida pasos sin abrir navegador ni probar la aplicación. `--help`
lista la selección de repo, config, feature, tags y propiedad del World.

Los valores iniciales corresponden al Grupo 05-01:

- Feature `grupos/grupo-05-01-ahorros-depositos/features/ahorros-depositos.feature`.
- Tags `@grupo-05-01 and @web and not @wip`.
- Perfil `default` de `cucumber.js`; hooks/steps existentes.
- Ventana visible, slowMo de 300 ms, pausa entre pasos de 250 ms y video 1280×720.
- Secuencial y sin reintentos automáticos. No cambia los timeouts del negocio.

La configuración temporal reemplaza los destinos de reportes para evitar escribir
en `results/` del repositorio. El hook de captura se carga antes de los hooks del
proyecto; por el orden inverso de los `After`, guarda el video después del cierre
y limpieza originales. Si los hooks no cierran el contexto, adaptar esa integración
antes de repetir pruebas; no forzar el cierre anticipado ni saltar la limpieza.

## Verificación y entrega

1. Leer `resumen.json`: código real de Cucumber, escenarios, pasos, fallos de hooks,
   videos faltantes y cambios detectados. Un fallo de limpieza mantiene el caso
   fallido aunque hayan aprobado los pasos de negocio.
2. Abrir `index.html` y comprobar escenario, ejemplo, estado final y video. Conserva
   los videos de casos aprobados y fallidos, sin confundir omitidos con aprobados.
3. Abrir `cucumber-report.html` para ver los pasos y adjuntos originales. La galería
   es un complemento del reporte y no modifica sus expectativas ni sus resultados.
4. La preparación de sesión queda en `originales/`, fuera de la galería. Compartir
   solo `index.html`, `videos/`, reportes y `resumen.json`; excluir originales,
   configuración temporal y logs internos. Para un ZIP, comprimir esos archivos.
5. Informar fecha, filtro, casos/pasos, fallos y ruta. Un dry-run no acredita ejecución
   funcional; un video por sí solo no sustituye las aserciones.

El helper verifica hashes de archivos versionados/no ignorados, `.env` y resultados
habituales antes/después. Detecta diferencias y no las revierte. Esta comprobación
no impide escrituras de hooks arbitrarios. No hace commits, push ni llamadas a GitHub.

Para otra estructura usar `--repo`, `--config`, `--feature`, `--tags` y
`--world-property`. Los caminos de config/feature se resuelven desde el repo;
`--output`, desde la terminal. Si se usa otro motor, config dinámica o World
incompatible, explicar la adaptación necesaria en vez de afirmar que se grabó.
