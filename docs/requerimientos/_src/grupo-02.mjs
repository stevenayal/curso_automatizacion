import { rfToken } from "./comun.mjs";

export const grupo = {
  n: 2,
  slug: "grupo-02-tarjetas",
  titulo: "Tarjetas de Crédito y Débito",
  modulo: "Módulo: Tarjetas, límites, disponible, estado y vencimiento",

  alcance:
    "Cubre el ciclo de vida de una tarjeta: emisión (crédito o débito), consulta, renovación de sus datos (marca y vencimiento), bloqueo y reactivación, cambio del límite de crédito y baja. Incluye el cálculo del disponible de una tarjeta de crédito como límite menos saldo utilizado.",
  fueraDeAlcance:
    "Consumos, pagos del resumen y cualquier operación que modifique el saldo utilizado (ningún endpoint lo cambia); intereses, cargos y cierre de resumen; el vencimiento automático por fecha; y los datos sensibles de la tarjeta (número completo, código de seguridad, PIN), que no existen en el sandbox.",

  endpoints: [
    { ruta: "GET /api/v2/tarjetas", rf: "RF-G2-01", desc: "Lista tarjetas vigentes, filtradas por titular y/o estado." },
    { ruta: "POST /api/v2/tarjetas", rf: "RF-G2-02", desc: "Emite una tarjeta de crédito o de débito." },
    { ruta: "GET /api/v2/tarjetas/{id}", rf: "RF-G2-03", desc: "Devuelve el detalle de una tarjeta con su disponible." },
    { ruta: "PUT /api/v2/tarjetas/{id}", rf: "RF-G2-04", desc: "Reemplaza marca y fecha de vencimiento." },
    { ruta: "DELETE /api/v2/tarjetas/{id}", rf: "RF-G2-05", desc: "Da de baja una tarjeta sin saldo utilizado." },
    { ruta: "POST /api/v2/tarjetas/{id}/bloquear", rf: "RF-G2-06", desc: "Bloquea una tarjeta activa." },
    { ruta: "POST /api/v2/tarjetas/{id}/activar", rf: "RF-G2-07", desc: "Reactiva una tarjeta bloqueada y no vencida." },
    { ruta: "PATCH /api/v2/tarjetas/{id}/limite", rf: "RF-G2-08", desc: "Cambia el límite de una tarjeta de crédito." },
    { ruta: "POST /api/v2/g2/auth/token", rf: "RF-G2-TK", desc: "Emite el token JWT del grupo." },
  ],

  precondiciones: [
    "Para emitir una tarjeta se necesita un cliente existente (`usuarioId`); la cuenta asociada (`cuentaId`) es opcional.",
    "Datos sembrados útiles: tarjetas 1, 3, 4, 7 y 9 son de crédito y nacen `activa`; la 3 y la 9 están casi al tope de su límite; la 4 no tiene consumo; las tarjetas 5 y 8 son de débito y nacen `bloqueada`; la tarjeta 10 nace `vencida` con saldo utilizado. La tarjeta 6 (Amex) vence el 31 de octubre de 2026: su comportamiento cambia según la fecha en que se ejecute la prueba.",
    "Como ningún endpoint modifica el saldo utilizado, un escenario que necesite una tarjeta con consumo debe usar una sembrada o prepararla con `POST /api/v2/sql/update` sobre la columna `saldo_utilizado` (respetando que no supere el límite).",
  ],

  tablas: [
    {
      nombre: "tarjetas",
      desc: "Tarjetas emitidas. `estado` es el estado de negocio y `activo` la marca de baja lógica. El disponible no es una columna: se calcula en cada consulta.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`usuario_id`", "`bigint`, obligatorio, referencia a `usuarios(id)`"],
        ["`cuenta_id`", "`bigint`, opcional, referencia a `cuentas(id)`"],
        ["`tipo`", "`text`, `credito` o `debito` (por defecto `debito`)"],
        ["`marca`", "`text`, `visa`, `mastercard` o `amex` (por defecto `visa`)"],
        ["`numero_enmascarado`", "`text`, obligatorio; con el formato `**** **** **** NNNN`, generado al azar al emitir. No es único."],
        ["`limite_credito`", "`numeric(12,2)`, obligatorio, por defecto 0; mayor o igual a cero"],
        ["`saldo_utilizado`", "`numeric(12,2)`, obligatorio, por defecto 0; mayor o igual a cero y nunca mayor al límite"],
        ["`estado`", "`text`, uno de `activa` / `bloqueada` / `vencida`; por defecto `activa`"],
        ["`fecha_vencimiento`", "`date`, obligatoria"],
        ["`activo`", "`boolean`, obligatorio, por defecto `true`; `false` = dada de baja"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
  ],

  notaDatos:
    "Toda respuesta que devuelve una tarjeta agrega el campo calculado `disponible` = `limite_credito` − `saldo_utilizado`. En una tarjeta de débito el límite es siempre 0, por lo que su disponible también es 0: no representa el saldo de la cuenta asociada. Los importes de las tarjetas no tienen moneda propia; la aplicación web los muestra en guaraníes.",

  rf: [
    {
      id: "RF-G2-01",
      nombre: "Listar tarjetas",
      endpoint: "GET /api/v2/tarjetas",
      descripcion: "Devuelve las tarjetas vigentes del sandbox, con la posibilidad de acotar por titular y por estado.",
      entradas: [
        "`usuarioId` (opcional, por query): número entero positivo.",
        "`estado` (opcional, por query): `activa`, `bloqueada` o `vencida`.",
      ],
      reglas: [
        "Devuelve únicamente tarjetas no dadas de baja (`activo = true`), en cualquier estado.",
        "Los dos filtros se combinan entre sí. No hay filtro por tipo ni por marca.",
        "El filtro `estado=vencida` usa el estado guardado, no la fecha: una tarjeta `activa` con fecha de vencimiento pasada no aparece como vencida.",
        "Máximo 100 filas, ordenadas por identificador ascendente.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de tarjetas; cada elemento incluye las columnas de la tabla más el campo calculado `disponible`.",
      ],
      errores: [
        ["`VALIDATION_ERROR`", "400", "`usuarioId` no es un entero positivo, o `estado` no es uno de los tres valores permitidos."],
      ],
      fuente: "`app/api/v2/tarjetas/route.ts`",
      criterios: [
        "Al listar sin filtros, la respuesta es 200 y cada elemento incluye el campo `disponible`.",
        "Al filtrar por un titular, todos los elementos devueltos tienen ese `usuario_id`.",
        "Al filtrar por `estado=bloqueada`, todos los elementos devueltos tienen `estado` igual a `bloqueada`.",
        "Para cada tarjeta de crédito devuelta, `disponible` es igual a `limite_credito` menos `saldo_utilizado`.",
        "Al enviar `estado=cancelada`, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G2-02",
      nombre: "Emitir una tarjeta",
      endpoint: "POST /api/v2/tarjetas",
      descripcion: "Emite una tarjeta nueva de crédito o de débito para un cliente. La tarjeta nace activa y sin consumo.",
      entradas: [
        "`usuarioId` (obligatorio): número entero positivo del titular.",
        "`cuentaId` (opcional): número entero positivo de la cuenta asociada.",
        "`tipo` (obligatorio): `credito` o `debito`.",
        "`marca` (obligatorio): `visa`, `mastercard` o `amex`.",
        "`limiteCredito` (opcional): número mayor o igual a cero, como número JSON.",
        "`fechaVencimiento` (obligatorio): texto con el formato `YYYY-MM-DD`.",
      ],
      reglas: [
        "La tarjeta nace con `estado = 'activa'`, `saldo_utilizado = 0` y `activo = true`.",
        "En una tarjeta de **crédito** el límite es el `limiteCredito` enviado, o 0 si se omite.",
        "En una tarjeta de **débito** el límite es siempre 0: un `limiteCredito` enviado se ignora sin error.",
        "El `numero_enmascarado` lo genera el servidor con cuatro dígitos al azar; dos tarjetas pueden terminar con los mismos cuatro dígitos.",
        "El titular debe existir, y la cuenta también si se indica; un id inexistente es rechazado por la clave foránea.",
        "El formato de la fecha se valida con una expresión regular; una fecha con formato correcto pero inexistente (`2027-02-31`) pasa esa validación y es rechazada por la base como `EXECUTION_ERROR`.",
        "**No se valida que la fecha de vencimiento sea futura**: se puede emitir una tarjeta con vencimiento pasado, y nace `activa`.",
        "**No se valida que la cuenta pertenezca al titular, ni que esté activa**, ni que una tarjeta de débito tenga cuenta asociada.",
      ],
      respuesta: ["`201 Created` con `data` conteniendo la tarjeta creada, incluido `disponible`."],
      errores: [
        [
          "`VALIDATION_ERROR`",
          "400",
          "Falta un campo obligatorio, `tipo` o `marca` están fuera de la lista, `limiteCredito` es negativo o no es número, la fecha no tiene el formato `YYYY-MM-DD`, o el titular o la cuenta no existen.",
        ],
        ["`EXECUTION_ERROR`", "400", "La fecha tiene el formato correcto pero no existe en el calendario, o el límite excede el máximo que admite la columna."],
      ],
      fuente: "`app/api/v2/tarjetas/route.ts`",
      criterios: [
        "Al emitir una tarjeta de crédito con `limiteCredito` 5000000, la respuesta es 201, `data.estado` es `activa`, `data.saldo_utilizado` es `\"0.00\"` y `data.disponible` es `\"5000000.00\"`.",
        "Al emitir una tarjeta de débito enviando `limiteCredito` 5000000, la respuesta es 201 y `data.limite_credito` es `\"0.00\"`.",
        "Al emitir una tarjeta de crédito sin `limiteCredito`, la respuesta es 201 y el límite es `\"0.00\"`.",
        "El `numero_enmascarado` devuelto cumple el formato `**** **** **** ` seguido de cuatro dígitos.",
        "Al emitir con `marca=diners` o `tipo=prepaga`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al emitir con `fechaVencimiento` igual a `31/12/2028`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al emitir con `fechaVencimiento` igual a `2027-02-31`, la respuesta es 400 `EXECUTION_ERROR`.",
        "Al emitir para un `usuarioId` inexistente, la respuesta es 400 `VALIDATION_ERROR` y no se crea ninguna tarjeta.",
      ],
    },
    {
      id: "RF-G2-03",
      nombre: "Consultar una tarjeta",
      endpoint: "GET /api/v2/tarjetas/{id}",
      descripcion: "Devuelve el detalle de una tarjeta puntual, con su disponible calculado.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Devuelve la tarjeta en cualquier estado de negocio.",
        "Si no existe o está dada de baja, responde 404 con el mensaje \"Tarjeta no encontrada.\".",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la tarjeta completa y `disponible`."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una tarjeta vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/tarjetas/[id]/route.ts`",
      criterios: [
        "Dada una tarjeta existente, al consultarla la respuesta es 200 y `data.id` coincide con el solicitado.",
        "Dada la tarjeta sembrada 1 sin modificar (límite 10000000, utilizado 2500000), `data.disponible` es `\"7500000.00\"`.",
        "Al consultar un identificador inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Tarjeta no encontrada.\".",
        "Al consultar con un identificador no numérico, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G2-04",
      nombre: "Renovar una tarjeta",
      endpoint: "PUT /api/v2/tarjetas/{id}",
      descripcion: "Reemplaza la marca y la fecha de vencimiento de una tarjeta. El límite y el estado se manejan por sus propios endpoints.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`marca` (obligatorio): `visa`, `mastercard` o `amex`.",
        "`fechaVencimiento` (obligatorio): texto con el formato `YYYY-MM-DD`.",
      ],
      reglas: [
        "Es un reemplazo: los dos campos son obligatorios aunque solo cambie uno.",
        "`tipo`, `limiteCredito`, `estado`, `cuentaId` y el número no forman parte del cuerpo; si se envían, se ignoran.",
        "**No se valida el estado**: se puede renovar una tarjeta `bloqueada` o `vencida`.",
        "**Cambiar la fecha no cambia el estado**: una tarjeta `vencida` a la que se le pone una fecha futura sigue `vencida`, y no hay endpoint que la saque de ese estado.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la tarjeta ya actualizada."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una tarjeta vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "Falta un campo, la marca está fuera de la lista o la fecha no tiene el formato `YYYY-MM-DD`."],
        ["`EXECUTION_ERROR`", "400", "La fecha tiene el formato correcto pero no existe en el calendario."],
      ],
      fuente: "`app/api/v2/tarjetas/[id]/route.ts`",
      criterios: [
        "Dada una tarjeta existente, al enviar una nueva `fechaVencimiento` la respuesta es 200 y `data.fecha_vencimiento` refleja la nueva fecha en formato `YYYY-MM-DD`.",
        "El `limite_credito`, el `saldo_utilizado`, el `tipo` y el `estado` no cambian tras la renovación.",
        "Al enviar solo `marca` (sin fecha), la respuesta es 400 `VALIDATION_ERROR`.",
        "Al renovar una tarjeta inexistente o dada de baja, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G2-05",
      nombre: "Dar de baja una tarjeta",
      endpoint: "DELETE /api/v2/tarjetas/{id}",
      descripcion: "Da de baja lógica una tarjeta que no tiene consumo pendiente.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Una tarjeta con saldo utilizado mayor que cero no puede darse de baja: responde 409 con el mensaje \"No se puede eliminar una tarjeta con saldo utilizado pendiente.\".",
        "Con saldo utilizado en cero, marca `activo = false`; la fila permanece en la base.",
        "El estado de negocio no influye: se puede dar de baja una tarjeta `activa`, `bloqueada` o `vencida`.",
      ],
      respuesta: ["`204 No Content`, sin cuerpo."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una tarjeta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La tarjeta tiene saldo utilizado pendiente."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/tarjetas/[id]/route.ts`",
      criterios: [
        "Dada una tarjeta recién emitida, al darla de baja la respuesta es 204 sin cuerpo.",
        "Tras la baja, RF-G2-03 sobre esa tarjeta responde 404 y deja de aparecer en RF-G2-01.",
        "Dada una tarjeta con saldo utilizado, al intentar darla de baja la respuesta es 409 `CONFLICT` y la tarjeta sigue siendo consultable.",
        "Dar de baja dos veces la misma tarjeta devuelve 204 la primera vez y 404 la segunda.",
      ],
    },
    {
      id: "RF-G2-06",
      nombre: "Bloquear una tarjeta",
      endpoint: "POST /api/v2/tarjetas/{id}/bloquear",
      descripcion: "Pasa una tarjeta activa al estado `bloqueada`.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`motivo` (opcional, en el cuerpo): texto libre. Se acepta pero no se guarda.",
      ],
      reglas: [
        "Solo se bloquea una tarjeta en estado `activa`.",
        "Si ya está bloqueada responde 409 con el mensaje \"La tarjeta ya está bloqueada.\": el bloqueo no es idempotente en el código de respuesta, para que el test distinga \"la bloqueé yo\" de \"ya estaba bloqueada\".",
        "Si está `vencida` responde 409 con el mensaje \"Una tarjeta vencida no puede bloquearse.\".",
        "El bloqueo no modifica límite, saldo utilizado ni fecha de vencimiento.",
        "El cuerpo es opcional: la request puede enviarse sin cuerpo.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la tarjeta con `estado = 'bloqueada'`."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una tarjeta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La tarjeta ya está bloqueada o está vencida."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo, o `motivo` no es texto."],
      ],
      fuente: "`app/api/v2/tarjetas/[id]/bloquear/route.ts`",
      criterios: [
        "Dada una tarjeta activa, al bloquearla la respuesta es 200 y `data.estado` es `bloqueada`.",
        "Al bloquear por segunda vez la misma tarjeta, la respuesta es 409 `CONFLICT` con el mensaje \"La tarjeta ya está bloqueada.\".",
        "Dada la tarjeta sembrada en estado `vencida`, al bloquearla la respuesta es 409 `CONFLICT`.",
        "Tras el bloqueo, `limite_credito`, `saldo_utilizado` y `disponible` conservan sus valores.",
        "Al bloquear una tarjeta inexistente, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G2-07",
      nombre: "Activar una tarjeta",
      endpoint: "POST /api/v2/tarjetas/{id}/activar",
      descripcion: "Devuelve al estado `activa` una tarjeta bloqueada cuya fecha de vencimiento todavía no pasó.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo. No lleva cuerpo."],
      reglas: [
        "Solo se activa una tarjeta en estado `bloqueada`.",
        "Si ya está activa responde 409 con el mensaje \"La tarjeta ya está activa.\".",
        "Si su estado es `vencida` responde 409 con el mensaje \"Una tarjeta vencida no puede activarse.\".",
        "Si está `bloqueada` pero su fecha de vencimiento es anterior a hoy, responde 409 con el mensaje \"La tarjeta está vencida: no puede activarse.\" y **el estado sigue en `bloqueada`**: no pasa a `vencida`.",
        "Una tarjeta que vence hoy todavía se puede activar.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la tarjeta con `estado = 'activa'`."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una tarjeta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La tarjeta ya está activa, está vencida, o su fecha de vencimiento ya pasó."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/tarjetas/[id]/activar/route.ts`",
      criterios: [
        "Dada una tarjeta bloqueada con vencimiento futuro, al activarla la respuesta es 200 y `data.estado` es `activa`.",
        "Al activar una tarjeta que ya está activa, la respuesta es 409 `CONFLICT` con el mensaje \"La tarjeta ya está activa.\".",
        "Dada una tarjeta emitida con vencimiento pasado y luego bloqueada, al activarla la respuesta es 409 `CONFLICT` y su estado sigue siendo `bloqueada`.",
        "El ciclo bloquear → activar → bloquear sobre una misma tarjeta responde 200 en los tres pasos.",
        "Al activar una tarjeta inexistente, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G2-08",
      nombre: "Cambiar el límite de crédito",
      endpoint: "PATCH /api/v2/tarjetas/{id}/limite",
      descripcion: "Fija un nuevo límite para una tarjeta de crédito, sin permitir que quede por debajo de lo ya consumido.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`limiteCredito` (obligatorio, en el cuerpo): número mayor o igual a cero, como número JSON.",
      ],
      reglas: [
        "Solo aplica a tarjetas de crédito; sobre una de débito responde 409 con el mensaje \"Solo las tarjetas de crédito tienen límite.\".",
        "El nuevo límite no puede ser menor al saldo utilizado: responde **400** `VALIDATION_ERROR` con el mensaje \"El límite no puede ser menor al saldo utilizado (N).\". Un límite exactamente igual al saldo utilizado es válido y deja el disponible en cero.",
        "El disponible se recalcula con el nuevo límite; el saldo utilizado no cambia.",
        "**No se valida el estado**: se puede cambiar el límite de una tarjeta `bloqueada` o `vencida`.",
        "No hay tope máximo de negocio; el único techo es el que admite la columna en la base.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la tarjeta con su nuevo `limite_credito` y `disponible`."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una tarjeta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La tarjeta es de débito."],
        ["`VALIDATION_ERROR`", "400", "Falta `limiteCredito`, es negativo, no es un número JSON, o es menor al saldo utilizado."],
      ],
      fuente: "`app/api/v2/tarjetas/[id]/limite/route.ts`",
      criterios: [
        "Dada una tarjeta de crédito con límite 5000000 y sin consumo, al fijar 8000000 la respuesta es 200, `data.limite_credito` es `\"8000000.00\"` y `data.disponible` es `\"8000000.00\"`.",
        "Dada una tarjeta con saldo utilizado 2500000, al fijar un límite de 2000000 la respuesta es 400 `VALIDATION_ERROR` y el límite no cambia.",
        "Dada una tarjeta con saldo utilizado 2500000, al fijar un límite de 2500000 la respuesta es 200 y `data.disponible` es `\"0.00\"`.",
        "Dada una tarjeta de débito, al cambiar su límite la respuesta es 409 `CONFLICT` con el mensaje \"Solo las tarjetas de crédito tienen límite.\".",
        "Al enviar `limiteCredito` negativo o como texto, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al cambiar el límite de una tarjeta inexistente, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    rfToken(2, "c2_g02_tarjetas", 3),
  ],

  web: {
    pantallas: [
      [
        "`/v2/tarjetas` — Listado de tarjetas",
        "Tabla con tarjeta, titular, disponible, porcentaje de uso del límite, vencimiento y estado; filtros por titular, estado y tipo, y búsqueda por últimos cuatro dígitos o marca. Permite bloquear y activar desde la fila. Ejecuta RF-G2-01, RF-G2-06 y RF-G2-07.",
      ],
      [
        "`/v2/tarjetas/new` — Solicitar tarjeta",
        "Formulario con titular, tipo, marca, cuenta, límite, mes y año de vencimiento y aceptación de condiciones, con una vista previa del plástico. Ejecuta RF-G2-02 y navega al detalle.",
      ],
      [
        "`/v2/tarjetas/{id}` — Detalle de tarjeta",
        "Muestra el plástico, el estado, el disponible, el límite, lo utilizado y la barra de uso; permite bloquear o activar, cambiar el límite (RF-G2-08), renovar marca y vencimiento (RF-G2-04) y dar de baja (RF-G2-05).",
      ],
    ],
    notas: [
      "**Regla de UI:** una tarjeta de crédito nueva exige un límite entre 1.000.000 y 100.000.000 de guaraníes. La API acepta cualquier número mayor o igual a cero.",
      "**Regla de UI:** una tarjeta de débito debe estar asociada a una cuenta activa del titular. La API la acepta sin cuenta.",
      "**Regla de UI:** American Express solo se ofrece para crédito. La API acepta `amex` con `debito`.",
      "**Regla de UI:** el vencimiento debe ser posterior al mes actual y a no más de cinco años; la web envía siempre el último día del mes elegido. La API acepta cualquier fecha válida, incluso pasada.",
      "**Regla de UI:** el bloqueo exige elegir un motivo (robo, extravío, sospecha de fraude o bloqueo temporal). La API lo recibe como opcional y no lo guarda.",
      "**Regla de UI:** el límite solo se puede cambiar en una tarjeta activa. La API lo permite en cualquier estado.",
      "La web muestra como \"Vencida\" a toda tarjeta cuya fecha de vencimiento ya pasó, aunque su `estado` en la API siga siendo `activa`, y le oculta las acciones de bloquear y activar.",
      "El botón \"Dar de baja\" queda deshabilitado mientras la tarjeta tenga saldo utilizado.",
    ],
  },

  anexo: [
    {
      norma: "Reglamentación del BCP sobre tarjetas de crédito y medios de pago electrónicos",
      expectativa: "La emisión requiere identificar al titular, fijar un límite de crédito y entregar las condiciones del producto.",
      estado:
        "Parcial: la tarjeta queda asociada a un cliente y a un límite, pero no hay evaluación crediticia y la aceptación de condiciones existe solo en la pantalla web.",
    },
    {
      norma: "Ley 1334/98 de Defensa del Consumidor (SEDECO), deber de información y seguridad",
      expectativa: "El usuario debe poder bloquear su tarjeta de inmediato ante robo, extravío o fraude, y dejar constancia del motivo.",
      estado: "Parcial: el bloqueo es inmediato, pero el motivo no se guarda y no queda constancia de quién ni por qué bloqueó.",
    },
    {
      norma: "Estándar PCI DSS sobre protección de datos de tarjeta",
      expectativa: "El número completo y los datos sensibles de autenticación no deben almacenarse ni mostrarse en claro.",
      estado: "Cubierto por diseño: el sandbox solo maneja un número enmascarado ficticio y no existen código de seguridad ni PIN.",
    },
    {
      norma: "Normativa del BCP sobre límites de crédito y sobreendeudamiento",
      expectativa: "El consumo no puede superar el límite asignado, y los cambios de límite deben responder a una evaluación.",
      estado:
        "Parcial: la base impide que lo utilizado supere el límite y la API impide bajar el límite por debajo de lo utilizado, pero cualquier credencial puede subirlo sin tope ni evaluación.",
    },
    {
      norma: "Buenas prácticas de vigencia de medios de pago",
      expectativa: "Una tarjeta vencida debe dejar de operar automáticamente y renovarse con una nueva fecha.",
      estado: "No implementado: el vencimiento no se aplica solo, y renovar la fecha no saca a la tarjeta del estado `vencida`.",
    },
  ],

  brechas: [
    "Ningún endpoint modifica `saldo_utilizado`: no existen consumos ni pagos. El saldo utilizado solo proviene de los datos sembrados o de una preparación por el sandbox SQL.",
    "El estado `vencida` solo aparece en los datos sembrados: la API nunca lo asigna. Una tarjeta cuya fecha pasó sigue `activa` hasta que alguien intente reactivarla después de un bloqueo.",
    "No hay salida del estado `vencida`: no se puede bloquear, ni activar, y renovar su fecha con `PUT` no cambia el estado.",
    "`POST /tarjetas` acepta una fecha de vencimiento pasada y deja la tarjeta `activa`.",
    "`POST /tarjetas` no valida que la cuenta asociada pertenezca al titular ni que esté activa, y permite una tarjeta de débito sin cuenta.",
    "El `motivo` del bloqueo se acepta y se descarta: no queda guardado en ninguna tabla de dominio.",
    "`PATCH /limite` y `PUT /tarjetas/{id}` no miran el estado: operan igual sobre tarjetas bloqueadas o vencidas.",
    "El límite menor al saldo utilizado responde 400, mientras que las demás reglas de negocio del módulo responden 409: la convención no es uniforme.",
    "`PUT /tarjetas/{id}` permite dejar una tarjeta de débito con marca `amex`, combinación que la pantalla web no ofrece.",
    "El `numero_enmascarado` no es único: dos tarjetas pueden mostrar los mismos últimos cuatro dígitos.",
    "No existe control de titularidad: cualquier credencial del curso puede bloquear, activar, dar de baja o cambiar el límite de la tarjeta de cualquier cliente.",
    "El `disponible` de una tarjeta de débito es siempre 0 y no refleja el saldo de la cuenta asociada.",
  ],
};
