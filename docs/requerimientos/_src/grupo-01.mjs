import { rfToken } from "./comun.mjs";

export const grupo = {
  n: 1,
  slug: "grupo-01-cuentas-bancarias",
  titulo: "Cuentas Bancarias",
  modulo: "Módulo: Cuentas, saldos, estados y movimientos",

  alcance:
    "Cubre el ciclo de vida de una cuenta bancaria: apertura, consulta, modificación de sus datos, cambio de estado de negocio (`activa` / `bloqueada` / `cerrada`) y baja; la consulta del saldo; y el libro de movimientos de la cuenta, con el registro de depósitos (créditos) y retiros (débitos) que actualizan el saldo.",
  fueraDeAlcance:
    "Transferencias entre cuentas (Grupo 4), aunque sus movimientos aparecen en el extracto de la cuenta; intereses, comisiones y mantenimiento de cuenta; sobregiro (el saldo nunca puede quedar negativo); conversión de moneda; y la edición o anulación de un movimiento ya registrado.",

  endpoints: [
    { ruta: "GET /api/v2/cuentas", rf: "RF-G1-01", desc: "Lista cuentas vigentes, filtradas por titular y/o estado." },
    { ruta: "POST /api/v2/cuentas", rf: "RF-G1-02", desc: "Abre una cuenta para un cliente (saldo inicial 0)." },
    { ruta: "GET /api/v2/cuentas/{id}", rf: "RF-G1-03", desc: "Devuelve el detalle de una cuenta." },
    { ruta: "PUT /api/v2/cuentas/{id}", rf: "RF-G1-04", desc: "Reemplaza tipo y moneda de una cuenta." },
    { ruta: "DELETE /api/v2/cuentas/{id}", rf: "RF-G1-05", desc: "Da de baja una cuenta sin saldo." },
    { ruta: "PATCH /api/v2/cuentas/{id}/estado", rf: "RF-G1-06", desc: "Bloquea, desbloquea o cierra una cuenta." },
    { ruta: "GET /api/v2/cuentas/{id}/saldo", rf: "RF-G1-07", desc: "Vista reducida: saldo, estado y fecha del último movimiento." },
    { ruta: "GET /api/v2/cuentas/{id}/movimientos", rf: "RF-G1-08", desc: "Extracto de la cuenta, opcionalmente por tipo." },
    { ruta: "POST /api/v2/cuentas/{id}/movimientos", rf: "RF-G1-09", desc: "Registra un depósito o un retiro y actualiza el saldo." },
    { ruta: "POST /api/v2/g1/auth/token", rf: "RF-G1-TK", desc: "Emite el token JWT del grupo." },
  ],

  precondiciones: [
    "Para abrir una cuenta se necesita un cliente existente (`usuarioId`); se puede crear uno con `POST /api/v2/usuarios` o usar uno de los sembrados (ids 1 a 8).",
    "Las cuentas se identifican por su número interno (`id`), no por el `numero_cuenta` comercial de 10 dígitos.",
    "Datos sembrados útiles: las cuentas 1 a 7, 9, 11 y 12 nacen `activa` con saldo; la cuenta 8 nace `bloqueada` con saldo 0; la cuenta 10 nace `cerrada` con saldo 45.000 (un estado que la API no permite alcanzar: ver brechas). Las cuentas 2, 7 y 12 son en dólares.",
  ],

  tablas: [
    {
      nombre: "cuentas",
      desc: "Cuentas de los clientes. `estado` es el estado de negocio; `activa` es la marca de baja lógica. Son cosas distintas: bloquear o cerrar una cuenta no la da de baja.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`usuario_id`", "`bigint`, obligatorio, referencia a `usuarios(id)`"],
        ["`numero_cuenta`", "`text`, obligatorio y único; lo genera `POST /cuentas` al azar (10 dígitos)"],
        ["`tipo_cuenta`", "`text`, `ahorro` o `corriente` (por defecto `ahorro`)"],
        ["`moneda`", "`text`, `PYG` o `USD` (por defecto `PYG`)"],
        ["`saldo`", "`numeric(14,2)`, obligatorio, por defecto 0; la base exige que sea mayor o igual a cero"],
        ["`estado`", "`text`, uno de `activa` / `bloqueada` / `cerrada`; por defecto `activa`"],
        ["`activa`", "`boolean`, obligatorio, por defecto `true`; `false` = dada de baja"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
    {
      nombre: "movimientos",
      desc: "Libro de la cuenta. Cada fila guarda el saldo que quedó después de aplicarla. Lo escriben este módulo (`manual`) y los de transferencias, ahorros y depósitos.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`cuenta_id`", "`bigint`, obligatorio, referencia a `cuentas(id)`"],
        ["`tipo`", "`text`, `debito` o `credito`"],
        ["`monto`", "`numeric(14,2)`, obligatorio, la base exige que sea mayor que cero"],
        ["`saldo_posterior`", "`numeric(14,2)`, obligatorio: saldo de la cuenta inmediatamente después del movimiento"],
        [
          "`referencia_tipo`",
          "`text`, uno de `manual` / `transferencia` / `prestamo` / `ahorro` / `deposito` / `tarjeta`; por defecto `manual`",
        ],
        ["`referencia_id`", "`bigint`, opcional: id de la operación que originó el movimiento"],
        ["`descripcion`", "`text`, opcional"],
        ["`activo`", "`boolean`, por defecto `true`; ningún endpoint lo cambia"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
  ],

  notaDatos:
    "El saldo solo cambia a través de un movimiento: no hay endpoint que lo edite directamente. El `saldo_posterior` del último movimiento de una cuenta debe coincidir con `cuentas.saldo`. En los datos sembrados esa igualdad se cumple, pero el extracto sembrado no incluye todas las transferencias sembradas: no es un libro contable completo.",

  rf: [
    {
      id: "RF-G1-01",
      nombre: "Listar cuentas",
      endpoint: "GET /api/v2/cuentas",
      descripcion: "Devuelve las cuentas vigentes del sandbox, con la posibilidad de acotar por titular y por estado de negocio.",
      entradas: [
        "`usuarioId` (opcional, por query): número entero positivo.",
        "`estado` (opcional, por query): `activa`, `bloqueada` o `cerrada`.",
      ],
      reglas: [
        "Devuelve únicamente cuentas no dadas de baja (`activa = true`), en cualquier estado de negocio: una cuenta `cerrada` sigue apareciendo.",
        "Los dos filtros se combinan: con ambos, devuelve las cuentas de ese titular que están en ese estado.",
        "Un titular sin cuentas, o un `usuarioId` inexistente, devuelve una lista vacía y no un error.",
        "Máximo 100 filas, ordenadas por identificador ascendente.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de cuentas; cada elemento incluye `id`, `usuario_id`, `numero_cuenta`, `tipo_cuenta`, `moneda`, `saldo`, `estado`, `activa` y `created_at`.",
      ],
      errores: [
        ["`VALIDATION_ERROR`", "400", "`usuarioId` no es un entero positivo, o `estado` no es uno de los tres valores permitidos."],
      ],
      fuente: "`app/api/v2/cuentas/route.ts`",
      criterios: [
        "Al listar sin filtros, la respuesta es 200 y `data` es un arreglo de como máximo 100 elementos ordenados por `id` ascendente.",
        "Al filtrar por un titular con cuentas, todos los elementos devueltos tienen ese `usuario_id`.",
        "Al filtrar por `estado=bloqueada`, todos los elementos devueltos tienen `estado` igual a `bloqueada`.",
        "Al combinar `usuarioId` y `estado`, cada elemento cumple las dos condiciones.",
        "Al enviar `estado=suspendida` o `usuarioId=abc`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Una cuenta dada de baja con RF-G1-05 deja de aparecer en el listado.",
      ],
    },
    {
      id: "RF-G1-02",
      nombre: "Abrir una cuenta",
      endpoint: "POST /api/v2/cuentas",
      descripcion: "Abre una cuenta nueva para un cliente, con saldo cero y número de cuenta generado por el sistema.",
      entradas: [
        "`usuarioId` (obligatorio): número entero positivo del titular.",
        "`tipoCuenta` (obligatorio): `ahorro` o `corriente`.",
        "`moneda` (obligatorio): `PYG` o `USD`.",
      ],
      reglas: [
        "El `numero_cuenta` no lo envía el cliente: lo genera el servidor al azar (10 dígitos) y debe ser único.",
        "La cuenta nace con `saldo = 0`, `estado = 'activa'` y `activa = true`. No se puede abrir con saldo: el primer saldo se carga con un depósito (RF-G1-09).",
        "El titular debe existir: un `usuarioId` inexistente es rechazado por la clave foránea.",
        "**No se valida que el titular esté activo ni que ya tenga otra cuenta igual**: un cliente dado de baja puede recibir una cuenta, y un mismo cliente puede tener varias cuentas del mismo tipo y moneda.",
      ],
      respuesta: ["`201 Created` con `data` conteniendo la cuenta creada."],
      errores: [
        [
          "`VALIDATION_ERROR`",
          "400",
          "Falta un campo obligatorio, `tipoCuenta` o `moneda` tienen un valor fuera de la lista, o el `usuarioId` no existe.",
        ],
        ["`CONFLICT`", "409", "El número de cuenta generado al azar ya existía (caso extremadamente improbable; no hay reintento)."],
      ],
      fuente: "`app/api/v2/cuentas/route.ts`",
      criterios: [
        "Al abrir una cuenta para un titular existente, la respuesta es 201, `data.saldo` es `\"0.00\"`, `data.estado` es `activa` y `data.numero_cuenta` tiene 10 dígitos.",
        "La cuenta creada aparece de inmediato en RF-G1-01 filtrando por ese titular.",
        "Al abrir con `moneda=EUR` o `tipoCuenta=plazo`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al abrir para un `usuarioId` inexistente, la respuesta es 400 `VALIDATION_ERROR` y no se crea ninguna cuenta.",
        "Al abrir dos cuentas iguales (mismo titular, tipo y moneda), ambas respuestas son 201 con `numero_cuenta` distintos.",
      ],
    },
    {
      id: "RF-G1-03",
      nombre: "Consultar una cuenta",
      endpoint: "GET /api/v2/cuentas/{id}",
      descripcion: "Devuelve el detalle completo de una cuenta puntual.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Devuelve la cuenta cuyo identificador coincide exactamente, en cualquier estado de negocio.",
        "Si no existe o está dada de baja, responde 404 con el mensaje \"Cuenta no encontrada.\".",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la cuenta completa."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/cuentas/[id]/route.ts`",
      criterios: [
        "Dada una cuenta existente, al consultarla la respuesta es 200 y `data.id` coincide con el solicitado.",
        "Al consultar un identificador inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Cuenta no encontrada.\".",
        "Al consultar con `id=abc` o `id=0`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Una cuenta en estado `cerrada` se puede consultar: la respuesta es 200.",
      ],
    },
    {
      id: "RF-G1-04",
      nombre: "Modificar una cuenta",
      endpoint: "PUT /api/v2/cuentas/{id}",
      descripcion: "Reemplaza el tipo y la moneda de una cuenta. El número, el saldo y el estado quedan fuera de este reemplazo.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`tipoCuenta` (obligatorio): `ahorro` o `corriente`.",
        "`moneda` (obligatorio): `PYG` o `USD`.",
      ],
      reglas: [
        "Es un reemplazo: los dos campos son obligatorios aunque solo cambie uno.",
        "`numero_cuenta`, `saldo` y `estado` no forman parte del cuerpo; si se envían, se ignoran.",
        "**No se valida el estado ni el saldo**: se puede modificar una cuenta `bloqueada` o `cerrada`, y se puede cambiar la moneda de una cuenta con saldo y movimientos (el importe no se convierte, solo cambia la etiqueta).",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la cuenta ya actualizada."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "Falta un campo o tiene un valor fuera de la lista permitida."],
      ],
      fuente: "`app/api/v2/cuentas/[id]/route.ts`",
      criterios: [
        "Dada una cuenta `ahorro`, al enviar `tipoCuenta=corriente` con su misma moneda la respuesta es 200 y el cambio se refleja al volver a consultarla.",
        "El `numero_cuenta`, el `saldo` y el `estado` no cambian tras el reemplazo, aunque el cuerpo incluya esos campos.",
        "Al enviar solo `tipoCuenta` (sin `moneda`), la respuesta es 400 `VALIDATION_ERROR`.",
        "Al modificar una cuenta inexistente o dada de baja, la respuesta es 404 `NOT_FOUND`.",
        "Al cambiar la moneda de una cuenta con saldo, la respuesta es 200 y el `saldo` conserva el mismo valor numérico.",
      ],
    },
    {
      id: "RF-G1-05",
      nombre: "Dar de baja una cuenta",
      endpoint: "DELETE /api/v2/cuentas/{id}",
      descripcion: "Da de baja lógica una cuenta sin saldo, quitándola de los listados y consultas.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Una cuenta con saldo mayor que cero no puede darse de baja: responde 409 con el mensaje \"No se puede eliminar una cuenta con saldo distinto de 0.\". Primero hay que vaciarla con un retiro o una transferencia.",
        "Con saldo cero, marca `activa = false`; la fila y sus movimientos permanecen en la base.",
        "**No se valida el estado ni los productos asociados**: se puede dar de baja una cuenta `bloqueada`, y una cuenta con tarjetas, préstamos, planes de ahorro o depósitos vinculados.",
        "Repetir la baja sobre la misma cuenta responde 404: ya no es una cuenta vigente.",
      ],
      respuesta: ["`204 No Content`, sin cuerpo."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La cuenta tiene saldo mayor que cero."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/cuentas/[id]/route.ts`",
      criterios: [
        "Dada una cuenta recién abierta (saldo 0), al darla de baja la respuesta es 204 sin cuerpo.",
        "Tras la baja, RF-G1-03, RF-G1-07 y RF-G1-08 sobre esa cuenta responden 404, y deja de aparecer en RF-G1-01.",
        "Dada una cuenta con saldo, al intentar darla de baja la respuesta es 409 `CONFLICT` y la cuenta sigue siendo consultable.",
        "Dar de baja dos veces la misma cuenta devuelve 204 la primera vez y 404 la segunda.",
      ],
    },
    {
      id: "RF-G1-06",
      nombre: "Cambiar el estado de una cuenta",
      endpoint: "PATCH /api/v2/cuentas/{id}/estado",
      descripcion: "Mueve la cuenta entre sus estados de negocio: bloquearla, desbloquearla o cerrarla definitivamente.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`estado` (obligatorio, en el cuerpo): `activa`, `bloqueada` o `cerrada`.",
      ],
      reglas: [
        "`cerrada` es un estado terminal: una cuenta cerrada no admite ningún cambio de estado y responde 409 con el mensaje \"Una cuenta cerrada no puede cambiar de estado.\".",
        "Para cerrar una cuenta su saldo debe ser cero; con saldo mayor que cero responde 409 con el mensaje \"No se puede cerrar una cuenta con saldo distinto de 0.\".",
        "Las demás transiciones son libres: `activa` → `bloqueada`, `bloqueada` → `activa`, y `activa` o `bloqueada` → `cerrada`.",
        "Pedir el estado en el que la cuenta ya está no es un error: responde 200 sin cambios (salvo en una cuenta cerrada, que responde 409).",
        "Una cuenta `bloqueada` o `cerrada` no admite depósitos, retiros ni transferencias, pero sigue siendo consultable.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo la cuenta con su nuevo `estado`."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La cuenta ya está cerrada, o se intenta cerrar una cuenta con saldo."],
        ["`VALIDATION_ERROR`", "400", "Falta `estado` o no es uno de los tres valores permitidos."],
      ],
      fuente: "`app/api/v2/cuentas/[id]/estado/route.ts`",
      criterios: [
        "Dada una cuenta `activa`, al enviar `estado=bloqueada` la respuesta es 200 y `data.estado` es `bloqueada`.",
        "Dada una cuenta `bloqueada`, al enviar `estado=activa` la respuesta es 200 y la cuenta vuelve a admitir movimientos.",
        "Dada una cuenta con saldo cero, al enviar `estado=cerrada` la respuesta es 200 y `data.estado` es `cerrada`.",
        "Dada una cuenta con saldo, al enviar `estado=cerrada` la respuesta es 409 `CONFLICT` y el estado no cambia.",
        "Dada una cuenta `cerrada`, cualquier cambio de estado (incluido `cerrada`) responde 409 `CONFLICT`.",
        "Dada una cuenta `activa`, al enviar `estado=activa` la respuesta es 200.",
        "Al enviar `estado=suspendida`, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G1-07",
      nombre: "Consultar el saldo",
      endpoint: "GET /api/v2/cuentas/{id}/saldo",
      descripcion: "Devuelve una vista reducida de la cuenta, pensada para verificar el saldo sin leer la fila entera.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "`ultimo_movimiento` es la fecha y hora del movimiento más reciente de la cuenta; es `null` si la cuenta nunca tuvo movimientos.",
        "El saldo devuelto es el mismo de RF-G1-03: no se recalcula a partir del extracto.",
      ],
      respuesta: [
        "`200 OK` con `data` conteniendo `cuenta_id`, `numero_cuenta`, `moneda`, `saldo`, `estado` y `ultimo_movimiento`. El identificador viaja como `cuenta_id`, no como `id`.",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/cuentas/[id]/saldo/route.ts`",
      criterios: [
        "Dada una cuenta recién abierta, la respuesta es 200, `data.saldo` es `\"0.00\"` y `data.ultimo_movimiento` es `null`.",
        "Después de un depósito, `data.saldo` refleja el importe depositado y `data.ultimo_movimiento` deja de ser `null`.",
        "El `saldo` de esta vista coincide con el `saldo` de RF-G1-03 y con el `saldo_posterior` del último movimiento de RF-G1-08.",
        "Al consultar el saldo de una cuenta inexistente, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G1-08",
      nombre: "Listar movimientos de una cuenta",
      endpoint: "GET /api/v2/cuentas/{id}/movimientos",
      descripcion: "Devuelve el extracto de la cuenta, con la posibilidad de ver solo débitos o solo créditos.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`tipo` (opcional, por query): `debito` o `credito`.",
      ],
      reglas: [
        "Primero verifica que la cuenta exista y no esté dada de baja; si no, responde 404 en lugar de una lista vacía.",
        "Devuelve los movimientos de esa cuenta ordenados por identificador ascendente (el más antiguo primero), con un máximo de 100.",
        "Incluye los movimientos de cualquier origen: los manuales de este módulo y los generados por transferencias, aportes de ahorro y depósitos a plazo.",
        "No hay filtro por fecha ni por importe.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de movimientos; cada elemento incluye `id`, `cuenta_id`, `tipo`, `monto`, `saldo_posterior`, `referencia_tipo`, `referencia_id`, `descripcion`, `activo` y `created_at`.",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo, o `tipo` no es `debito` ni `credito`."],
      ],
      fuente: "`app/api/v2/cuentas/[id]/movimientos/route.ts`",
      criterios: [
        "Dada una cuenta recién abierta, la respuesta es 200 y `data` es un arreglo vacío.",
        "Después de un depósito y un retiro, `data` tiene dos elementos en el orden en que se registraron.",
        "Al filtrar por `tipo=credito`, todos los elementos devueltos tienen `tipo` igual a `credito`.",
        "Al enviar `tipo=ajuste`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al pedir los movimientos de una cuenta inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Cuenta no encontrada.\".",
      ],
    },
    {
      id: "RF-G1-09",
      nombre: "Registrar un depósito o un retiro",
      endpoint: "POST /api/v2/cuentas/{id}/movimientos",
      descripcion:
        "Registra un movimiento manual sobre la cuenta: un crédito (depósito) suma al saldo y un débito (retiro) resta. El saldo y el movimiento se actualizan juntos.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`tipo` (obligatorio): `credito` (depósito) o `debito` (retiro).",
        "`monto` (obligatorio): número mayor que cero. Debe enviarse como número JSON, no como texto.",
        "`descripcion` (opcional): texto libre.",
      ],
      reglas: [
        "La cuenta debe estar en estado `activa`; si está `bloqueada` o `cerrada` responde 409 con el mensaje \"La cuenta está bloqueada: no admite movimientos.\" (o `cerrada`).",
        "Un débito no puede superar el saldo: responde 409 con el mensaje \"Saldo insuficiente para el débito solicitado.\". Un débito por exactamente el saldo es válido y deja la cuenta en cero.",
        "Un crédito no tiene tope de importe.",
        "El movimiento queda con `referencia_tipo = 'manual'`, sin `referencia_id`, y con `saldo_posterior` igual al saldo resultante.",
        "La operación es atómica y bloquea la cuenta mientras dura: dos retiros simultáneos no pueden dejar el saldo en negativo.",
        "Ante cualquier rechazo, ni el saldo ni el extracto cambian.",
      ],
      respuesta: [
        "`201 Created` con `data` conteniendo el movimiento creado y, anidada en `data.cuenta`, la cuenta con su saldo ya actualizado.",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe una cuenta vigente con ese identificador."],
        ["`CONFLICT`", "409", "La cuenta no está activa, o el débito supera el saldo."],
        [
          "`VALIDATION_ERROR`",
          "400",
          "Falta `tipo` o `monto`, el `tipo` no es válido, o el `monto` es cero, negativo o no es un número JSON.",
        ],
      ],
      fuente: "`app/api/v2/cuentas/[id]/movimientos/route.ts`",
      criterios: [
        "Dada una cuenta activa con saldo 0, al depositar 500000 la respuesta es 201, `data.tipo` es `credito`, `data.saldo_posterior` es `\"500000.00\"` y `data.cuenta.saldo` es `\"500000.00\"`.",
        "Dada una cuenta con saldo 500000, al retirar 200000 la respuesta es 201 y `data.saldo_posterior` es `\"300000.00\"`.",
        "Al retirar exactamente el saldo disponible, la respuesta es 201 y el saldo queda en `\"0.00\"`.",
        "Al retirar un importe mayor al saldo, la respuesta es 409 `CONFLICT` con el mensaje \"Saldo insuficiente para el débito solicitado.\" y el saldo no cambia.",
        "Dada una cuenta `bloqueada`, tanto un depósito como un retiro responden 409 `CONFLICT`.",
        "Al enviar `monto` igual a 0, negativo o como texto (`\"1000\"`), la respuesta es 400 `VALIDATION_ERROR` y no se registra ningún movimiento.",
        "Dada una cuenta en dólares, al depositar 150.75 el saldo aumenta exactamente en 150.75, sin pérdida de centavos.",
        "El movimiento creado aparece como último elemento de RF-G1-08 con `referencia_tipo` igual a `manual`.",
      ],
    },
    rfToken(1, "c2_g01_cuentas", 2),
  ],

  web: {
    pantallas: [
      [
        "`/v2/cuentas` — Listado de cuentas",
        "Tabla con número, titular, tipo, moneda, saldo y estado; filtros por titular y por estado, búsqueda por número de cuenta y totales de saldo por moneda. Ejecuta RF-G1-01.",
      ],
      [
        "`/v2/cuentas/new` — Abrir cuenta",
        "Formulario con titular, tipo de cuenta, moneda y aceptación del contrato. Ejecuta RF-G1-02 y navega al detalle de la cuenta creada.",
      ],
      [
        "`/v2/cuentas/{id}` — Detalle de cuenta",
        "Muestra saldo, estado y titular; permite bloquear, desbloquear y cerrar (RF-G1-06), registrar un depósito o un retiro (RF-G1-09), editar tipo y moneda (RF-G1-04), ver el extracto con filtro por tipo (RF-G1-08) y eliminar la cuenta (RF-G1-05).",
      ],
    ],
    notas: [
      "**Regla de UI:** el formulario de apertura no deja abrir una segunda cuenta del mismo tipo y moneda para un cliente que ya tiene una no cerrada. La API sí lo permite.",
      "**Regla de UI:** la apertura exige marcar la aceptación del contrato; ese dato no se envía a la API.",
      "**Regla de UI:** la moneda solo se puede editar en una cuenta sin saldo ni movimientos, y una cuenta cerrada no se puede editar. La API acepta ambos cambios.",
      "**Regla de UI:** la descripción de un movimiento admite hasta 60 caracteres. La API no limita su longitud.",
      "El retiro por un importe mayor al saldo se rechaza en el navegador antes de llegar a la API, con el mensaje \"Saldo insuficiente: el disponible es ...\".",
      "Los botones \"Cerrar cuenta\" y \"Eliminar cuenta\" quedan deshabilitados mientras la cuenta tenga saldo; bloquear y cerrar piden confirmación.",
      "El extracto se muestra del más reciente al más antiguo, al revés del orden en que lo devuelve la API.",
    ],
  },

  anexo: [
    {
      norma: "Reglamentación del BCP sobre cuentas de depósito y cuentas básicas de ahorro",
      expectativa: "La apertura de una cuenta requiere identificar al titular y dejar constancia de las condiciones aceptadas.",
      estado:
        "Parcial: la cuenta queda asociada a un cliente identificado por documento, pero no se valida que esté activo y la aceptación del contrato existe solo en la pantalla web.",
    },
    {
      norma: "Ley 1015/97 y debida diligencia del cliente (SEPRELAD)",
      expectativa: "Conocer al cliente antes de operar y conservar el registro de sus operaciones para su monitoreo.",
      estado:
        "Parcial: cada movimiento queda registrado con importe, fecha y saldo resultante, pero no hay verificación de identidad, umbrales ni alertas por operaciones inusuales.",
    },
    {
      norma: "Marco del BCP sobre disponibilidad de fondos en cuentas de depósito",
      expectativa: "Un débito solo puede ejecutarse si la cuenta está operativa y tiene fondos suficientes.",
      estado: "Cubierto: un retiro exige cuenta `activa` y saldo suficiente, y la base impide el saldo negativo.",
    },
    {
      norma: "Ley 1334/98 de Defensa del Consumidor (SEDECO), deber de información",
      expectativa: "El usuario debe poder conocer su saldo y el detalle de los movimientos de su cuenta.",
      estado: "Cubierto: la API expone saldo y extracto, y la web los muestra en el detalle de la cuenta.",
    },
    {
      norma: "Normativa del BCP sobre cierre de cuentas y saldos remanentes",
      expectativa: "El cierre de una cuenta requiere liquidar su saldo y debe quedar registrado como definitivo.",
      estado: "Cubierto en la API (no se cierra con saldo y `cerrada` es terminal); los datos sembrados incluyen una cuenta cerrada con saldo que contradice la regla.",
    },
  ],

  brechas: [
    "La cuenta 10 de los datos sembrados está `cerrada` con saldo 45.000: un estado que `PATCH /estado` nunca permitiría alcanzar. Ese saldo queda inmovilizado, porque una cuenta cerrada no admite retiros.",
    "`PUT /cuentas/{id}` no mira el estado ni el saldo: permite modificar una cuenta cerrada y cambiar la moneda de una cuenta con saldo, sin convertir el importe.",
    "`DELETE /cuentas/{id}` no verifica productos asociados: una cuenta con tarjetas, préstamos, planes de ahorro o depósitos vinculados se puede dar de baja, y esos productos quedan apuntando a una cuenta que ya no se puede consultar.",
    "`POST /cuentas` no valida que el titular esté activo ni impide cuentas duplicadas del mismo tipo y moneda.",
    "No existe control de titularidad: cualquier credencial del curso puede depositar, retirar, bloquear o cerrar la cuenta de cualquier cliente.",
    "Los movimientos no se pueden corregir ni anular: no hay `PUT`, `DELETE` ni consulta por id de un movimiento individual.",
    "El extracto está limitado a los primeros 100 movimientos (los más antiguos), sin paginación ni filtro por fecha: en una cuenta con más de 100 movimientos, los más recientes no se pueden listar por la API.",
    "El extracto sembrado no es contablemente completo: hay transferencias sembradas en estado `completada` sin su movimiento correspondiente.",
    "No hay tope para un depósito, ni límites diarios de retiro, ni comisiones, ni intereses sobre el saldo.",
    "Pedir el estado en el que la cuenta ya está responde 200 en lugar de señalar que no hubo cambio.",
  ],
};
