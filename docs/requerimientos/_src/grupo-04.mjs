import { rfToken } from "./comun.mjs";

export const grupo = {
  n: 4,
  slug: "grupo-04-transferencias-pagos",
  titulo: "Transferencias y Pagos",
  modulo: "Módulo: Transferencias, beneficiarios, importes y estados",

  alcance:
    "Cubre la agenda de beneficiarios de un cliente (alta, consulta, modificación y baja) y las transferencias de dinero desde una cuenta: internas, hacia otra cuenta del sandbox, o externas, hacia un beneficiario agendado de otro banco. La transferencia se ejecuta en el momento —debita el origen, acredita el destino si es interna y registra los movimientos— y puede anularse con un contraasiento.",
  fueraDeAlcance:
    "El pago de facturas y servicios (en este curso \"pagos\" son las transferencias a beneficiarios); las transferencias programadas o recurrentes; la conversión de moneda; comisiones e impuestos; los límites por operación o por día (solo existen en la pantalla web); y la liquidación real hacia otro banco: una transferencia externa debita el origen y no acredita ninguna cuenta.",

  endpoints: [
    { ruta: "GET /api/v2/beneficiarios", rf: "RF-G4-01", desc: "Lista beneficiarios vigentes, opcionalmente por cliente." },
    { ruta: "POST /api/v2/beneficiarios", rf: "RF-G4-02", desc: "Agenda un beneficiario para un cliente." },
    { ruta: "GET /api/v2/beneficiarios/{id}", rf: "RF-G4-03", desc: "Devuelve el detalle de un beneficiario." },
    { ruta: "PUT /api/v2/beneficiarios/{id}", rf: "RF-G4-04", desc: "Reemplaza los datos de un beneficiario." },
    { ruta: "DELETE /api/v2/beneficiarios/{id}", rf: "RF-G4-05", desc: "Da de baja un beneficiario." },
    { ruta: "GET /api/v2/transferencias", rf: "RF-G4-06", desc: "Lista transferencias, por cuenta de origen y/o estado." },
    { ruta: "POST /api/v2/transferencias", rf: "RF-G4-07", desc: "Ejecuta una transferencia interna o a un beneficiario." },
    { ruta: "GET /api/v2/transferencias/{id}", rf: "RF-G4-08", desc: "Devuelve el detalle de una transferencia." },
    { ruta: "POST /api/v2/transferencias/{id}/anular", rf: "RF-G4-09", desc: "Anula una transferencia completada y revierte el dinero." },
    { ruta: "POST /api/v2/g4/auth/token", rf: "RF-G4-TK", desc: "Emite el token JWT del grupo." },
  ],

  precondiciones: [
    "Para transferir se necesita una cuenta de origen `activa` con saldo suficiente. Una cuenta recién abierta nace en cero: hay que fondearla con `POST /api/v2/cuentas/{id}/movimientos` (tipo `credito`) antes de transferir.",
    "Una transferencia interna requiere además una cuenta de destino `activa` y en la misma moneda que el origen; una externa requiere un beneficiario vigente.",
    "Los endpoints de cuentas (`/api/v2/cuentas/**`) pertenecen al Grupo 1, pero este módulo los usa para preparar datos y para verificar saldos y movimientos después de transferir.",
    "Datos sembrados: 10 beneficiarios (el 8 está dado de baja) y 12 transferencias con los cuatro estados representados: `completada`, `pendiente` (5 y 11), `rechazada` (7) y `anulada` (9). Las cuentas 2, 7 y 12 son en dólares; la cuenta 8 está `bloqueada` y la 10 `cerrada`.",
  ],

  tablas: [
    {
      nombre: "beneficiarios",
      desc: "Agenda de destinos externos de cada cliente: cuentas de terceros en otros bancos.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`usuario_id`", "`bigint`, obligatorio, referencia a `usuarios(id)`: el cliente dueño de la agenda"],
        ["`nombre`", "`text`, obligatorio: titular de la cuenta destino"],
        ["`banco`", "`text`, obligatorio; texto libre"],
        ["`numero_cuenta`", "`text`, obligatorio; único por cliente (`usuario_id` + `numero_cuenta`)"],
        ["`alias`", "`text`, opcional"],
        ["`activo`", "`boolean`, obligatorio, por defecto `true`; `false` = dado de baja"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
    {
      nombre: "transferencias",
      desc: "Transferencias ejecutadas. Cada una tiene exactamente un destino: una cuenta interna o un beneficiario, nunca ambos ni ninguno.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`cuenta_origen_id`", "`bigint`, obligatorio, referencia a `cuentas(id)`"],
        ["`cuenta_destino_id`", "`bigint`, opcional, referencia a `cuentas(id)`; debe ser distinta de la de origen"],
        ["`beneficiario_id`", "`bigint`, opcional, referencia a `beneficiarios(id)`"],
        ["`monto`", "`numeric(14,2)`, obligatorio, mayor que cero"],
        ["`moneda`", "`text`, `PYG` o `USD`; la API copia la moneda de la cuenta de origen"],
        ["`concepto`", "`text`, opcional"],
        ["`referencia`", "`text`, obligatoria y única; la genera la API"],
        ["`estado`", "`text`, uno de `pendiente` / `completada` / `rechazada` / `anulada`; por defecto `completada`"],
        ["`activo`", "`boolean`, por defecto `true`; ningún endpoint lo cambia"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
  ],

  notaDatos:
    "Una transferencia mueve dinero de verdad dentro del sandbox: después de ejecutarla, el saldo del origen baja y —si es interna— el del destino sube, y cada cuenta afectada recibe un movimiento con `referencia_tipo = 'transferencia'` y `referencia_id` igual al id de la transferencia. La referencia generada tiene la forma `TRF-` + fecha y hora con milisegundos + `-` + id de la cuenta de origen; las sembradas usan otro formato (`TRF-2026-0001`).",

  rf: [
    {
      id: "RF-G4-01",
      nombre: "Listar beneficiarios",
      endpoint: "GET /api/v2/beneficiarios",
      descripcion: "Devuelve los beneficiarios vigentes, con la posibilidad de acotar a la agenda de un cliente.",
      entradas: ["`usuarioId` (opcional, por query): número entero positivo."],
      reglas: [
        "Devuelve únicamente beneficiarios no dados de baja (`activo = true`).",
        "Sin `usuarioId` devuelve beneficiarios de todos los clientes.",
        "Un cliente sin beneficiarios, o un `usuarioId` inexistente, devuelve una lista vacía y no un error.",
        "Máximo 100 filas, ordenadas por identificador ascendente.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de beneficiarios; cada elemento incluye `id`, `usuario_id`, `nombre`, `banco`, `numero_cuenta`, `alias`, `activo` y `created_at`.",
      ],
      errores: [["`VALIDATION_ERROR`", "400", "`usuarioId` no es un entero positivo."]],
      fuente: "`app/api/v2/beneficiarios/route.ts`",
      criterios: [
        "Al listar sin filtro, la respuesta es 200 y ningún elemento tiene `activo` en falso.",
        "Al filtrar por un cliente, todos los elementos devueltos tienen ese `usuario_id`.",
        "Al filtrar por un cliente sin beneficiarios, la respuesta es 200 con un arreglo vacío.",
        "Un beneficiario dado de baja con RF-G4-05 deja de aparecer en el listado.",
      ],
    },
    {
      id: "RF-G4-02",
      nombre: "Agendar un beneficiario",
      endpoint: "POST /api/v2/beneficiarios",
      descripcion: "Agrega a la agenda de un cliente una cuenta de otro banco a la que podrá transferir.",
      entradas: [
        "`usuarioId` (obligatorio): número entero positivo del cliente dueño de la agenda.",
        "`nombre` (obligatorio): texto no vacío.",
        "`banco` (obligatorio): texto no vacío.",
        "`numeroCuenta` (obligatorio): texto no vacío.",
        "`alias` (opcional): texto libre.",
      ],
      reglas: [
        "Un mismo cliente no puede agendar dos veces el mismo número de cuenta: responde 409 `CONFLICT`. Dos clientes distintos sí pueden agendar el mismo número.",
        "La unicidad incluye a los beneficiarios dados de baja: volver a agendar un número que ese cliente tuvo y dio de baja también responde 409.",
        "El cliente debe existir; un `usuarioId` inexistente es rechazado por la clave foránea.",
        "**No se valida el formato del número de cuenta ni que el banco exista**: ambos son texto libre. El alias no es único.",
      ],
      respuesta: ["`201 Created` con `data` conteniendo el beneficiario creado."],
      errores: [
        ["`VALIDATION_ERROR`", "400", "Falta un campo obligatorio, está vacío, o el `usuarioId` no existe."],
        ["`CONFLICT`", "409", "Ese cliente ya tiene (o tuvo) un beneficiario con el mismo número de cuenta."],
      ],
      fuente: "`app/api/v2/beneficiarios/route.ts`",
      criterios: [
        "Al agendar un beneficiario válido, la respuesta es 201 y `data.activo` es verdadero.",
        "Al agendar sin `alias`, la respuesta es 201 y `data.alias` es nulo.",
        "Al agendar por segunda vez el mismo `numeroCuenta` para el mismo cliente, la respuesta es 409 `CONFLICT`.",
        "Al agendar el mismo `numeroCuenta` para otro cliente, la respuesta es 201.",
        "Al agendar con `nombre` vacío o sin `banco`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al agendar para un `usuarioId` inexistente, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G4-03",
      nombre: "Consultar un beneficiario",
      endpoint: "GET /api/v2/beneficiarios/{id}",
      descripcion: "Devuelve el detalle de un beneficiario puntual.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: ["Si no existe o está dado de baja, responde 404 con el mensaje \"Beneficiario no encontrado.\"."],
      respuesta: ["`200 OK` con `data` conteniendo el beneficiario completo."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un beneficiario vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/beneficiarios/[id]/route.ts`",
      criterios: [
        "Dado un beneficiario recién agendado, al consultarlo la respuesta es 200 y sus datos coinciden con los enviados.",
        "Al consultar un identificador inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Beneficiario no encontrado.\".",
        "Al consultar el beneficiario sembrado 8 (dado de baja), la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G4-04",
      nombre: "Modificar un beneficiario",
      endpoint: "PUT /api/v2/beneficiarios/{id}",
      descripcion: "Reemplaza nombre, banco, número de cuenta y alias de un beneficiario.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`nombre`, `banco` y `numeroCuenta` (obligatorios): textos no vacíos.",
        "`alias` (opcional): texto libre.",
      ],
      reglas: [
        "Es un reemplazo: omitir `alias` lo deja nulo, aunque antes tuviera valor.",
        "El dueño de la agenda (`usuario_id`) no se puede cambiar.",
        "Cambiar el número de cuenta por uno que ese cliente ya tiene agendado responde 409 `CONFLICT`.",
        "Modificar un beneficiario no altera las transferencias ya hechas hacia él.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo el beneficiario ya actualizado."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un beneficiario vigente con ese identificador."],
        ["`CONFLICT`", "409", "El nuevo número de cuenta ya está agendado por ese cliente."],
        ["`VALIDATION_ERROR`", "400", "Falta un campo obligatorio o está vacío."],
      ],
      fuente: "`app/api/v2/beneficiarios/[id]/route.ts`",
      criterios: [
        "Dado un beneficiario existente, al cambiar su `banco` la respuesta es 200 y el cambio se refleja al volver a consultarlo.",
        "Al modificar sin enviar `alias`, la respuesta es 200 y `data.alias` queda nulo.",
        "Al cambiar el `numeroCuenta` por el de otro beneficiario del mismo cliente, la respuesta es 409 `CONFLICT`.",
        "Al modificar un beneficiario inexistente o dado de baja, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G4-05",
      nombre: "Dar de baja un beneficiario",
      endpoint: "DELETE /api/v2/beneficiarios/{id}",
      descripcion: "Quita un beneficiario de la agenda mediante baja lógica.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Marca `activo = false`; la fila permanece en la base.",
        "No verifica transferencias asociadas: un beneficiario con transferencias se puede dar de baja, y esas transferencias siguen consultables.",
        "Un beneficiario dado de baja ya no puede usarse como destino de una transferencia nueva.",
      ],
      respuesta: ["`204 No Content`, sin cuerpo."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un beneficiario vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/beneficiarios/[id]/route.ts`",
      criterios: [
        "Dado un beneficiario vigente, al darlo de baja la respuesta es 204 sin cuerpo.",
        "Tras la baja, RF-G4-03 responde 404 y el beneficiario deja de aparecer en RF-G4-01.",
        "Tras la baja, una transferencia hacia ese beneficiario responde 404 `NOT_FOUND` con el mensaje \"Beneficiario no encontrado.\".",
        "Dar de baja dos veces el mismo beneficiario devuelve 204 la primera vez y 404 la segunda.",
      ],
    },
    {
      id: "RF-G4-06",
      nombre: "Listar transferencias",
      endpoint: "GET /api/v2/transferencias",
      descripcion: "Devuelve las transferencias del sandbox, con la posibilidad de acotar por cuenta de origen y por estado.",
      entradas: [
        "`cuentaOrigenId` (opcional, por query): número entero positivo.",
        "`estado` (opcional, por query): `pendiente`, `completada`, `rechazada` o `anulada`.",
      ],
      reglas: [
        "Los dos filtros se combinan entre sí.",
        "No hay filtro por cuenta de destino, por beneficiario, por cliente ni por fecha.",
        "Las transferencias anuladas siguen apareciendo, con `estado = 'anulada'`: anular no es dar de baja.",
        "Máximo 100 filas, ordenadas por identificador ascendente.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de transferencias; cada elemento incluye `id`, `cuenta_origen_id`, `cuenta_destino_id`, `beneficiario_id`, `monto`, `moneda`, `concepto`, `referencia`, `estado`, `activo` y `created_at`.",
      ],
      errores: [
        ["`VALIDATION_ERROR`", "400", "`cuentaOrigenId` no es un entero positivo, o `estado` no es uno de los cuatro valores permitidos."],
      ],
      fuente: "`app/api/v2/transferencias/route.ts`",
      criterios: [
        "Al filtrar por `cuentaOrigenId`, todos los elementos devueltos tienen esa cuenta como origen.",
        "Al filtrar por `estado=anulada`, todos los elementos devueltos tienen `estado` igual a `anulada`.",
        "En cada elemento, exactamente uno de `cuenta_destino_id` y `beneficiario_id` tiene valor y el otro es nulo.",
        "Una transferencia recién ejecutada aparece al filtrar por su cuenta de origen.",
        "Al enviar `estado=procesada`, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G4-07",
      nombre: "Ejecutar una transferencia",
      endpoint: "POST /api/v2/transferencias",
      descripcion:
        "Transfiere un importe desde una cuenta hacia otra cuenta del sandbox (interna) o hacia un beneficiario agendado (externa). La transferencia se ejecuta en el acto y queda `completada`.",
      entradas: [
        "`cuentaOrigenId` (obligatorio): número entero positivo.",
        "`cuentaDestinoId` (opcional): número entero positivo. Indica una transferencia interna.",
        "`beneficiarioId` (opcional): número entero positivo. Indica una transferencia externa.",
        "`monto` (obligatorio): número mayor que cero, como número JSON.",
        "`concepto` (opcional): texto libre.",
      ],
      reglas: [
        "Debe indicarse **exactamente uno** de `cuentaDestinoId` y `beneficiarioId`. Enviar ambos, o ninguno, responde 400 con el mensaje \"Indicá exactamente uno: cuentaDestinoId (interna) o beneficiarioId (externa).\".",
        "La cuenta de destino no puede ser la de origen: responde 400 con el mensaje \"La cuenta destino no puede ser la misma que la de origen.\".",
        "La cuenta de origen debe existir y no estar dada de baja (si no, 404 \"Cuenta origen no encontrada.\"), y estar en estado `activa` (si no, 409 \"La cuenta origen está bloqueada: no admite transferencias.\").",
        "El saldo del origen debe alcanzar: si no, 409 \"Saldo insuficiente en la cuenta origen.\". Transferir exactamente el saldo es válido.",
        "En una transferencia interna, la cuenta de destino debe existir (404 \"Cuenta destino no encontrada.\"), estar `activa` (409 \"La cuenta destino está bloqueada: no admite acreditaciones.\") y tener la misma moneda que el origen (409 \"Las cuentas deben tener la misma moneda.\").",
        "En una transferencia externa, el beneficiario debe existir y estar vigente (404 \"Beneficiario no encontrado.\").",
        "Las validaciones se evalúan en ese orden: la primera que falla determina la respuesta.",
        "Si todo es válido: se debita el origen, se acredita el destino (solo si es interna), se crea la transferencia con `estado = 'completada'`, la moneda del origen y una `referencia` generada, y se registra un movimiento `debito` en el origen y —si es interna— uno `credito` en el destino.",
        "La descripción de esos movimientos es el `concepto`; si no se envió, es \"Transferencia enviada\" y \"Transferencia recibida\".",
        "La operación es atómica: ante cualquier rechazo no cambia ningún saldo ni se registra nada.",
        "**No se valida que las cuentas pertenezcan al mismo cliente, ni que el beneficiario sea del titular de la cuenta de origen.**",
      ],
      respuesta: [
        "`201 Created` con `data` conteniendo la transferencia creada y, anidadas, `data.cuenta_origen` (con su saldo ya debitado) y `data.cuenta_destino` (con su saldo ya acreditado, o `null` si la transferencia es externa).",
      ],
      errores: [
        [
          "`VALIDATION_ERROR`",
          "400",
          "Falta `cuentaOrigenId` o `monto`, el monto no es un número positivo, se indicaron los dos destinos o ninguno, o el destino es la misma cuenta de origen.",
        ],
        ["`NOT_FOUND`", "404", "No existe la cuenta de origen, la cuenta de destino o el beneficiario."],
        ["`CONFLICT`", "409", "Alguna cuenta no está activa, el saldo no alcanza, o las monedas difieren."],
      ],
      fuente: "`app/api/v2/transferencias/route.ts`",
      criterios: [
        "Dadas dos cuentas activas en guaraníes y un origen con saldo 1.000.000, al transferir 300.000 la respuesta es 201, `data.estado` es `completada`, `data.cuenta_origen.saldo` es `\"700000.00\"` y `data.cuenta_destino.saldo` aumentó en 300.000.",
        "Después de una transferencia interna, el extracto de cada cuenta tiene un movimiento nuevo con `referencia_tipo` igual a `transferencia` y `referencia_id` igual al `id` de la transferencia: `debito` en el origen y `credito` en el destino.",
        "Dado un beneficiario vigente, al transferirle 100.000 la respuesta es 201, `data.beneficiario_id` tiene valor, `data.cuenta_destino_id` es nulo y `data.cuenta_destino` es `null`.",
        "La `referencia` devuelta comienza con `TRF-` y la `moneda` coincide con la de la cuenta de origen.",
        "Al transferir exactamente el saldo disponible, la respuesta es 201 y el origen queda en `\"0.00\"`.",
        "Al transferir un importe mayor al saldo, la respuesta es 409 `CONFLICT` con el mensaje \"Saldo insuficiente en la cuenta origen.\" y ningún saldo cambia.",
        "Al enviar `cuentaDestinoId` y `beneficiarioId` a la vez, o ninguno de los dos, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al transferir de una cuenta a sí misma, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al transferir de una cuenta en guaraníes a una en dólares, la respuesta es 409 `CONFLICT` con el mensaje \"Las cuentas deben tener la misma moneda.\".",
        "Al transferir desde o hacia una cuenta `bloqueada`, la respuesta es 409 `CONFLICT`.",
        "Al transferir hacia una cuenta o un beneficiario inexistente, la respuesta es 404 `NOT_FOUND` y el saldo del origen no cambia.",
        "Al enviar `monto` igual a 0, negativo o como texto, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G4-08",
      nombre: "Consultar una transferencia",
      endpoint: "GET /api/v2/transferencias/{id}",
      descripcion: "Devuelve el comprobante de una transferencia: importe, cuentas, referencia y estado.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Si no existe, responde 404 con el mensaje \"Transferencia no encontrada.\".",
        "La respuesta no incluye las cuentas anidadas: solo los identificadores.",
        "Una transferencia no se puede modificar ni dar de baja: `PUT` y `DELETE` sobre esta ruta responden 405. Para revertirla existe la anulación (RF-G4-09).",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la transferencia completa."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una transferencia con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/transferencias/[id]/route.ts`",
      criterios: [
        "Dada una transferencia recién ejecutada, al consultarla la respuesta es 200 y su `monto`, cuentas y `referencia` coinciden con los devueltos al crearla.",
        "Al consultar una transferencia inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Transferencia no encontrada.\".",
        "Al enviar `PUT` o `DELETE` sobre una transferencia existente, la respuesta es 405.",
      ],
    },
    {
      id: "RF-G4-09",
      nombre: "Anular una transferencia",
      endpoint: "POST /api/v2/transferencias/{id}/anular",
      descripcion:
        "Revierte una transferencia completada: devuelve el dinero al origen, lo retira del destino si fue interna, registra los movimientos inversos y deja la transferencia en estado `anulada`.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`motivo` (opcional, en el cuerpo): texto libre. Se usa como descripción de los movimientos de reversa.",
      ],
      reglas: [
        "Solo se anula una transferencia en estado `completada`. En otro estado responde 409 con el mensaje \"Solo se puede anular una transferencia completada (está 'anulada').\" (con el estado que corresponda).",
        "Si fue interna, la cuenta de destino debe conservar saldo suficiente para devolver el importe: si ya lo gastó, responde 409 con el mensaje \"La cuenta destino no tiene saldo suficiente para revertir la transferencia.\" y nada cambia.",
        "Si fue interna, se debita el destino y se registra en él un movimiento `debito`; en todos los casos se acredita el origen y se registra en él un movimiento `credito`. Ambos llevan `referencia_tipo = 'transferencia'` y el id de la transferencia.",
        "La descripción de esos movimientos es el `motivo`; si no se envió, es \"Anulación de transferencia \" seguido de la referencia.",
        "La transferencia no se borra: conserva sus datos y pasa a `estado = 'anulada'`. Anular es definitivo: no existe la operación inversa.",
        "**No se valida el estado actual de las cuentas**: una transferencia se puede anular aunque el origen o el destino estén hoy `bloqueada` o `cerrada`.",
        "No hay plazo máximo para anular.",
      ],
      respuesta: [
        "`200 OK` con `data` conteniendo la transferencia con `estado = 'anulada'` y, en `data.cuenta_origen`, la cuenta de origen con el saldo ya restituido. La cuenta de destino no viene en la respuesta.",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una transferencia con ese identificador."],
        ["`CONFLICT`", "409", "La transferencia no está completada, o el destino ya no tiene saldo para devolver."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo, o `motivo` no es texto."],
      ],
      fuente: "`app/api/v2/transferencias/[id]/anular/route.ts`",
      criterios: [
        "Dada una transferencia interna recién ejecutada por 300.000, al anularla la respuesta es 200, `data.estado` es `anulada` y los saldos de origen y destino vuelven a los valores previos a la transferencia.",
        "Tras la anulación, el extracto del origen tiene un movimiento `credito` y el del destino un movimiento `debito`, ambos por 300.000 y referidos a la transferencia.",
        "Dada una transferencia externa recién ejecutada, al anularla el saldo del origen vuelve a su valor previo.",
        "Al anular enviando un `motivo`, ese texto aparece como `descripcion` de los movimientos de reversa.",
        "Al anular por segunda vez la misma transferencia, la respuesta es 409 `CONFLICT` y los saldos no vuelven a cambiar.",
        "Dadas las transferencias sembradas en estado `pendiente` o `rechazada`, al anularlas la respuesta es 409 `CONFLICT`.",
        "Dada una transferencia interna cuyo destino quedó con menos saldo que el importe transferido, al anularla la respuesta es 409 `CONFLICT` y ningún saldo cambia.",
        "Al anular una transferencia inexistente, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    rfToken(4, "c2_g04_transferencias", 5),
  ],

  web: {
    pantallas: [
      [
        "`/v2/beneficiarios` — Agenda de beneficiarios",
        "Tabla con alias o nombre, banco, número de cuenta y cliente; filtro por titular y búsqueda por nombre, alias, banco o número, con un acceso directo \"Transferir\" por fila. Ejecuta RF-G4-01.",
      ],
      [
        "`/v2/beneficiarios/new` y `/v2/beneficiarios/{id}`",
        "Alta de un beneficiario (RF-G4-02) y detalle con edición (RF-G4-04), baja (RF-G4-05) y botón para transferirle.",
      ],
      [
        "`/v2/transferencias` — Listado de transferencias",
        "Tabla con referencia, origen, destino, monto, fecha y estado; filtros por titular y estado, y búsqueda por referencia o concepto. Ejecuta RF-G4-06; como la API solo filtra por cuenta de origen, el filtro por titular se resuelve en el navegador cruzando con las cuentas del cliente.",
      ],
      [
        "`/v2/transferencias/new` — Nueva transferencia",
        "Asistente de cuatro pasos: \"Destino\" (cliente, entre mis cuentas o a un beneficiario, cuenta de origen y destino), \"Monto\" (importe y concepto, con el saldo y el tope diario restante a la vista), \"Confirmación\" (resumen y saldo final proyectado) y \"Comprobante\". Ejecuta RF-G4-07.",
      ],
      [
        "`/v2/transferencias/{id}` — Comprobante",
        "Muestra referencia, estado, monto, fecha, origen y destino, y permite anular con un motivo (RF-G4-09). Ejecuta RF-G4-08.",
      ],
    ],
    notas: [
      "**Regla de UI:** tope diario por cuenta de origen de 50.000.000 de guaraníes o 10.000 dólares, calculado sumando las transferencias `completada` del día. La API no tiene ningún límite.",
      "**Regla de UI:** una transferencia interna solo se puede hacer entre cuentas activas del mismo cliente (\"Entre mis cuentas\"). La API permite transferir a la cuenta de cualquier cliente.",
      "**Regla de UI:** el concepto admite hasta 60 caracteres. La API no limita su longitud.",
      "**Regla de UI:** para anular, el motivo es obligatorio y debe tener entre 10 y 120 caracteres. La API lo acepta opcional y sin límites.",
      "**Regla de UI:** el número de cuenta de un beneficiario debe tener entre 6 y 20 dígitos, el nombre entre 3 y 120 caracteres, el alias entre 3 y 30 y no repetirse dentro de la agenda del cliente, y el banco se elige de una lista de bancos de Paraguay. La API solo exige que nombre, banco y número no estén vacíos.",
      "El importe mayor al saldo o al tope diario se rechaza en el navegador antes de llegar a la API; si la API rechaza la operación, el asistente vuelve al paso del campo observado.",
      "El botón \"Anular transferencia\" solo aparece en transferencias `completada`.",
    ],
  },

  anexo: [
    {
      norma: "Reglamentación del BCP sobre el Sistema de Pagos del Paraguay (SIPAP) y transferencias electrónicas",
      expectativa: "Toda orden de transferencia debe tener identificación unívoca, trazabilidad de origen y destino y un estado final de liquidación.",
      estado:
        "Parcial: cada transferencia tiene referencia única, deja movimientos trazables y queda `completada`; pero una transferencia externa no se liquida contra ningún otro banco, solo debita el origen.",
    },
    {
      norma: "Marco del BCP sobre disponibilidad de fondos en cuentas de depósito",
      expectativa: "Una orden solo puede ejecutarse si la cuenta ordenante está operativa y tiene fondos suficientes.",
      estado: "Cubierto: la transferencia exige origen `activa` y saldo suficiente, y es atómica.",
    },
    {
      norma: "Ley 1015/97 y debida diligencia de operaciones (SEPRELAD)",
      expectativa: "Registro de las operaciones con datos suficientes para su monitoreo, con umbrales y alertas por operaciones inusuales.",
      estado:
        "Parcial: queda registrado importe, cuentas, fecha y concepto, pero la API no tiene umbrales ni límites; el tope diario existe solo en la pantalla web.",
    },
    {
      norma: "Ley 1334/98 de Defensa del Consumidor (SEDECO), deber de información",
      expectativa: "El usuario debe recibir constancia de la operación con importe, destino, referencia y estado.",
      estado: "Cubierto: la API devuelve el comprobante completo y la web lo muestra al finalizar y en el detalle.",
    },
    {
      norma: "Reglas de conversión de moneda del BCP",
      expectativa: "Una transferencia entre cuentas de distinta moneda requiere un tipo de cambio explícito.",
      estado: "Cubierto por restricción: la API rechaza transferir entre cuentas de distinta moneda en lugar de convertir.",
    },
    {
      norma: "Buenas prácticas de reversa de operaciones",
      expectativa: "La reversa de una transferencia requiere causa justificada, autorización y, para el destino, su consentimiento o un proceso de reclamo.",
      estado:
        "No implementado: cualquier credencial puede anular cualquier transferencia completada, sin motivo obligatorio, sin plazo y retirando el dinero del destino sin intervención de su titular.",
    },
  ],

  brechas: [
    "Una transferencia externa debita el origen pero no acredita nada: el dinero sale del sandbox. No hay cuenta de compensación ni estado intermedio.",
    "Los estados `pendiente` y `rechazada` solo aparecen en los datos sembrados: la API crea toda transferencia como `completada` y no hay endpoint para confirmar o rechazar.",
    "La API no tiene límites por operación ni por día, ni control de duplicados: dos transferencias idénticas seguidas son aceptadas.",
    "No se valida que el beneficiario pertenezca al titular de la cuenta de origen: se puede transferir a un beneficiario agendado por otro cliente.",
    "La anulación no mira el estado actual de las cuentas: acredita o debita cuentas bloqueadas o cerradas, incluso una cuenta de destino dada de baja.",
    "La anulación no tiene plazo ni exige motivo, y puede dejar al destino sin el dinero sin que su titular intervenga.",
    "`GET /transferencias` no filtra por destino, beneficiario, cliente ni fecha: no se pueden listar por la API las transferencias recibidas por una cuenta.",
    "La unicidad de beneficiarios incluye a los dados de baja y no hay forma de reactivarlos: un número de cuenta que un cliente agendó y quitó no puede volver a agendarse.",
    "Banco, número de cuenta y alias del beneficiario son texto libre en la API; todo el formato lo impone solo la pantalla web.",
    "La referencia se genera con la hora al milisegundo y el id del origen: dos transferencias desde la misma cuenta en el mismo milisegundo colisionan y la segunda falla con 409.",
    "Las transferencias sembradas no son contablemente completas: varias en estado `completada` no tienen su movimiento en el extracto, por lo que anular una sembrada genera una reversa sin su asiento original.",
    "No existe control de titularidad: cualquier credencial del curso puede transferir desde la cuenta de cualquier cliente.",
  ],
};
