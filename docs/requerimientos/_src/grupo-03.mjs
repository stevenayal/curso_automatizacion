import { rfToken } from "./comun.mjs";

export const grupo = {
  n: 3,
  slug: "grupo-03-prestamos",
  titulo: "Préstamos",
  modulo: "Módulo: Préstamos, cuotas, saldo pendiente, vencimientos y estado",

  alcance:
    "Cubre el ciclo de vida de un préstamo: la solicitud, la modificación de sus condiciones mientras está en evaluación, la aprobación —que fija el saldo pendiente y genera el plan de cuotas—, la consulta del cronograma, el pago de cuotas hasta cancelar el préstamo, y la baja.",
  fueraDeAlcance:
    "El desembolso del dinero y el débito de las cuotas (ninguna operación del módulo mueve el saldo de una cuenta); el rechazo de una solicitud; la evaluación crediticia; el interés por mora y el vencimiento automático de cuotas; los pagos parciales o adelantados con recálculo; y la amortización con sistema francés o alemán (el sandbox usa interés simple con cuota fija).",

  endpoints: [
    { ruta: "GET /api/v2/prestamos", rf: "RF-G3-01", desc: "Lista préstamos vigentes, filtrados por titular y/o estado." },
    { ruta: "POST /api/v2/prestamos", rf: "RF-G3-02", desc: "Registra una solicitud de préstamo." },
    { ruta: "GET /api/v2/prestamos/{id}", rf: "RF-G3-03", desc: "Devuelve el detalle de un préstamo." },
    { ruta: "PUT /api/v2/prestamos/{id}", rf: "RF-G3-04", desc: "Reemplaza las condiciones de un préstamo solicitado." },
    { ruta: "DELETE /api/v2/prestamos/{id}", rf: "RF-G3-05", desc: "Da de baja un préstamo sin saldo pendiente." },
    { ruta: "POST /api/v2/prestamos/{id}/aprobar", rf: "RF-G3-06", desc: "Aprueba el préstamo y genera el plan de cuotas." },
    { ruta: "GET /api/v2/prestamos/{id}/cuotas", rf: "RF-G3-07", desc: "Devuelve el cronograma de cuotas, opcionalmente por estado." },
    { ruta: "POST /api/v2/prestamos/{id}/cuotas/{numero}/pagar", rf: "RF-G3-08", desc: "Paga una cuota y descuenta el saldo pendiente." },
    { ruta: "POST /api/v2/g3/auth/token", rf: "RF-G3-TK", desc: "Emite el token JWT del grupo." },
  ],

  precondiciones: [
    "Para solicitar un préstamo se necesita un cliente existente (`usuarioId`); la cuenta de acreditación (`cuentaId`) es opcional y solo informativa.",
    "Datos sembrados: préstamos 1 y 5 en `solicitado` (sin cuotas); préstamos 2, 3 y 4 en `aprobado` con cuotas; préstamo 6 en `pagado` con sus tres cuotas pagadas. El préstamo 4 tiene dos cuotas en estado `vencida`.",
    "**Los préstamos sembrados 2 y 3 no cierran contablemente** (ver brechas): su saldo pendiente no coincide con la suma de sus cuotas impagas. Para un escenario que pague un préstamo hasta cancelarlo, hay que crear y aprobar un préstamo propio.",
    "Las fechas de vencimiento de las cuotas se calculan a partir del día en que se aprueba: un escenario no debe esperar fechas fijas, sino fechas relativas a la de ejecución.",
  ],

  tablas: [
    {
      nombre: "prestamos",
      desc: "Préstamos solicitados y otorgados. `estado` es el estado de negocio y `activo` la marca de baja lógica.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`usuario_id`", "`bigint`, obligatorio, referencia a `usuarios(id)`"],
        ["`cuenta_id`", "`bigint`, opcional, referencia a `cuentas(id)`"],
        ["`monto_solicitado`", "`numeric(14,2)`, obligatorio, mayor que cero"],
        ["`tasa_interes`", "`numeric(5,2)`, obligatoria, mayor o igual a cero; porcentaje total, no anual"],
        ["`plazo_meses`", "`integer`, obligatorio, entre 1 y 120"],
        ["`saldo_pendiente`", "`numeric(14,2)`, obligatorio, por defecto 0; mayor o igual a cero"],
        ["`estado`", "`text`, uno de `solicitado` / `aprobado` / `rechazado` / `pagado`; por defecto `solicitado`"],
        ["`activo`", "`boolean`, obligatorio, por defecto `true`; `false` = dado de baja"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
    {
      nombre: "cuotas_prestamo",
      desc: "Plan de cuotas de cada préstamo aprobado. No tiene marca de baja lógica: las cuotas no se eliminan.",
      columnas: [
        ["`id`", "`bigserial`, clave primaria"],
        ["`prestamo_id`", "`bigint`, obligatorio, referencia a `prestamos(id)`"],
        ["`numero_cuota`", "`integer`, obligatorio, mayor que cero; único dentro del préstamo"],
        ["`monto`", "`numeric(14,2)`, obligatorio, mayor que cero"],
        ["`fecha_vencimiento`", "`date`, obligatoria"],
        ["`estado`", "`text`, uno de `pendiente` / `pagada` / `vencida`; por defecto `pendiente`"],
        ["`fecha_pago`", "`timestamptz`, opcional; se completa al pagar"],
        ["`created_at`", "`timestamptz`, por defecto `now()`"],
      ],
    },
  ],

  notaDatos:
    "Fórmulas del módulo, con interés simple aplicado una sola vez sobre el capital: **total a devolver** = monto × (1 + tasa / 100), redondeado a dos decimales; **cuota** = total / plazo, redondeada a dos decimales; la **última cuota** absorbe la diferencia de redondeo para que la suma de las cuotas sea exactamente el total. La tasa no es anual: un préstamo al 18 % devuelve el 118 % del capital sea cual sea el plazo. Ejemplo: 2.000.000 al 16 % en 3 meses da un total de 2.320.000, con cuotas de 773.333,33, 773.333,33 y 773.333,34.",

  rf: [
    {
      id: "RF-G3-01",
      nombre: "Listar préstamos",
      endpoint: "GET /api/v2/prestamos",
      descripcion: "Devuelve los préstamos vigentes del sandbox, con la posibilidad de acotar por titular y por estado.",
      entradas: [
        "`usuarioId` (opcional, por query): número entero positivo.",
        "`estado` (opcional, por query): `solicitado`, `aprobado`, `rechazado` o `pagado`.",
      ],
      reglas: [
        "Devuelve únicamente préstamos no dados de baja (`activo = true`).",
        "Los dos filtros se combinan entre sí.",
        "El listado no incluye las cuotas: se consultan por préstamo con RF-G3-07.",
        "Máximo 100 filas, ordenadas por identificador ascendente.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de préstamos; cada elemento incluye `id`, `usuario_id`, `cuenta_id`, `monto_solicitado`, `tasa_interes`, `plazo_meses`, `saldo_pendiente`, `estado`, `activo` y `created_at`.",
      ],
      errores: [
        ["`VALIDATION_ERROR`", "400", "`usuarioId` no es un entero positivo, o `estado` no es uno de los cuatro valores permitidos."],
      ],
      fuente: "`app/api/v2/prestamos/route.ts`",
      criterios: [
        "Al listar sin filtros, la respuesta es 200 y `data` es un arreglo ordenado por `id` ascendente.",
        "Al filtrar por `estado=solicitado`, todos los elementos devueltos tienen `estado` igual a `solicitado` y `saldo_pendiente` igual a `\"0.00\"`.",
        "Al filtrar por un titular, todos los elementos devueltos tienen ese `usuario_id`.",
        "Al filtrar por `estado=rechazado`, la respuesta es 200 con un arreglo vacío (ningún dato sembrado ni endpoint produce ese estado).",
        "Al enviar `estado=vigente`, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G3-02",
      nombre: "Solicitar un préstamo",
      endpoint: "POST /api/v2/prestamos",
      descripcion: "Registra una solicitud de préstamo. La solicitud queda en evaluación, sin saldo pendiente y sin cuotas.",
      entradas: [
        "`usuarioId` (obligatorio): número entero positivo del titular.",
        "`cuentaId` (opcional): número entero positivo de la cuenta de acreditación.",
        "`montoSolicitado` (obligatorio): número mayor que cero, como número JSON.",
        "`tasaInteres` (obligatorio): número entre 0 y 999,99, como número JSON. Una tasa de 0 es válida.",
        "`plazoMeses` (obligatorio): número entero entre 1 y 120, como número JSON.",
      ],
      reglas: [
        "El préstamo nace con `estado = 'solicitado'`, `saldo_pendiente = 0` y sin cuotas: el plan lo genera la aprobación (RF-G3-06).",
        "El titular debe existir, y la cuenta también si se indica; un id inexistente es rechazado por la clave foránea.",
        "**No se valida que la cuenta pertenezca al titular, ni su estado ni su moneda**; tampoco que el titular esté activo.",
        "No hay tope de monto de negocio, ni límite de préstamos simultáneos por cliente.",
      ],
      respuesta: ["`201 Created` con `data` conteniendo el préstamo creado."],
      errores: [
        [
          "`VALIDATION_ERROR`",
          "400",
          "Falta un campo obligatorio, el monto no es positivo, la tasa es negativa o supera 999,99, el plazo no es un entero entre 1 y 120, algún valor numérico llegó como texto, o el titular o la cuenta no existen.",
        ],
      ],
      fuente: "`app/api/v2/prestamos/route.ts`",
      criterios: [
        "Al solicitar un préstamo válido, la respuesta es 201, `data.estado` es `solicitado` y `data.saldo_pendiente` es `\"0.00\"`.",
        "Inmediatamente después de solicitar, RF-G3-07 sobre ese préstamo devuelve un arreglo vacío.",
        "Al solicitar con `plazoMeses` igual a 0, 121 o 6.5, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al solicitar con `plazoMeses` igual a 1 y a 120 (los límites), la respuesta es 201.",
        "Al solicitar con `montoSolicitado` igual a 0 o negativo, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al solicitar con `tasaInteres` igual a 0, la respuesta es 201; con −1 o 1000, es 400 `VALIDATION_ERROR`.",
        "Al solicitar para un `usuarioId` inexistente, la respuesta es 400 `VALIDATION_ERROR` y no se crea ningún préstamo.",
      ],
    },
    {
      id: "RF-G3-03",
      nombre: "Consultar un préstamo",
      endpoint: "GET /api/v2/prestamos/{id}",
      descripcion: "Devuelve el detalle de un préstamo puntual: condiciones, saldo pendiente y estado.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Devuelve el préstamo en cualquier estado de negocio, sin sus cuotas.",
        "Si no existe o está dado de baja, responde 404 con el mensaje \"Préstamo no encontrado.\".",
      ],
      respuesta: ["`200 OK` con `data` conteniendo el préstamo completo."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un préstamo vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/prestamos/[id]/route.ts`",
      criterios: [
        "Dado un préstamo existente, al consultarlo la respuesta es 200 y `data.id` coincide con el solicitado.",
        "Al consultar un identificador inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Préstamo no encontrado.\".",
        "Al consultar con un identificador no numérico, la respuesta es 400 `VALIDATION_ERROR`.",
      ],
    },
    {
      id: "RF-G3-04",
      nombre: "Modificar las condiciones de un préstamo",
      endpoint: "PUT /api/v2/prestamos/{id}",
      descripcion: "Reemplaza monto, tasa y plazo de un préstamo que todavía está en evaluación.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`montoSolicitado` (obligatorio): número mayor que cero.",
        "`tasaInteres` (obligatorio): número entre 0 y 999,99.",
        "`plazoMeses` (obligatorio): número entero entre 1 y 120.",
      ],
      reglas: [
        "Solo se puede modificar un préstamo en estado `solicitado`. En cualquier otro estado responde 409 con el mensaje \"Un préstamo en estado 'aprobado' ya no puede modificarse.\" (con el estado que corresponda): una vez aprobado ya existe un plan de cuotas emitido contra esos números.",
        "Es un reemplazo: los tres campos son obligatorios aunque solo cambie uno.",
        "El titular, la cuenta y el estado no forman parte del cuerpo; si se envían, se ignoran.",
      ],
      respuesta: ["`200 OK` con `data` conteniendo el préstamo ya actualizado."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un préstamo vigente con ese identificador."],
        ["`CONFLICT`", "409", "El préstamo ya no está en estado `solicitado`."],
        ["`VALIDATION_ERROR`", "400", "Falta un campo o alguno está fuera de rango."],
      ],
      fuente: "`app/api/v2/prestamos/[id]/route.ts`",
      criterios: [
        "Dado un préstamo `solicitado`, al cambiar su plazo la respuesta es 200 y el cambio se refleja al volver a consultarlo.",
        "Dado un préstamo `aprobado`, al intentar modificarlo la respuesta es 409 `CONFLICT` y sus condiciones no cambian.",
        "Dado un préstamo `pagado`, al intentar modificarlo la respuesta es 409 `CONFLICT`.",
        "Al enviar solo `montoSolicitado`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Si se modifica un préstamo y luego se aprueba, el plan de cuotas se calcula con las condiciones modificadas.",
      ],
    },
    {
      id: "RF-G3-05",
      nombre: "Dar de baja un préstamo",
      endpoint: "DELETE /api/v2/prestamos/{id}",
      descripcion: "Da de baja lógica un préstamo que no tiene saldo pendiente.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo."],
      reglas: [
        "Un préstamo con saldo pendiente mayor que cero no puede darse de baja: responde 409 con el mensaje \"No se puede eliminar un préstamo con saldo pendiente.\".",
        "En la práctica se pueden dar de baja los préstamos `solicitado` (desistir de la solicitud) y los `pagado`; uno `aprobado` solo cuando su saldo llegó a cero.",
        "Marca `activo = false`; el préstamo y sus cuotas permanecen en la base, pero las cuotas dejan de poder consultarse por la API.",
      ],
      respuesta: ["`204 No Content`, sin cuerpo."],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un préstamo vigente con ese identificador."],
        ["`CONFLICT`", "409", "El préstamo tiene saldo pendiente."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/prestamos/[id]/route.ts`",
      criterios: [
        "Dado un préstamo `solicitado`, al darlo de baja la respuesta es 204 sin cuerpo.",
        "Tras la baja, RF-G3-03 y RF-G3-07 sobre ese préstamo responden 404, y deja de aparecer en RF-G3-01.",
        "Dado un préstamo `aprobado` con saldo pendiente, al intentar darlo de baja la respuesta es 409 `CONFLICT` y el préstamo sigue siendo consultable.",
        "Dado un préstamo cancelado por completo (`pagado`), al darlo de baja la respuesta es 204.",
      ],
    },
    {
      id: "RF-G3-06",
      nombre: "Aprobar un préstamo",
      endpoint: "POST /api/v2/prestamos/{id}/aprobar",
      descripcion:
        "Aprueba una solicitud: pasa el préstamo a `aprobado`, fija el saldo pendiente en el total a devolver y emite el plan de cuotas, todo en una sola operación.",
      entradas: ["`id` (obligatorio, en la ruta): número entero positivo. No lleva cuerpo."],
      reglas: [
        "Solo se aprueba un préstamo en estado `solicitado`. En otro estado responde 409 con el mensaje \"El préstamo ya está en estado 'aprobado'.\" (con el estado que corresponda).",
        "El saldo pendiente queda en el total a devolver: monto × (1 + tasa / 100), redondeado a dos decimales.",
        "Se generan tantas cuotas como meses de plazo, numeradas desde 1, todas en estado `pendiente`.",
        "Cada cuota vale total / plazo redondeado a dos decimales; la última absorbe la diferencia de redondeo, de modo que la suma de las cuotas es exactamente el saldo pendiente.",
        "Cada cuota vence tantos meses después de la fecha de aprobación como indica su número: la primera un mes después, la segunda dos, y así sucesivamente.",
        "La operación es atómica: dos aprobaciones simultáneas no pueden generar el plan dos veces.",
        "**La aprobación no acredita el dinero**: el saldo de la cuenta asociada no cambia y no se registra ningún movimiento.",
      ],
      respuesta: [
        "`200 OK` con `data` conteniendo el préstamo actualizado y, en `data.cuotas`, el arreglo con el plan completo recién generado.",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un préstamo vigente con ese identificador."],
        ["`CONFLICT`", "409", "El préstamo no está en estado `solicitado`."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo."],
      ],
      fuente: "`app/api/v2/prestamos/[id]/aprobar/route.ts`",
      criterios: [
        "Dado un préstamo `solicitado` de 6.000.000 al 20 % en 6 meses, al aprobarlo la respuesta es 200, `data.estado` es `aprobado`, `data.saldo_pendiente` es `\"7200000.00\"` y `data.cuotas` tiene 6 elementos de `\"1200000.00\"`.",
        "Dado un préstamo de 2.000.000 al 16 % en 3 meses, las cuotas son `\"773333.33\"`, `\"773333.33\"` y `\"773333.34\"`, y su suma es exactamente 2.320.000.",
        "Todas las cuotas generadas tienen `estado` igual a `pendiente` y `fecha_pago` nula, con `numero_cuota` consecutivo desde 1.",
        "La `fecha_vencimiento` de la primera cuota es un mes posterior a la fecha de aprobación, y cada cuota siguiente vence un mes después de la anterior.",
        "Dado un préstamo con tasa 0, el saldo pendiente es igual al monto solicitado.",
        "Al aprobar por segunda vez el mismo préstamo, la respuesta es 409 `CONFLICT` y no se generan cuotas adicionales.",
        "Tras aprobar un préstamo con cuenta asociada, el saldo de esa cuenta es el mismo que antes.",
        "Al aprobar un préstamo inexistente, la respuesta es 404 `NOT_FOUND`.",
      ],
    },
    {
      id: "RF-G3-07",
      nombre: "Consultar el cronograma de cuotas",
      endpoint: "GET /api/v2/prestamos/{id}/cuotas",
      descripcion: "Devuelve el plan de cuotas de un préstamo, con la posibilidad de ver solo las de un estado.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo.",
        "`estado` (opcional, por query): `pendiente`, `pagada` o `vencida`.",
      ],
      reglas: [
        "Primero verifica que el préstamo exista y no esté dado de baja; si no, responde 404 en lugar de una lista vacía.",
        "Devuelve las cuotas ordenadas por número de cuota ascendente, sin tope de cantidad.",
        "Un préstamo `solicitado` todavía no tiene cuotas: devuelve una lista vacía.",
        "El filtro usa el estado guardado: una cuota `pendiente` con fecha de vencimiento pasada no aparece como `vencida`.",
      ],
      respuesta: [
        "`200 OK` con `data` como arreglo de cuotas; cada elemento incluye `id`, `prestamo_id`, `numero_cuota`, `monto`, `fecha_vencimiento`, `estado`, `fecha_pago` y `created_at`.",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe un préstamo vigente con ese identificador."],
        ["`VALIDATION_ERROR`", "400", "El identificador no es un entero positivo, o `estado` no es uno de los tres valores permitidos."],
      ],
      fuente: "`app/api/v2/prestamos/[id]/cuotas/route.ts`",
      criterios: [
        "Dado un préstamo recién aprobado a 6 meses, la respuesta es 200 y `data` tiene 6 cuotas ordenadas por `numero_cuota`.",
        "Dado un préstamo `solicitado`, la respuesta es 200 y `data` es un arreglo vacío.",
        "Después de pagar una cuota, al filtrar por `estado=pagada` se devuelve exactamente esa cuota, y al filtrar por `estado=pendiente` se devuelven las restantes.",
        "Al enviar `estado=anulada`, la respuesta es 400 `VALIDATION_ERROR`.",
        "Al pedir las cuotas de un préstamo inexistente, la respuesta es 404 `NOT_FOUND` con el mensaje \"Préstamo no encontrado.\".",
      ],
    },
    {
      id: "RF-G3-08",
      nombre: "Pagar una cuota",
      endpoint: "POST /api/v2/prestamos/{id}/cuotas/{numero}/pagar",
      descripcion:
        "Registra el pago de una cuota: la marca como pagada, descuenta su importe del saldo pendiente y, si el saldo llega a cero, deja el préstamo cancelado.",
      entradas: [
        "`id` (obligatorio, en la ruta): número entero positivo del préstamo.",
        "`numero` (obligatorio, en la ruta): número entero positivo. Es el **número de cuota** dentro del préstamo, no el `id` de la cuota. No lleva cuerpo.",
      ],
      reglas: [
        "El préstamo debe estar en estado `aprobado`. En otro estado responde 409 con el mensaje \"El préstamo está en estado 'solicitado': no admite pagos.\" (con el estado que corresponda).",
        "Si el préstamo no tiene una cuota con ese número, responde 404 con el mensaje \"Cuota no encontrada.\".",
        "Una cuota ya pagada no se puede volver a pagar: responde 409 con el mensaje \"La cuota ya fue pagada.\".",
        "Tanto una cuota `pendiente` como una `vencida` se pueden pagar, por su importe original: no hay recargo por mora.",
        "La cuota queda con `estado = 'pagada'` y `fecha_pago` con el momento del pago.",
        "El saldo pendiente del préstamo baja en el importe de la cuota (nunca por debajo de cero); cuando llega a cero, el préstamo pasa a `pagado`.",
        "**Las cuotas se pueden pagar en cualquier orden**: la API no exige pagar primero la más antigua.",
        "**El pago no debita ninguna cuenta**: no se valida saldo ni se registra movimiento. Siempre se paga la cuota completa.",
        "La operación es atómica: dos pagos simultáneos de la misma cuota no pueden descontar el saldo dos veces.",
      ],
      respuesta: [
        "`200 OK` con `data.cuota` (la cuota ya pagada) y `data.prestamo` (el préstamo con su saldo pendiente y estado actualizados).",
      ],
      errores: [
        ["`NOT_FOUND`", "404", "No existe el préstamo, o no tiene una cuota con ese número."],
        ["`CONFLICT`", "409", "El préstamo no está aprobado, o la cuota ya fue pagada."],
        ["`VALIDATION_ERROR`", "400", "El identificador o el número de cuota no son enteros positivos."],
      ],
      fuente: "`app/api/v2/prestamos/[id]/cuotas/[numero]/pagar/route.ts`",
      criterios: [
        "Dado un préstamo recién aprobado con saldo 7.200.000 y cuotas de 1.200.000, al pagar la cuota 1 la respuesta es 200, `data.cuota.estado` es `pagada`, `data.cuota.fecha_pago` no es nula y `data.prestamo.saldo_pendiente` es `\"6000000.00\"`.",
        "Al pagar por segunda vez la misma cuota, la respuesta es 409 `CONFLICT` con el mensaje \"La cuota ya fue pagada.\" y el saldo pendiente no cambia.",
        "Al pagar todas las cuotas de un préstamo propio, tras el último pago `data.prestamo.saldo_pendiente` es `\"0.00\"` y `data.prestamo.estado` es `pagado`.",
        "Dado un préstamo `pagado`, al intentar pagar cualquier cuota la respuesta es 409 `CONFLICT`.",
        "Dado un préstamo `solicitado`, al intentar pagar la cuota 1 la respuesta es 409 `CONFLICT`.",
        "Al pagar la cuota 99 de un préstamo de 6 cuotas, la respuesta es 404 `NOT_FOUND` con el mensaje \"Cuota no encontrada.\".",
        "Al pagar la cuota 3 antes que la 1 y la 2, la respuesta es 200: la API no impone orden.",
        "Dada una cuota sembrada en estado `vencida`, al pagarla la respuesta es 200 y el saldo baja exactamente en el `monto` de la cuota.",
      ],
    },
    rfToken(3, "c2_g03_prestamos", 4),
  ],

  web: {
    pantallas: [
      [
        "`/v2/prestamos` — Listado de préstamos",
        "Tabla con número, titular, monto, tasa, saldo pendiente, avance de pago y estado; filtros por titular y por estado, con la deuda total y la cantidad de solicitudes en evaluación. Ejecuta RF-G3-01.",
      ],
      [
        "`/v2/prestamos/new` — Simular y solicitar",
        "Asistente de dos pasos: en \"Simulación\" se cargan titular, cuenta, monto, plazo e interés, y se ve el cronograma proyectado; en \"Confirmación\" se revisa el resumen y se aceptan las condiciones. Ejecuta RF-G3-02 y navega al detalle.",
      ],
      [
        "`/v2/prestamos/{id}` — Detalle de préstamo",
        "Muestra condiciones, saldo pendiente y avance. Mientras está `solicitado` permite aprobar (RF-G3-06) y modificar condiciones (RF-G3-04) con la simulación a la vista; una vez aprobado muestra el cronograma (RF-G3-07) y permite pagar cuotas (RF-G3-08). También permite dar de baja (RF-G3-05).",
      ],
    ],
    notas: [
      "**Regla de UI:** el monto debe estar entre 500.000 y 500.000.000 de guaraníes. La API acepta cualquier monto mayor que cero.",
      "**Regla de UI:** el plazo se elige de una lista fija (6, 12, 18, 24, 36, 48 o 60 meses). La API acepta cualquier entero de 1 a 120.",
      "**Regla de UI:** la cuenta de acreditación es obligatoria y debe ser una cuenta activa en guaraníes del titular. La API la acepta opcional y sin validarla.",
      "**Regla de UI:** solo se puede pagar la próxima cuota impaga, en orden. La API acepta pagar cualquier cuota.",
      "**Regla de UI:** la solicitud exige aceptar las condiciones del préstamo; ese dato no se envía a la API.",
      "La simulación de la pantalla usa la misma fórmula que la aprobación, por lo que el cronograma proyectado coincide con el que genera la API si se aprueba el mismo día.",
      "El botón de baja se llama \"Desistir de la solicitud\" mientras el préstamo está `solicitado` y queda deshabilitado mientras haya saldo pendiente.",
      "El avance de pago se calcula en el navegador como 1 − saldo pendiente / total; no es un dato de la API.",
    ],
  },

  anexo: [
    {
      norma: "Reglamentación del BCP sobre transparencia e información de operaciones de crédito",
      expectativa: "Antes de contratar, el cliente debe conocer el monto total a pagar, la tasa, el plazo y el importe de cada cuota.",
      estado:
        "Parcial: la web muestra la simulación completa antes de solicitar, pero la tasa del sandbox es un porcentaje total y no una tasa anual efectiva, ni se informa costo financiero total.",
    },
    {
      norma: "Normativa del BCP sobre clasificación de activos, riesgos crediticios y previsiones",
      expectativa: "El otorgamiento requiere evaluar la capacidad de pago del deudor, y la cartera debe clasificarse según su atraso.",
      estado: "No implementado: cualquier solicitud se puede aprobar sin evaluación, y las cuotas no pasan a `vencida` por sí solas.",
    },
    {
      norma: "Ley 2339/03 y normativa del BCP sobre tasas máximas de interés (usura)",
      expectativa: "La tasa de interés pactada no puede superar el tope vigente publicado por el BCP.",
      estado: "No implementado: la API acepta cualquier tasa hasta 999,99 %.",
    },
    {
      norma: "Ley 1334/98 de Defensa del Consumidor (SEDECO), deber de información",
      expectativa: "El deudor debe poder consultar en todo momento su saldo y el estado de sus cuotas, y recibir constancia de cada pago.",
      estado: "Cubierto: la API devuelve saldo pendiente, cronograma y la cuota pagada con su fecha, y la web los muestra en el detalle.",
    },
    {
      norma: "Buenas prácticas de administración de créditos",
      expectativa: "El desembolso y el cobro de cuotas deben reflejarse como movimientos en la cuenta del cliente.",
      estado: "No implementado: aprobar no acredita la cuenta y pagar no la debita; el módulo no genera movimientos.",
    },
  ],

  brechas: [
    "No hay desembolso: aprobar un préstamo no acredita el dinero en la cuenta asociada ni registra ningún movimiento.",
    "Pagar una cuota no debita ninguna cuenta ni valida fondos: el pago es puramente registral.",
    "No existe endpoint para rechazar una solicitud: el estado `rechazado` está en el modelo pero ni la API ni los datos sembrados lo producen.",
    "El estado `vencida` de una cuota solo aparece en los datos sembrados: la API nunca lo asigna, y no hay interés por mora.",
    "Las cuotas se pueden pagar en cualquier orden; la pantalla web sí impone el orden.",
    "**Préstamo sembrado 2:** su saldo pendiente (11.500.000) es menor que la suma de sus 11 cuotas impagas (12.705.000). Al pagar cuotas, el saldo llega a cero y el préstamo pasa a `pagado` antes de la última cuota, y las cuotas restantes quedan `pendiente` sin poder pagarse.",
    "**Préstamo sembrado 3:** es a 24 meses pero solo tiene 4 cuotas cargadas, y su saldo pendiente (18.000.000) supera con creces a las cuotas impagas: nunca puede llegar a `pagado` por la API.",
    "La tasa es un porcentaje total aplicado una sola vez, no una tasa anual: el costo del préstamo no depende del plazo.",
    "`POST /prestamos` no valida que la cuenta pertenezca al titular, ni su estado ni su moneda, y no limita el monto ni la cantidad de préstamos por cliente.",
    "No hay pagos parciales, adelantos de capital ni cancelación anticipada con quita de intereses.",
    "Al dar de baja un préstamo, sus cuotas siguen en la base (no tienen baja lógica) pero dejan de poder consultarse.",
    "No existe control de titularidad ni de funciones: la misma credencial que solicita un préstamo puede aprobarlo y pagar sus cuotas.",
  ],
};
