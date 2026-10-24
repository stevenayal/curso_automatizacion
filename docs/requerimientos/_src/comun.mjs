// Metadatos y secciones compartidas por los 5 documentos del curso 2 (Banca).

export const META = {
  curso: "Curso de Automatización de Pruebas de Software",
  institucion: "Universidad Nacional de Asunción — CIT",
  profesor: "Steven Gracia",
  version: "1.0",
  fecha: "10 de octubre de 2026",
  sistemas: "aiquaa-sandbox-api (REST, `/api/v2`) y aiquaa-sandbox-web (front, `/v2`)",
  fuenteLogica: "Código fuente de ambos repositorios y scripts SQL del schema qa_training_v2",
  aviso:
    "Documento derivado del código fuente de aiquaa-sandbox-api y aiquaa-sandbox-web. " +
    "Describe el comportamiento realmente implementado en el sandbox de práctica, no un " +
    "sistema bancario productivo. El anexo normativo es material de referencia orientativo.",
};

export const COMUN = {
  actores: [
    [
      "Alumno / QA automatizador",
      "Consume la API con la API key de su grupo (o con un token JWT de grupo) y automatiza escenarios BDD sobre el módulo de su grupo.",
    ],
    [
      "Cliente del banco (fila de `usuarios`)",
      "Identidad de dominio sobre la que operan los endpoints: es titular de cuentas, tarjetas, préstamos, beneficiarios, planes de ahorro y depósitos.",
    ],
    [
      "API REST (aiquaa-sandbox-api)",
      "Ejecuta la lógica de negocio con SQL fijo sobre el schema `qa_training_v2`, bajo el rol de base de datos `qa_api` (SELECT + INSERT + UPDATE, sin DELETE).",
    ],
    [
      "Aplicación web (aiquaa-sandbox-web)",
      "Interfaz tipo home banking que consume la API a través del proxy `/api/proxy/v2/{path}`; nunca llama al backend directamente desde el navegador.",
    ],
  ],

  precondiciones: [
    "**Base URL de la API:** `https://aiquaa-sandbox-api.vercel.app`. La documentación interactiva del curso está en `/docs/v2` y la especificación OpenAPI en `GET /api/v2/docs`. La aplicación web está en `https://aiquaa-sandbox-web.vercel.app`.",
    "Toda request debe autenticarse por una de dos vías: el header `x-api-key` con una clave activa de `public.api_keys`, o el header `Authorization: Bearer <token>` con un JWT de grupo vigente. Si se envían ambos, manda `x-api-key`. Sin credenciales, o con credenciales inválidas, inactivas o vencidas, la respuesta es `401 UNAUTHORIZED` con un mensaje genérico que no indica cuál fue el motivo.",
    "Las rutas bajo `/api/v2` solo aceptan credenciales del **curso 2**: una API key válida pero del curso 1 recibe `403 FORBIDDEN` con el mensaje \"Esta API key pertenece al curso 1 y esta ruta es del curso 2.\". El gate es simétrico: una key del curso 2 tampoco sirve en `/api/v1`.",
    "Cada credencial admite un máximo de **30 requests por minuto** (ventana deslizante, contada por API key o por usuario del token, no por IP). Superado el límite la API responde `429 RATE_LIMITED` con los headers `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset`.",
    "Los datos de práctica viven en el schema aislado `qa_training_v2` (10 tablas) y se cargan con `scripts/seed-data-v2.sql`: 8 clientes (más un cliente por grupo, usado por el login de token), 12 cuentas, 20 movimientos, 10 tarjetas, 6 préstamos con sus cuotas, 10 beneficiarios, 12 transferencias, 6 planes de ahorro y 6 depósitos. La data inicial es determinística, pero **el sandbox es compartido por los cinco grupos**: los registros sembrados pueden haber sido modificados por otra suite. Un escenario robusto crea sus propios datos en lugar de depender del estado de una fila sembrada.",
    "**Clientes de soporte:** `GET|POST /api/v2/usuarios` y `GET|PUT|DELETE /api/v2/usuarios/{id}` no pertenecen a ningún grupo y están disponibles para todos; sirven para crear el titular de los productos de cada escenario. `GET /usuarios` acepta el filtro `email`; `POST` exige `nombre`, `email` y `documentoNumero` (email y documento son únicos: repetirlos da `409 CONFLICT`).",
    "**Sandbox SQL:** `POST /api/v2/sql/select` y `POST /api/v2/sql/update` reciben `{ \"sql\", \"params\" }` y permiten consultar o preparar datos directamente sobre las 10 tablas del curso. Admiten un único statement por request, con placeholders `$1..$n`; el `UPDATE` exige cláusula `WHERE`. Son la vía para verificar en base lo que hizo un endpoint, o para forzar un estado que la API no produce.",
    "La API no expone borrado físico: el rol `qa_api` no tiene permiso `DELETE` en Postgres, y todo endpoint `DELETE` hace baja lógica (`activo = false`, o `activa = false` en `cuentas`) y devuelve `204 No Content` sin cuerpo. Una fila dada de baja deja de verse en `GET`, `PUT` y `DELETE`, pero sigue existiendo en la base.",
    "En la aplicación web el acceso tiene tres capas, en orden: elegir el curso (`/curso`, opción 2), cargar la API key del curso (`/login`, que valida que la key sea del curso elegido) y elegir el cliente con el que se opera (`/auth/login`, por email de un cliente activo). Las pantallas `/v2/usuarios/*` son la excepción a la tercera capa: se pueden usar solo con la API key, porque son el punto de partida para crear un cliente.",
  ],

  transversalIntro:
    "Todas las rutas REST comparten el mismo pipeline: autenticación → control de cohorte (curso) → control de caudal → validación de entrada → ejecución del SQL fijo → auditoría. Estas reglas aplican a cada requerimiento del documento y no se repiten en cada uno.",

  transversales: [
    "**Envoltura de respuesta:** las respuestas exitosas devuelven `{ \"data\": ... }` y las fallidas `{ \"error\": { \"code\", \"message\", \"details?\" } }`.",
    "**Tipos en la respuesta:** los identificadores (`id`, `usuario_id`, `cuenta_id`, ...) viajan como **número**; los importes y tasas (`saldo`, `monto`, `limite_credito`, `tasa_anual`, ...) viajan como **texto con dos decimales** (por ejemplo `\"5000000.00\"`), por ser valores numéricos exactos de la base; las fechas sin hora viajan como `YYYY-MM-DD` y las marcas de tiempo (`created_at`, `fecha_pago`) en formato ISO 8601. Una aserción sobre un importe debe comparar contra texto o convertir a número antes.",
    "**Validación de entrada:** cada ruta define un esquema; los parámetros de query, el cuerpo JSON y los parámetros de ruta se combinan en un único objeto con precedencia query < body < path (un `{id}` de la URL siempre gana sobre un `id` del cuerpo). Los campos no declarados en el esquema se ignoran sin error.",
    "**Coerción de tipos:** los identificadores (`id`, `usuarioId`, `cuentaId`, ...) se convierten de texto a número automáticamente, vengan por query, por ruta o en el cuerpo. Los **importes, tasas y plazos del cuerpo JSON deben enviarse como número**: enviarlos como texto (`\"monto\": \"1000\"`) devuelve `400 VALIDATION_ERROR`.",
    "**Cuerpo JSON:** un cuerpo que no parsea como JSON devuelve `400 VALIDATION_ERROR` con el mensaje \"Invalid JSON body.\"; un cuerpo vacío se interpreta como `{}`. Un fallo del esquema devuelve `400 VALIDATION_ERROR` con el mensaje \"Invalid request.\" y el detalle del campo en `error.details`.",
    "**Reglas de negocio → 409:** cuando el cuerpo es válido pero el estado actual del recurso no permite la operación (saldo insuficiente, recurso en un estado que no admite la acción), la respuesta es `409 CONFLICT` con un mensaje en español que describe la regla. `400` queda para entradas inválidas.",
    "**Errores de base de datos, mapeados por código SQLSTATE:** una violación de unicidad (`23505`) se traduce a `409 CONFLICT`; una violación de clave foránea o de restricción `CHECK` (`23503`/`23514`, por ejemplo un `usuarioId` inexistente) se traduce a `400 VALIDATION_ERROR`; cualquier otro error de base de datos (una fecha imposible, un número fuera de rango) cae en `400 EXECUTION_ERROR`. En los tres casos el `message` es el texto crudo de Postgres.",
    "**Importes con más de dos decimales:** la API no valida la cantidad de decimales; la base redondea a dos al guardar.",
    "**Operaciones que mueven dinero:** se ejecutan en una transacción con bloqueo de las filas involucradas; si alguna validación falla, no queda ningún cambio parcial (ni saldo modificado ni movimiento registrado).",
    "**Listados:** devuelven como máximo 100 filas ordenadas por identificador ascendente, sin paginación ni indicación de que hubo recorte. Los filtros opcionales se combinan entre sí (`AND`).",
    "**Headers de caudal:** toda respuesta que pasó el control de caudal incluye `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset` (este último en milisegundos Unix).",
    "**Verbo no soportado:** una ruta que no define el método HTTP usado responde `405 Method Not Allowed`; lo genera el framework y su cuerpo no sigue la envoltura `{ error }` del resto de la API.",
    "**Auditoría:** las requests quedan registradas en `public.sql_audit_log` con la credencial usada, el método y la ruta, la entrada validada, el resultado y la IP de origen. Un fallo de auditoría nunca convierte una respuesta exitosa en error.",
    "**Sin control de titularidad:** la API no tiene roles ni noción de \"mis\" productos. Cualquier credencial válida del curso puede leer y modificar los recursos de cualquier cliente, y ningún endpoint verifica que la cuenta indicada pertenezca al `usuarioId` indicado.",
  ],

  errores: [
    ["`UNAUTHORIZED`", "401", "Faltan credenciales, la API key no existe o está inactiva, o el token es inválido o venció."],
    ["`FORBIDDEN`", "403", "La credencial es válida pero es de otro curso, o las credenciales de un grupo se usaron en la ruta de token de otro grupo."],
    ["`RATE_LIMITED`", "429", "Se superaron las 30 requests por minuto de esa credencial."],
    ["`VALIDATION_ERROR`", "400", "La entrada no cumple el esquema de la ruta, el JSON es inválido, o Postgres rechazó una clave foránea/CHECK."],
    ["`EXECUTION_ERROR`", "400", "La consulta falló en la base de datos por un motivo no cubierto por los códigos anteriores."],
    ["`NOT_FOUND`", "404", "El recurso indicado no existe o ya está dado de baja."],
    ["`CONFLICT`", "409", "Regla de negocio violada sobre un recurso que existe, o violación de una restricción `UNIQUE`."],
    ["`INTERNAL_ERROR`", "500", "Fallo inesperado del servidor (por ejemplo, no se pudo verificar la API key)."],
  ],

  statusExito: [
    ["`200 OK`", "GET/PUT/PATCH exitoso, y las acciones que cambian un estado sin crear un registro (bloquear, activar, aprobar, pagar una cuota, anular, cancelar)."],
    ["`201 Created`", "POST que crea un recurso o registra un movimiento de dinero nuevo."],
    ["`204 No Content`", "DELETE exitoso (baja lógica) — la respuesta no lleva cuerpo."],
  ],

  webIntro:
    "La aplicación web consume exactamente los mismos endpoints a través del proxy `/api/proxy/v2/{path}`, que agrega la API key del lado del servidor y reenvía los headers de límite de caudal. El menú muestra los módulos del grupo del alumno (más \"Clientes\", siempre visible) cuando su email figura en el roster del curso; si no figura, muestra todos. Cada listado arranca filtrado por el cliente con el que se inició sesión y permite cambiar a otro titular o a \"todos\"; la búsqueda, el orden y la paginación de los listados se resuelven en el navegador. **El front es deliberadamente más estricto que la API en varios puntos**: esas reglas están marcadas como \"regla de UI\" y solo se pueden probar por pantalla — la misma operación enviada directo a la API es aceptada. Los errores de la API se muestran en pantalla con el mensaje que devolvió el backend, y un `401` cierra la sesión local.",

  criteriosIntro:
    "Criterios de aceptación redactados en prosa, uno o más por requerimiento, cubriendo el camino feliz y los caminos negativos. Son la base para derivar escenarios BDD.",

  avisoNormativo:
    "Este anexo es material de referencia orientativo para dar contexto de negocio a los escenarios de prueba. Las normas citadas del Banco Central del Paraguay (BCP) y de la Secretaría de Defensa del Consumidor y el Usuario (SEDECO) se mencionan de forma general y deben validarse con su texto vigente antes de usarse como criterio de cumplimiento. El sandbox es un entorno didáctico y no pretende cumplir ninguna de ellas.",
};

// Requerimiento compartido: cada grupo tiene su propia ruta de token, con la
// misma lógica (lib/group-token-route.ts en aiquaa-sandbox-api).
export function rfToken(n, username, otroGrupo) {
  const id = `RF-G${n}-TK`;
  return {
    id,
    nombre: "Obtener el token del grupo",
    endpoint: `POST /api/v2/g${n}/auth/token`,
    descripcion:
      "Intercambia el usuario y la contraseña del grupo por un token JWT que puede usarse en lugar de la API key en cualquier ruta del curso. La ruta en sí también exige estar autenticado (API key del curso 2 o un token vigente).",
    entradas: [
      `\`username\` (obligatorio): texto de 1 a 64 caracteres. El usuario del grupo es \`${username}\`.`,
      "`password` (obligatorio): texto de 1 a 200 caracteres. Se entrega por el canal del curso; no se publica en este documento.",
    ],
    reglas: [
      "La contraseña se compara en la base de datos contra un hash bcrypt; nunca se devuelve ni se registra en claro.",
      "Usuario inexistente, contraseña incorrecta y credencial inactiva devuelven el mismo `400 VALIDATION_ERROR` con el mensaje \"Usuario o password inválidos.\": la respuesta no revela cuál de los tres falló. Es `400` y no `401` a propósito, para no confundirlo con el fallo de la API key.",
      `Si las credenciales son válidas pero pertenecen a otro grupo, la respuesta es \`403 FORBIDDEN\` con el mensaje "Estas credenciales pertenecen al grupo ${otroGrupo} y esta ruta es del grupo ${n}.".`,
      "El token es un JWT firmado con HS256, emitido por `aiquaa-sandbox`, con vigencia de **3600 segundos**. Sus claims (`sub`, `usuarioId`, `grupo`, `curso`) son legibles: el token está firmado, no cifrado.",
      "El token identifica al grupo pero no restringe por grupo: con él se puede operar sobre los recursos de cualquier módulo del curso 2.",
      "La emisión no deja rastro en tablas de dominio (el curso 2 no tiene tabla de sesiones); solo queda la fila de auditoría.",
    ],
    respuesta: [
      `\`200 OK\` con \`data\` conteniendo \`token\`, \`tokenType\` (\`Bearer\`), \`expiresIn\` (\`3600\`), \`grupo\` (\`${n}\`), \`grupoNombre\`, \`curso\` (\`2\`) y \`usuario\` (\`id\`, \`nombre\`, \`email\`, \`username\`).`,
    ],
    errores: [
      ["`VALIDATION_ERROR`", "400", "Falta `username` o `password`, están vacíos, o la combinación no es válida."],
      ["`FORBIDDEN`", "403", "Las credenciales son de otro grupo, o la API key usada para llamar es del curso 1."],
      ["`UNAUTHORIZED`", "401", "La request no trae API key ni token."],
    ],
    fuente: `\`app/api/v2/g${n}/auth/token/route.ts\`, \`lib/group-token-route.ts\` y \`lib/jwt.ts\``,
    criterios: [
      `Con el usuario y la contraseña del grupo ${n}, la respuesta es 200, \`data.tokenType\` es \`Bearer\`, \`data.expiresIn\` es 3600 y \`data.grupo\` es ${n}.`,
      "Una request posterior a cualquier endpoint del módulo enviando solo `Authorization: Bearer <token>` (sin `x-api-key`) responde con éxito.",
      "Con una contraseña incorrecta, la respuesta es 400 `VALIDATION_ERROR` con el mensaje \"Usuario o password inválidos.\"; con un usuario inexistente, la respuesta es idéntica.",
      `Con las credenciales válidas del grupo ${otroGrupo} sobre esta ruta, la respuesta es 403 \`FORBIDDEN\`.`,
      "Con un token alterado o vencido en el header `Authorization`, cualquier endpoint responde 401 `UNAUTHORIZED`.",
    ],
  };
}
