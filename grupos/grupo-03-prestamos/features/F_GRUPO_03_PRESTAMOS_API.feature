# language: es
# Fuente: docs/requerimientos/grupo-03-prestamos.pdf (v1.0) → docs/M_GRUPO_03_PRESTAMOS.md
# Trazabilidad completa: grupos/grupo-03-prestamos/docs/BDD_TRAZABILIDAD.md
#
# Escenarios de API + base de datos. Cada escenario de escritura crea su propio préstamo:
# el sandbox es compartido y los préstamos sembrados 2 y 3 no cierran contablemente.
# Quedan en @wip hasta que la tarea de Cucumber implemente sus steps.
@grupo-03 @prestamos @api @wip
Característica: Ciclo de vida de un préstamo por API
  Como analista de crédito del banco
  quiero registrar, aprobar, cobrar y dar de baja préstamos
  para que el saldo pendiente y el plan de cuotas reflejen siempre lo que el cliente debe

  # ---------------------------------------------------------------- RF-G3-02 Solicitar
  # criterio: una solicitud válida nace en estado solicitado, sin saldo pendiente y sin cuotas
  @RF-G3-02 @positivo @db @smoke
  Escenario: Solicitar un préstamo válido
    Dado que existe un cliente propio de la prueba
    Cuando solicito un préstamo de 1200000 al 12 % en 6 meses
    Entonces la respuesta debe ser 201
    Y el préstamo queda en estado "solicitado" con saldo pendiente "0.00"
    Y el préstamo no tiene cuotas
    Y en la base de datos el préstamo existe con los datos enviados

  # criterio: los límites de plazo (1 y 120) y la tasa 0 son condiciones válidas
  @RF-G3-02 @positivo @edge-case
  Esquema del escenario: Aceptar condiciones en el límite permitido
    Dado que existe un cliente propio de la prueba
    Cuando solicito un préstamo de <monto> al <tasa> % en <plazo> meses
    Entonces la respuesta debe ser 201
    Y el préstamo queda en estado "solicitado" con saldo pendiente "0.00"

    Ejemplos:
      | caso           | monto   | tasa | plazo |
      | plazo mínimo   | 1000000 | 10   | 1     |
      | plazo máximo   | 1000000 | 10   | 120   |
      | tasa cero      | 1000000 | 0    | 12    |

  # criterio: monto no positivo, tasa fuera de 0..999,99 o plazo fuera de 1..120 se rechazan sin crear nada
  @RF-G3-02 @negativo @db
  Esquema del escenario: Rechazar una solicitud con condiciones fuera de rango
    Dado que existe un cliente propio de la prueba
    Cuando solicito un préstamo de <monto> al <tasa> % en <plazo> meses
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"
    Y en la base de datos el cliente no tiene préstamos

    Ejemplos:
      | caso                 | monto   | tasa | plazo |
      | plazo cero           | 1000000 | 10   | 0     |
      | plazo excedido       | 1000000 | 10   | 121   |
      | plazo no entero      | 1000000 | 10   | 6.5   |
      | monto cero           | 0       | 10   | 12    |
      | monto negativo       | -500    | 10   | 12    |
      | tasa negativa        | 1000000 | -1   | 12    |
      | tasa excedida        | 1000000 | 1000 | 12    |

  # criterio: no se puede solicitar un préstamo para un titular inexistente
  @RF-G3-02 @negativo
  Escenario: Rechazar una solicitud para un cliente inexistente
    Cuando solicito un préstamo de 1000000 al 10 % en 12 meses para el cliente 999999
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"

  # ---------------------------------------------------------------- RF-G3-06 Aprobar
  # criterio: aprobar fija el saldo en monto × (1 + tasa/100) y genera una cuota pendiente por mes
  @RF-G3-06 @positivo @db @smoke
  Escenario: Aprobar un préstamo genera el saldo y el plan de cuotas
    Dado que tengo un préstamo solicitado de 6000000 al 20 % en 6 meses
    Cuando apruebo el préstamo
    Entonces la respuesta debe ser 200
    Y el préstamo queda en estado "aprobado" con saldo pendiente "7200000.00"
    Y el plan tiene 6 cuotas de "1200000.00" numeradas desde 1
    Y todas las cuotas están en estado "pendiente" y sin fecha de pago
    Y en la base de datos el préstamo tiene 6 cuotas

  # criterio: la última cuota absorbe la diferencia de redondeo y la suma es exactamente el total
  @RF-G3-06 @positivo @edge-case
  Escenario: La última cuota absorbe el redondeo
    Dado que tengo un préstamo solicitado de 2000000 al 16 % en 3 meses
    Cuando apruebo el préstamo
    Entonces las cuotas son "773333.33", "773333.33" y "773333.34"
    Y la suma de las cuotas es exactamente "2320000.00"

  # criterio: la cuota N vence N meses después de la fecha de aprobación
  @RF-G3-06 @positivo
  Escenario: Las cuotas vencen mes a mes desde la aprobación
    Dado que tengo un préstamo solicitado de 3000000 al 10 % en 3 meses
    Cuando apruebo el préstamo
    Entonces la cuota 1 vence un mes después de la fecha de aprobación
    Y cada cuota siguiente vence un mes después de la anterior

  # criterio: con tasa 0 el saldo pendiente es igual al monto solicitado
  @RF-G3-06 @positivo @edge-case
  Escenario: Un préstamo sin interés devuelve solo el capital
    Dado que tengo un préstamo solicitado de 1200000 al 0 % en 12 meses
    Cuando apruebo el préstamo
    Entonces el préstamo queda en estado "aprobado" con saldo pendiente "1200000.00"

  # criterio: aprobar dos veces no genera cuotas adicionales
  @RF-G3-06 @negativo @db
  Escenario: No se puede aprobar dos veces el mismo préstamo
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Cuando apruebo el préstamo
    Entonces la respuesta debe ser 409
    Y el error debe ser "CONFLICT"
    Y en la base de datos el préstamo tiene 6 cuotas

  # criterio: la aprobación no acredita el dinero en la cuenta asociada (brecha documentada)
  @RF-G3-06 @positivo @db @brecha
  Escenario: Aprobar no modifica el saldo de la cuenta asociada
    Dado que tengo un préstamo solicitado con cuenta de acreditación
    Y registro el saldo actual de esa cuenta
    Cuando apruebo el préstamo
    Entonces el saldo de la cuenta es el mismo que antes

  # criterio: aprobar un préstamo inexistente responde 404
  @RF-G3-06 @negativo
  Escenario: Aprobar un préstamo inexistente
    Cuando apruebo el préstamo 999999
    Entonces la respuesta debe ser 404
    Y el error debe ser "NOT_FOUND"

  # ---------------------------------------------------------------- RF-G3-08 Pagar cuota
  # criterio: pagar una cuota la marca pagada con fecha y descuenta su importe del saldo
  @RF-G3-08 @positivo @db @smoke
  Escenario: Pagar una cuota pendiente
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Cuando pago la cuota 1
    Entonces la respuesta debe ser 200
    Y la cuota 1 queda en estado "pagada" con fecha de pago
    Y el préstamo queda en estado "aprobado" con saldo pendiente "6000000.00"
    Y en la base de datos la cuota 1 está pagada

  # criterio: una cuota pagada no se puede volver a pagar y el saldo no cambia
  @RF-G3-08 @negativo @db
  Escenario: No se puede pagar dos veces la misma cuota
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Y ya pagué la cuota 1
    Cuando pago la cuota 1
    Entonces la respuesta debe ser 409
    Y el mensaje de error es "La cuota ya fue pagada."
    Y en la base de datos el saldo pendiente sigue siendo "6000000.00"

  # criterio: al pagar la última cuota el saldo llega a cero y el préstamo pasa a pagado
  @RF-G3-08 @positivo
  Escenario: Pagar todas las cuotas cancela el préstamo
    Dado que tengo un préstamo aprobado de 3000000 al 10 % en 3 meses
    Cuando pago las cuotas 1, 2 y 3
    Entonces el préstamo queda en estado "pagado" con saldo pendiente "0.00"

  # criterio: la API no impone orden de pago (la web sí; ver prestamos.feature)
  @RF-G3-08 @positivo @brecha
  Escenario: Pagar una cuota fuera de orden
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Cuando pago la cuota 3
    Entonces la respuesta debe ser 200
    Y la cuota 3 queda en estado "pagada" con fecha de pago

  # criterio: pagar una cuota que el préstamo no tiene responde 404
  @RF-G3-08 @negativo
  Escenario: Pagar una cuota inexistente
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Cuando pago la cuota 99
    Entonces la respuesta debe ser 404
    Y el mensaje de error es "Cuota no encontrada."

  # criterio: solo se pagan cuotas de préstamos aprobados
  @RF-G3-08 @negativo
  Esquema del escenario: Rechazar el pago si el préstamo no está aprobado
    Dado que tengo un préstamo <estado> de 3000000 al 10 % en 3 meses
    Cuando pago la cuota 1
    Entonces la respuesta debe ser 409
    Y el error debe ser "CONFLICT"

    Ejemplos:
      | estado     |
      | solicitado |
      | pagado     |

  # criterio: una cuota vencida se paga por su importe original, sin recargo por mora
  # Depende del dato sembrado (préstamo 4): si otro grupo ya la pagó, el escenario no aplica.
  @RF-G3-08 @positivo @datos-sembrados
  Escenario: Pagar una cuota vencida sin recargo
    Dado que el préstamo sembrado 4 tiene una cuota en estado "vencida"
    Cuando pago esa cuota
    Entonces la respuesta debe ser 200
    Y el saldo pendiente baja exactamente el monto de la cuota

  # ---------------------------------------------------------------- RF-G3-04 Modificar
  # criterio: un préstamo solicitado se puede modificar y el cambio se refleja al consultarlo
  @RF-G3-04 @positivo
  Escenario: Modificar el plazo de un préstamo solicitado
    Dado que tengo un préstamo solicitado de 6000000 al 20 % en 6 meses
    Cuando modifico sus condiciones a 6000000 al 20 % en 12 meses
    Entonces la respuesta debe ser 200
    Y al consultar el préstamo su plazo es 12 meses

  # criterio: si se modifica y luego se aprueba, el plan usa las condiciones nuevas
  @RF-G3-04 @positivo
  Escenario: Aprobar después de modificar usa las condiciones nuevas
    Dado que tengo un préstamo solicitado de 6000000 al 20 % en 6 meses
    Y modifico sus condiciones a 6000000 al 20 % en 12 meses
    Cuando apruebo el préstamo
    Entonces el plan tiene 12 cuotas de "600000.00" numeradas desde 1

  # criterio: un préstamo aprobado o pagado ya no se puede modificar
  @RF-G3-04 @negativo
  Esquema del escenario: Rechazar la modificación de un préstamo que no está en evaluación
    Dado que tengo un préstamo <estado> de 3000000 al 10 % en 3 meses
    Cuando modifico sus condiciones a 5000000 al 10 % en 3 meses
    Entonces la respuesta debe ser 409
    Y el error debe ser "CONFLICT"
    Y al consultar el préstamo su monto sigue siendo "3000000.00"

    Ejemplos:
      | estado   |
      | aprobado |
      | pagado   |

  # criterio: la modificación es un reemplazo: los tres campos son obligatorios
  @RF-G3-04 @negativo
  Escenario: Rechazar una modificación incompleta
    Dado que tengo un préstamo solicitado de 6000000 al 20 % en 6 meses
    Cuando modifico solo el monto a 7000000
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"

  # ---------------------------------------------------------------- RF-G3-05 Dar de baja
  # criterio: un préstamo solicitado se da de baja y deja de ser consultable
  @RF-G3-05 @positivo @db
  Escenario: Desistir de una solicitud
    Dado que tengo un préstamo solicitado de 1000000 al 10 % en 6 meses
    Cuando doy de baja el préstamo
    Entonces la respuesta debe ser 204
    Y al consultar el préstamo la respuesta es 404
    Y al consultar sus cuotas la respuesta es 404
    Y el préstamo no aparece en el listado
    Y en la base de datos el préstamo queda con activo en false

  # criterio: un préstamo con saldo pendiente no se puede dar de baja
  @RF-G3-05 @negativo
  Escenario: No se puede dar de baja un préstamo con saldo pendiente
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Cuando doy de baja el préstamo
    Entonces la respuesta debe ser 409
    Y el mensaje de error es "No se puede eliminar un préstamo con saldo pendiente."
    Y al consultar el préstamo la respuesta es 200

  # criterio: un préstamo cancelado por completo se puede dar de baja
  @RF-G3-05 @positivo
  Escenario: Dar de baja un préstamo pagado
    Dado que tengo un préstamo pagado de 3000000 al 10 % en 3 meses
    Cuando doy de baja el préstamo
    Entonces la respuesta debe ser 204

  # ---------------------------------------------------------------- RF-G3-01 / 03 / 07 Consultas
  # criterio: el filtro por estado solicitado devuelve solo préstamos sin saldo
  @RF-G3-01 @positivo
  Escenario: Listar los préstamos en evaluación
    Cuando listo los préstamos con estado "solicitado"
    Entonces la respuesta debe ser 200
    Y todos los préstamos devueltos están en estado "solicitado" con saldo pendiente "0.00"

  # criterio: el filtro por titular devuelve solo préstamos de ese cliente
  @RF-G3-01 @positivo
  Escenario: Listar los préstamos de un cliente
    Dado que tengo un préstamo solicitado de 1000000 al 10 % en 6 meses
    Cuando listo los préstamos de ese cliente
    Entonces la respuesta debe ser 200
    Y todos los préstamos devueltos pertenecen a ese cliente

  # criterio: un estado inexistente se rechaza; rechazado es válido pero nunca se produce
  @RF-G3-01 @negativo
  Esquema del escenario: Filtrar el listado por estado
    Cuando listo los préstamos con estado "<estado>"
    Entonces la respuesta debe ser <status>

    Ejemplos:
      | estado    | status |
      | vigente   | 400    |
      | rechazado | 200    |

  # criterio: consultar un préstamo inexistente o con id no numérico se rechaza
  @RF-G3-03 @negativo
  Esquema del escenario: Consultar un préstamo con identificador inválido
    Cuando consulto el préstamo "<id>"
    Entonces la respuesta debe ser <status>
    Y el error debe ser "<error>"

    Ejemplos:
      | id     | status | error            |
      | 999999 | 404    | NOT_FOUND        |
      | abc    | 400    | VALIDATION_ERROR |

  # criterio: el filtro de cuotas por estado separa las pagadas de las pendientes
  @RF-G3-07 @positivo
  Escenario: Filtrar el cronograma después de un pago
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Y ya pagué la cuota 1
    Cuando consulto las cuotas con estado "pagada"
    Entonces se devuelve solo la cuota 1
    Y al consultar las cuotas con estado "pendiente" se devuelven las cuotas 2 a 6

  # criterio: un estado de cuota inexistente se rechaza
  @RF-G3-07 @negativo
  Escenario: Filtrar cuotas con un estado inválido
    Dado que tengo un préstamo aprobado de 6000000 al 20 % en 6 meses
    Cuando consulto las cuotas con estado "anulada"
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"
