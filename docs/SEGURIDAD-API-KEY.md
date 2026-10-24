# API key de la sandbox — exposición y rotación

## Qué pasó

La API key del **curso 2** (`sbx_c2_...`) quedó hardcodeada en colecciones y specs de Postman
commiteadas en `main`, y también en el PR #39 (plan JMeter del Grupo 1, cerrado, desde un fork).
Además había una segunda key (`sbx_c2_...`, distinta) en `postman/specs/test/test.yaml` y una
key con formato real (`sbx_demo_...`) como variable de colección en
`postman/aiquaa Sandbox API.postman_collection.json`.

Este cambio reemplaza los valores por variables, pero **no reescribe el historial**: las keys
siguen en commits viejos y en las refs del PR #39 (`refs/pull/39/head`), que GitHub no deja
borrar. El repo es público, así que hay que asumir que las keys están comprometidas.

## Rotación (la hace el docente)

1. En la sandbox, revocar las keys expuestas y generar nuevas:
   - la `sbx_c2_...` del curso 2 (la que usan las colecciones de los grupos);
   - la `sbx_c2_...` que estaba en `postman/specs/test/test.yaml`;
   - confirmar si la `sbx_demo_...` era una key real; si lo era, revocarla también.
2. Actualizar los secrets del repo con la key nueva:
   - `API_KEY` (environment `api_key`: workflows de JMeter y Newman de los grupos);
   - `SANDBOX_API_KEY` (job manual de Newman en `qa-checks.yml`).
3. Pasar la key nueva a los alumnos por el canal del curso (nunca por el repo ni por un issue/PR).

## Cómo se usa la key ahora

| Herramienta | Dónde va la key | Cómo se referencia |
|---|---|---|
| Postman (local) | Environment, columna *Current value* (no se sincroniza ni exporta) | `{{apiKey}}` o `{{api_key}}`, según la colección |
| Newman (CI) | Secret del repo | `--env-var "apiKey=${{ secrets.SANDBOX_API_KEY }}"` / `--env-var "api_key=${{ secrets.API_KEY }}"` |
| JMeter | Propiedad `-J` en la línea de comandos | `${__P(api_key,)}` en el plan; `-Japi_key="$API_KEY"` |
| Playwright / Cucumber | `.env` (`API_KEY`), ignorado por git | `process.env.API_KEY` |

Si exportás un environment o una colección para compartirla, borrá antes el valor de la key.
Cuidado con el *Generated from cURL* de Postman: copia el header completo en la descripción.

## Check en CI

El job **secret-scan** de `.github/workflows/qa-checks.yml` corre en cada PR y push a `main`
y falla si encuentra el patrón `sbx_[A-Za-z0-9_-]{20,}` en archivos versionados. El log solo
muestra archivo, línea y los primeros caracteres.

Placeholders permitidos (para ejemplos y casos negativos): `sbx_alumno01_xxx...`,
`sbx_demo_xxx...`, `sbx_invalida_000...`, `sbx_esta_key_no_existe`. Los cortos
(`sbx_alumno01_xxx`, `sbx_invalida_00000000`) ni siquiera llegan a matchear el patrón.
