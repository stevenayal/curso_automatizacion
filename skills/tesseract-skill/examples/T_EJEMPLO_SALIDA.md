# T_EJEMPLO_SALIDA — ejemplo de texto generado por tesseract-skill

> Ejemplo ilustrativo del formato de salida de `/tesseract:ocr`.
> Origen ficticio: `grupo-00-ejemplo.png` (captura de pantalla), lang=spa.

Modulo Recurso - Requerimientos

1. Alcance y actores

Cubre el CRUD de un recurso del sandbox y su operacion principal.

Actor: Alumno / QA automatizador - Consume la API con su propia API key
Actor: API REST - Ejecuta la logica de negocio con SQL fijo

2. Endpoints del modulo

GET /api/v1/recurso (RF-GX-01) - Lista recursos activos
POST /api/v1/recurso (RF-GX-02) - Crea un recurso nuevo

3. Criterios de aceptacion

- Al listar con filtro valido, todos los elementos cumplen el filtro.
- Al crear con datos validos, la respuesta es 201 y el estado inicial es el esperado.
- Al repetir un valor unico, la respuesta es 409 CONFLICT.
