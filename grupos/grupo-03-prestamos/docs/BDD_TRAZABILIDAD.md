# Grupo 03 — Préstamos: mejora del BDD y trazabilidad

## Fuente y conversión

| Paso | Archivo |
|---|---|
| Requerimiento original (CIT, v1.0) | [`docs/requerimientos/grupo-03-prestamos.pdf`](../../../docs/requerimientos/grupo-03-prestamos.pdf) |
| Conversión a Markdown (markitdown-skill) | [`docs/M_GRUPO_03_PRESTAMOS.md`](./M_GRUPO_03_PRESTAMOS.md) |
| Escenarios de API + base de datos | [`features/F_GRUPO_03_PRESTAMOS_API.feature`](../features/F_GRUPO_03_PRESTAMOS_API.feature) |
| Escenarios web | [`features/prestamos.feature`](../features/prestamos.feature) |

Comando de conversión:

```bash
pip install 'markitdown[pdf]'
markitdown docs/requerimientos/grupo-03-prestamos.pdf -o grupos/grupo-03-prestamos/docs/M_GRUPO_03_PRESTAMOS.md
```

El PDF tiene texto seleccionable, así que no hizo falta OCR de imágenes. La conversión conserva todo
el texto, pero aplana las tablas (cada celda queda en su propia línea); para leer las reglas con su
estructura se cruzó con la fuente del documento en `docs/requerimientos/_src/grupo-03.mjs`.

## Qué se mejoró

1. **Cobertura de los 8 requerimientos funcionales.** Antes había 1 escenario activo y 5 en borrador,
   todos sobre consultas. Ahora hay un escenario (o un esquema con ejemplos) por cada criterio de
   aceptación del documento: 39 escenarios, 52 al expandir los ejemplos.
2. **Se separaron las capas.** La API y la base de datos van en `F_GRUPO_03_PRESTAMOS_API.feature`
   (convención `F_GRUPO_NN_MODULO` de la bdd-skill); la web queda en `prestamos.feature`, con las
   reglas que solo aplica la pantalla.
3. **Trazabilidad explícita.** Cada escenario lleva el tag `@RF-G3-xx` de su requerimiento y un
   comentario `# criterio:` con el criterio de aceptación, que la bdd-skill usa para la matriz del
   informe PDF.
4. **Datos propios.** Los escenarios de escritura crean su propio préstamo (`Dado que tengo un préstamo
   solicitado de …`). El documento advierte que los préstamos sembrados 2 y 3 no cierran
   contablemente y que el sandbox es compartido entre los cinco grupos.
5. **Valores exactos del documento.** Montos, cuotas y mensajes de error salen de los criterios de
   aceptación (por ejemplo, 2.000.000 al 16 % en 3 meses da cuotas de 773.333,33, 773.333,33 y
   773.333,34).
6. **Brechas marcadas como tales.** Los comportamientos que el sandbox simplifica a propósito
   (aprobar no acredita la cuenta; la API acepta pagar fuera de orden) se prueban con el tag
   `@brecha`, para que nadie los lea como un defecto.

## Escenarios eliminados del borrador anterior

Los borradores esperaban comportamientos que el sistema **no tiene**, según la sección 8 (brechas)
del documento. Un escenario así fallaría siempre sin que haya un defecto.

| Escenario anterior | Por qué se eliminó | Reemplazo |
|---|---|---|
| Consulta de un préstamo de otro cliente → rechazo | "No existe control de titularidad ni de funciones": la API no rechaza | — (brecha) |
| Préstamo con todas las cuotas pagadas → estado `cancelado` | El estado se llama `pagado`; `cancelado` no existe | "Ver el detalle de un préstamo totalmente pagado" (web) y "Pagar todas las cuotas cancela el préstamo" (API) |
| Cuotas vencidas → préstamo en mora con monto adeudado | La API nunca asigna `vencida` ni calcula mora | "Pagar una cuota vencida sin recargo" |
| Pago con fondos insuficientes → rechazo | "Pagar una cuota no debita ninguna cuenta ni valida fondos" | — (brecha) |
| Seleccionar varias cuotas y sumar | No existe esa operación; se paga de a una cuota completa | "La web solo permite pagar la próxima cuota" |

## Matriz requerimiento → escenario

Archivo: **A** = `F_GRUPO_03_PRESTAMOS_API.feature`, **W** = `prestamos.feature`.

| Requerimiento | Escenario | Tipo | Archivo |
|---|---|---|---|
| RF-G3-01 Listar | Listar los préstamos en evaluación | positivo | A |
| RF-G3-01 Listar | Listar los préstamos de un cliente | positivo | A |
| RF-G3-01 Listar | Filtrar el listado por estado (`vigente` → 400, `rechazado` → 200 vacío) | negativo | A |
| RF-G3-02 Solicitar | Solicitar un préstamo válido | positivo, smoke | A |
| RF-G3-02 Solicitar | Aceptar condiciones en el límite (plazo 1 y 120, tasa 0) | edge case | A |
| RF-G3-02 Solicitar | Rechazar condiciones fuera de rango (7 ejemplos) | negativo | A |
| RF-G3-02 Solicitar | Rechazar una solicitud para un cliente inexistente | negativo | A |
| RF-G3-02 / 06 | Simular un préstamo antes de solicitarlo | positivo | W |
| RF-G3-02 | La web rechaza montos fuera del rango permitido | regla de UI | W |
| RF-G3-02 | El plazo solo se elige de la lista permitida | regla de UI | W |
| RF-G3-02 | No se puede confirmar sin cuenta ni aceptación de condiciones | regla de UI | W |
| RF-G3-03 Consultar | Un usuario autorizado consulta el saldo de un préstamo vigente | positivo, smoke (activo en CI) | W |
| RF-G3-03 Consultar | Ver el detalle de un préstamo totalmente pagado | edge case | W |
| RF-G3-03 Consultar | Consultar con identificador inválido (404 / 400) | negativo | A |
| RF-G3-04 Modificar | Modificar el plazo de un préstamo solicitado | positivo | A |
| RF-G3-04 Modificar | Aprobar después de modificar usa las condiciones nuevas | positivo | A |
| RF-G3-04 Modificar | Rechazar la modificación de un préstamo aprobado o pagado | negativo | A |
| RF-G3-04 Modificar | Rechazar una modificación incompleta | negativo | A |
| RF-G3-05 Baja | Desistir de una solicitud | positivo | A |
| RF-G3-05 Baja | No se puede dar de baja un préstamo con saldo pendiente | negativo | A |
| RF-G3-05 Baja | Dar de baja un préstamo pagado | positivo | A |
| RF-G3-05 Baja | Desistir de una solicitud desde el detalle | regla de UI | W |
| RF-G3-06 Aprobar | Aprobar un préstamo genera el saldo y el plan de cuotas | positivo, smoke | A |
| RF-G3-06 Aprobar | La última cuota absorbe el redondeo | edge case | A |
| RF-G3-06 Aprobar | Las cuotas vencen mes a mes desde la aprobación | positivo | A |
| RF-G3-06 Aprobar | Un préstamo sin interés devuelve solo el capital | edge case | A |
| RF-G3-06 Aprobar | No se puede aprobar dos veces el mismo préstamo | negativo | A |
| RF-G3-06 Aprobar | Aprobar no modifica el saldo de la cuenta asociada | brecha | A |
| RF-G3-06 Aprobar | Aprobar un préstamo inexistente | negativo | A |
| RF-G3-07 Cuotas | Filtrar el cronograma después de un pago | positivo | A |
| RF-G3-07 Cuotas | Filtrar cuotas con un estado inválido | negativo | A |
| RF-G3-08 Pagar | Pagar una cuota pendiente | positivo, smoke | A |
| RF-G3-08 Pagar | No se puede pagar dos veces la misma cuota | negativo | A |
| RF-G3-08 Pagar | Pagar todas las cuotas cancela el préstamo | positivo | A |
| RF-G3-08 Pagar | Pagar una cuota fuera de orden | brecha | A |
| RF-G3-08 Pagar | Pagar una cuota inexistente | negativo | A |
| RF-G3-08 Pagar | Rechazar el pago si el préstamo no está aprobado (solicitado / pagado) | negativo | A |
| RF-G3-08 Pagar | Pagar una cuota vencida sin recargo | positivo (datos sembrados) | A |
| RF-G3-08 Pagar | La web solo permite pagar la próxima cuota | regla de UI | W |

RF-G3-TK (token del grupo) queda fuera: los escenarios usan la API key del curso.

## Estado de ejecución

- El escenario `@smoke` web existente sigue **activo** en el CI, sin cambios.
- Los escenarios nuevos llevan `@wip`: el CI los excluye (`tags: 'not @wip'`) hasta que la tarea de
  Cucumber + Playwright implemente sus steps.
- Verificación: `npx cucumber-js --config tests/bdd/sandbox-pom/cucumber.js --profile dryrun` pasa
  en modo estricto; incluyendo `@wip`, los dos features se parsean sin errores (52 escenarios).

Para ver los snippets de los steps que faltan:

```bash
npx cucumber-js --profile wip grupos/grupo-03-prestamos/features
```
