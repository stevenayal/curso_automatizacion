# Requerimientos funcionales por grupo (BDD)

Un PDF por cada uno de los 5 grupos del curso de Automatización de Pruebas (CIT) — Grupo 2
(Banca), con la lógica de negocio del módulo que le toca a ese grupo. Sirven de fuente para
escribir los escenarios Gherkin y los casos de prueba automatizados.

| Grupo | Módulo | Archivo |
|---|---|---|
| 1 | Cuentas Bancarias | [grupo-01-cuentas-bancarias.pdf](./grupo-01-cuentas-bancarias.pdf) |
| 2 | Tarjetas de Crédito y Débito | [grupo-02-tarjetas.pdf](./grupo-02-tarjetas.pdf) |
| 3 | Préstamos | [grupo-03-prestamos.pdf](./grupo-03-prestamos.pdf) |
| 4 | Transferencias y Pagos | [grupo-04-transferencias-pagos.pdf](./grupo-04-transferencias-pagos.pdf) |
| 5 | Ahorros y Depósitos | [grupo-05-ahorros-depositos.pdf](./grupo-05-ahorros-depositos.pdf) |

Sistemas descriptos:

- **API:** <https://aiquaa-sandbox-api.vercel.app/docs/v2> (rutas `/api/v2/**`, schema `qa_training_v2`)
- **Web:** <https://aiquaa-sandbox-web.vercel.app/v2>

## Qué contiene cada documento

Alcance y actores · precondiciones de acceso (API key o token de grupo, gate de curso, límite
de caudal, capas de acceso del front) · modelo de datos del módulo · requerimientos funcionales
`RF-G{n}-{nn}` con entradas, reglas, respuesta y errores · reglas transversales de la API ·
flujo en la aplicación web · criterios de aceptación en prosa · anexo normativo (BCP / SEDECO)
con las brechas del sandbox.

Los documentos describen **lo que el código hace hoy**, incluidas las simplificaciones
deliberadas del sandbox (por ejemplo: aprobar un préstamo no acredita la cuenta, una tarjeta no
vence sola, el dinero de un plan de ahorro no se puede retirar). Esas simplificaciones están
listadas como brechas en la sección 8, para que nadie escriba un escenario esperando un
comportamiento que no existe.

Dos cosas a tener presentes al derivar escenarios:

- **Reglas de UI.** La aplicación web es más estricta que la API en varios puntos (topes,
  mínimos, listas cerradas). Están marcadas como "regla de UI" en la sección 6: se prueban por
  pantalla, y la misma operación enviada directo a la API es aceptada.
- **Sandbox compartido.** Los cinco grupos escriben sobre los mismos datos. Los valores
  sembrados que citan los documentos valen para una base recién sembrada; un escenario robusto
  crea sus propios datos.

El anexo normativo es material de referencia **orientativo** para dar contexto de negocio: las
normas citadas se mencionan de forma general y deben validarse con su texto vigente antes de
usarse como criterio de cumplimiento. El sandbox es un entorno didáctico y no pretende cumplir
ninguna de ellas.

## Regenerar los PDFs

Las fuentes viven en `_src/`: `comun.mjs` (metadatos y secciones compartidas), `grupo-NN.mjs`
(contenido de cada grupo), `plantilla.mjs` (HTML + estilos) y `build.mjs` (generador).

```bash
node docs/requerimientos/_src/build.mjs
```

Con argumentos, regenera solo esos grupos:

```bash
node docs/requerimientos/_src/build.mjs 3 5
```

El generador arma el HTML en `_src/html/` y lo imprime a PDF con Chrome (o Edge) en modo
headless, vía el protocolo DevTools, para agregar la cabecera (logo del CIT, curso y docente)
y el pie de página (numeración) en cada página impresa. Si ese canal no levanta, cae
automáticamente a `--print-to-pdf`, que produce el mismo documento sin cabecera ni pie de
página. No requiere instalar dependencias.

El logo institucional vive en `_src/assets/cit-logo.png` y se embebe como base64 tanto en la
portada como en la cabecera de cada página.

Al cambiar el comportamiento de una ruta de `app/api/v2/**` en `aiquaa-sandbox-api`, actualizá
el `grupo-NN.mjs` correspondiente y volvé a generar el PDF de ese grupo.
