# M_EJEMPLO_SALIDA — ejemplo de Markdown generado por markitdown-skill

> Ejemplo ilustrativo del formato de salida de `/markitdown:convert`.
> Origen ficticio: `grupo-00-ejemplo.pdf`.

## 1. Alcance y actores

Cubre el CRUD de un recurso del sandbox y su operación principal.

| Actor | Descripción |
| ----- | ----------- |
| Alumno / QA automatizador | Consume la API con su propia API key |
| API REST | Ejecuta la lógica de negocio con SQL fijo |

## 2. Endpoints del módulo

| Método y ruta | Requerimiento | Descripción |
| ------------- | ------------- | ----------- |
| GET /api/v1/recurso | RF-GX-01 | Lista recursos activos |
| POST /api/v1/recurso | RF-GX-02 | Crea un recurso nuevo |

## 3. Criterios de aceptación

- Al listar con filtro válido, todos los elementos cumplen el filtro.
- Al crear con datos válidos, la respuesta es 201 y el estado inicial es el esperado.
- Al repetir un valor único, la respuesta es 409 CONFLICT.
