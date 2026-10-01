# Colección de práctica — Sandbox API v2

Colección guiada para practicar testing de APIs con Postman sobre el sandbox del **curso 2**
(`https://aiquaa-sandbox-api.vercel.app/api/v2`). Crea sus propios datos, los valida (por API
y contra la base) y al final los limpia, así se puede correr las veces que haga falta.

| Archivo | Qué es |
|---|---|
| `Practica - Sandbox API v2.postman_collection.json` | La colección |
| `practica-v2.postman_environment.json` | Environment con `baseUrl` y `apiKey` (vacía) |

## Cómo empezar

1. En Postman: **Import** → seleccionar los dos archivos de esta carpeta.
2. Elegir el environment **Practica - Sandbox v2** (arriba a la derecha).
3. En el environment, cargar la `apiKey` que entregó el docente en la columna *Current value*.
   Solo la de **curso 2** (`sbx_c2_...`) funciona contra `/api/v2`: la del curso 1 da `403`.
4. Correr la colección carpeta por carpeta, **en orden**: cada una usa variables que guarda la
   anterior (`usuarioId`, `cuentaOrigenId`, `transferenciaId`, …).

> La API key **nunca** va en la colección ni se commitea. Si exportás el environment para
> compartirlo, borrá antes el valor.

## Qué se practica en cada carpeta

| Carpeta | Conceptos |
|---|---|
| **00 - Preparación** | Datos dinámicos con `Date.now()`, `pm.collectionVariables.set` |
| **01 - Primeros pasos (GET)** | Status, headers, estructura del body, tipos, JSON Schema, query params, encadenar requests |
| **02 - Casos negativos** | `401` sin key / key inválida, `404`, `400` de validación, `409` por duplicado. Auth a nivel request |
| **03 - CRUD de cuenta** | POST / GET / PUT, depósitos, reglas de negocio (saldo insuficiente) |
| **04 - Transferencia + SQL** | Patrón pre-request / post-response: foto de saldos en la base antes y después, `pm.sendRequest` |
| **05 - Estados de cuenta** | PATCH vs PUT, transiciones de estado (`activa` → `bloqueada`, `cerrada` con saldo) |
| **06 - Ejercicios** | Requests armados **sin tests**: leer la consigna en la pestaña *Docs* y escribir las validaciones |
| **99 - Limpieza** | Vaciar y eliminar (soft-delete) lo creado; verificar el soft-delete por SQL |

Además, la colección tiene scripts **a nivel colección** que corren en todos los requests:

- *Pre-request:* corta la corrida con un mensaje claro si falta la `apiKey`, y deja disponible
  la función `sqlSelect` para consultar la base desde cualquier script:

  ```js
  const sqlSelect = eval(pm.collectionVariables.get('sqlSelect'));
  sqlSelect('SELECT saldo FROM cuentas WHERE id = $1', [123], (err, filas) => { /* ... */ });
  ```

- *Post-response:* valida que toda respuesta llegue en menos de 5 s y que no haya `429`.

## Rate limit

La API acepta **30 requests por minuto por key**, y los `pm.sendRequest` de los scripts también
cuentan. En el **Collection Runner** poner *Delay* en **2500 ms**. Si aparece un `429`, esperar un
minuto y seguir.

## Correr con Newman

```bash
npm run test:practica
```

Toma la key de la variable de entorno `API_KEY` (la misma del `.env`). Equivale a:

```bash
npx newman run "postman/practica/Practica - Sandbox API v2.postman_collection.json" -e postman/practica/practica-v2.postman_environment.json --env-var "apiKey=$API_KEY" --delay-request 2500
```

## Ideas para seguir practicando

- Resolver los 4 ejercicios de la carpeta **06**.
- Agregar un caso de transferencia entre cuentas de **distinta moneda** (PYG → USD) y validar el `409`.
- Pasar las aserciones repetidas a una función reutilizable a nivel colección, como `sqlSelect`.
- Parametrizar `montoDeposito` y `montoTransferencia` con un archivo CSV en el Runner (`-d datos.csv`).
- Duplicar la colección en `grupos/grupo-0N-modulo/postman/` y adaptarla al módulo del grupo.
