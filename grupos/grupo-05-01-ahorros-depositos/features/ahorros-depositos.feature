# language: es
@wip @grupo-05-01
Característica: Ahorros programados y depósitos a plazo
  Como cliente del banco
  quiero gestionar mis metas de ahorro y depósitos a plazo
  para conocer mis saldos, intereses y condiciones de cancelación

  # Fuente: Ahorros y Depósitos, requerimientos CIT del Grupo 5, v1.0, 10 de octubre de 2026.
  # @wip: faltan steps del grupo y fixtures aislados; estos casos aún no se ejecutan en CI.
  # Los casos API y web reflejan sus respectivas reglas, que no siempre coinciden.

  @RF-G5-01 @api
  Regla: Listar los planes de ahorro vigentes

    # criterio: El listado excluye las bajas y calcula lo que falta para cada meta.
    @positivo @smoke
    Escenario: Consultar los planes de ahorro
      Dado que estoy autorizado para consultar ahorros del curso 2
      Cuando consulto el listado de planes de ahorro
      Entonces la respuesta tiene código HTTP 200
      Y devuelve como máximo 100 planes ordenados por identificador ascendente
      Y todos los planes devueltos están vigentes
      Y el importe que falta para cada meta es la meta menos el saldo acumulado

    # criterio: Los filtros por titular y estado se aplican simultáneamente.
    @positivo
    Esquema del escenario: Filtrar los planes de un titular por estado
      Dado que existen planes de prueba para distintos titulares y estados
      Cuando consulto los planes de un titular con estado "<estado>"
      Entonces la respuesta tiene código HTTP 200
      Y cada plan devuelto pertenece al titular solicitado y tiene estado "<estado>"

      Ejemplos:
        | estado     |
        | activo     |
        | completado |
        | cancelado  |

    # criterio: Un estado no permitido se rechaza como error de validación.
    @negativo
    Escenario: Rechazar un estado de ahorro desconocido
      Dado que estoy autorizado para consultar ahorros del curso 2
      Cuando consulto los planes con estado "pausado"
      Entonces la respuesta tiene código HTTP 400
      Y el código de error es "VALIDATION_ERROR"

  @RF-G5-02 @api
  Regla: Crear un plan de ahorro sin debitar la cuenta

    # criterio: Un plan nuevo comienza activo, sin ahorro acumulado y sin debitar la cuenta.
    @positivo @db
    Escenario: Crear una meta de ahorro
      Dado que el cliente dispone de una cuenta de prueba existente
      Cuando crea un plan con meta 1000000 y aporte mensual 250000
      Entonces la respuesta tiene código HTTP 201
      Y el plan queda activo con saldo acumulado "0.00"
      Y el importe que falta para la meta es "1000000.00"
      Y el saldo persistido de la cuenta permanece sin cambios

    # criterio: Si no se informa tasa anual, el plan se guarda con tasa cero.
    @positivo
    Escenario: Crear un plan sin indicar tasa
      Dado que el cliente dispone de una cuenta de prueba existente
      Cuando crea un plan válido sin indicar la tasa anual
      Entonces la respuesta tiene código HTTP 201
      Y la tasa anual del plan es "0.00"

    # criterio: Datos obligatorios inválidos o una cuenta inexistente impiden crear el plan.
    @negativo @db
    Esquema del escenario: Rechazar datos inválidos de una nueva meta
      Dado que el resto de los datos del nuevo plan son válidos
      Cuando intenta crear el plan con "<condicion>"
      Entonces la respuesta tiene código HTTP 400
      Y el código de error es "VALIDATION_ERROR"
      Y no se persiste un nuevo plan de ahorro

      Ejemplos:
        | condicion                      |
        | cuenta de débito omitida       |
        | cuenta inexistente             |
        | meta igual a cero              |
        | aporte mensual negativo        |
        | nombre de meta vacío           |
        | tasa anual mayor que 999.99    |

  @RF-G5-03 @api
  Regla: Consultar el detalle de un plan vigente

    # criterio: La consulta conserva el identificador y muestra meta, saldo y faltante.
    @positivo @smoke
    Escenario: Consultar una meta existente
      Dado que existe un plan de ahorro de prueba vigente
      Cuando consulta el detalle de ese plan
      Entonces la respuesta tiene código HTTP 200
      Y el identificador coincide con el plan solicitado
      Y se muestran la meta, el aporte mensual, el saldo acumulado y el importe que falta

    # criterio: Los planes inexistentes o dados de baja no se pueden consultar.
    @negativo
    Esquema del escenario: Consultar un plan no disponible
      Dado que el plan solicitado está "<condicion>"
      Cuando consulta el detalle de ese plan
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"
      Y el mensaje es "Plan de ahorro no encontrado."

      Ejemplos:
        | condicion  |
        | inexistente |
        | dado de baja |

  @RF-G5-04 @api
  Regla: Modificar únicamente las condiciones de un plan activo

    # criterio: Reemplazar las condiciones recalcula el faltante y omitir la tasa la reinicia a cero.
    @positivo @db
    Escenario: Reemplazar las condiciones de una meta
      Dado que existe un plan activo con saldo acumulado 500000 y tasa anual 6.50
      Cuando reemplaza su nombre, meta y aporte mensual con meta 1500000 sin indicar tasa
      Entonces la respuesta tiene código HTTP 200
      Y el importe que falta para la meta es "1000000.00"
      Y la tasa anual del plan es "0.00"
      Y el saldo acumulado persistido sigue siendo "500000.00"

    # criterio: La nueva meta no puede quedar por debajo del saldo acumulado.
    @negativo @db
    Escenario: Rechazar una meta menor al ahorro acumulado
      Dado que existe un plan activo con saldo acumulado 500000
      Cuando intenta cambiar la meta a 400000
      Entonces la respuesta tiene código HTTP 409
      Y el código de error es "CONFLICT"
      Y el mensaje es "La meta no puede ser menor al saldo ya acumulado."
      Y las condiciones persistidas del plan permanecen sin cambios

    # criterio: Igualar la meta al saldo acumulado no completa el plan por sí solo.
    @edge-case
    Escenario: Igualar la meta al saldo ahorrado
      Dado que existe un plan activo con saldo acumulado 500000
      Cuando cambia la meta a 500000 con las demás condiciones válidas
      Entonces la respuesta tiene código HTTP 200
      Y el importe que falta para la meta es "0.00"
      Y el estado del plan sigue siendo "activo"

    # criterio: Los planes completados o cancelados no admiten modificaciones.
    @negativo
    Esquema del escenario: Rechazar la modificación de un plan no activo
      Dado que existe un plan de prueba en estado "<estado>"
      Cuando intenta modificar sus condiciones con datos válidos
      Entonces la respuesta tiene código HTTP 409
      Y el código de error es "CONFLICT"

      Ejemplos:
        | estado     |
        | completado |
        | cancelado  |

  @RF-G5-05 @api
  Regla: La baja de un ahorro es lógica y no devuelve el dinero

    # criterio: La baja quita el plan de los recursos vigentes sin cambiar su estado de negocio.
    @positivo @db
    Escenario: Dar de baja un plan sin aportes
      Dado que existe un plan activo de prueba sin aportes
      Cuando solicita dar de baja ese plan
      Entonces la respuesta tiene código HTTP 204 y no contiene cuerpo
      Y el plan queda persistido como no vigente y con estado de negocio "activo"
      Y el plan deja de aparecer en los listados y en la consulta de detalle

    # criterio: La API admite dar de baja un plan con saldo sin reintegrarlo a la cuenta.
    @edge-case @db @fixture-aislado
    Escenario: Dar de baja por API un plan con saldo acumulado
      Dado que existe un plan aislado con dinero acumulado y su cuenta de prueba
      Cuando solicita dar de baja ese plan por API
      Entonces la respuesta tiene código HTTP 204 y no contiene cuerpo
      Y el saldo de la cuenta permanece sin cambios
      Y el dinero acumulado no se reintegra a la cuenta

    # criterio: Una segunda baja de un plan ya eliminado devuelve no encontrado.
    @negativo
    Escenario: Rechazar otra baja del mismo plan
      Dado que el plan de prueba ya fue dado de baja
      Cuando vuelve a solicitar su baja
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"

  @RF-G5-06 @api
  Regla: Los aportes debitan la cuenta y acumulan ahorro de forma atómica

    # criterio: Sin monto explícito se aporta el importe mensual del plan.
    @positivo @db
    Escenario: Realizar el aporte mensual predeterminado
      Dado que existe un plan activo sin aportes con meta 1000000 y aporte mensual 250000
      Y la cuenta de prueba asociada tiene saldo 1000000
      Cuando aporta al plan sin indicar un monto
      Entonces la respuesta tiene código HTTP 201
      Y el saldo acumulado del plan es "250000.00"
      Y el saldo persistido de la cuenta es "750000.00"
      Y se registra un movimiento de débito por 250000 asociado al ahorro

    # criterio: Un monto explícito prevalece sobre el aporte mensual.
    @positivo @db
    Escenario: Realizar un aporte de importe diferente al mensual
      Dado que existe un plan activo con aporte mensual 250000 y una cuenta con saldo suficiente
      Cuando aporta 100000 a ese plan
      Entonces la respuesta tiene código HTTP 201
      Y el saldo acumulado aumenta exactamente 100000
      Y la cuenta se debita exactamente 100000

    # criterio: Alcanzar la meta cambia el estado del plan a completado.
    @positivo @edge-case
    Escenario: Completar una meta con el aporte exacto pendiente
      Dado que existe un plan activo con meta 1000000 y saldo acumulado 750000
      Y la cuenta de prueba tiene saldo suficiente
      Cuando aporta 250000 al plan
      Entonces la respuesta tiene código HTTP 201
      Y el estado del plan es "completado"
      Y el importe que falta para la meta es "0.00"

    # criterio: El excedente se conserva y el faltante puede ser negativo.
    @edge-case
    Escenario: Superar la meta con un aporte
      Dado que a un plan activo le faltan 100000 para alcanzar la meta
      Y la cuenta de prueba tiene saldo suficiente
      Cuando aporta 300000 al plan
      Entonces la respuesta tiene código HTTP 201
      Y el estado del plan es "completado"
      Y el importe que falta para la meta es "-200000.00"
      Y el aporte no se recorta al importe pendiente

    # criterio: Los montos de aporte deben ser números mayores que cero.
    @negativo
    Esquema del escenario: Rechazar un aporte no positivo
      Dado que existe un plan activo de prueba
      Cuando intenta aportar <monto> al plan
      Entonces la respuesta tiene código HTTP 400
      Y el código de error es "VALIDATION_ERROR"

      Ejemplos:
        | monto |
        | 0     |
        | -1    |

    # criterio: Un conflicto no modifica el plan ni el saldo de la cuenta.
    @negativo @db
    Esquema del escenario: Rechazar un aporte sin condiciones de débito
      Dado que el plan o su cuenta de prueba presentan "<condicion>"
      Cuando intenta realizar un aporte positivo
      Entonces la respuesta tiene código HTTP 409
      Y el código de error es "CONFLICT"
      Y el saldo de la cuenta y el saldo acumulado del plan permanecen sin cambios

      Ejemplos:
        | condicion                       |
        | plan completado                 |
        | plan cancelado                  |
        | cuenta bloqueada                |
        | saldo insuficiente en la cuenta |

    # criterio: Una cuenta asociada dada de baja impide aportar.
    @negativo @fixture-aislado
    Escenario: Aportar a un plan cuya cuenta fue dada de baja
      Dado que existe un plan activo aislado cuya cuenta asociada fue dada de baja
      Cuando intenta realizar un aporte positivo
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"
      Y el mensaje es "Cuenta asociada al plan no encontrada."

  @RF-G5-07 @api
  Regla: Los depósitos se listan según su titular y estado guardado

    # criterio: El listado incluye proyección de interés y días restantes.
    @positivo @smoke
    Escenario: Consultar el listado de depósitos
      Dado que estoy autorizado para consultar depósitos del curso 2
      Cuando consulta el listado de depósitos
      Entonces la respuesta tiene código HTTP 200
      Y devuelve como máximo 100 depósitos ordenados por identificador ascendente
      Y cada depósito incluye el interés proyectado y los días restantes

    # criterio: El listado combina los filtros por titular y estado.
    @positivo
    Esquema del escenario: Consultar los depósitos de un titular por estado
      Dado que existen depósitos de prueba para distintos titulares y estados
      Cuando consulta los depósitos de un titular con estado "<estado>"
      Entonces la respuesta tiene código HTTP 200
      Y cada depósito devuelto pertenece al titular solicitado y tiene estado "<estado>"

      Ejemplos:
        | estado    |
        | activo    |
        | vencido   |
        | cancelado |

    # criterio: Un estado ajeno al catálogo de depósitos se rechaza.
    @negativo
    Escenario: Rechazar un filtro de depósito inválido
      Dado que estoy autorizado para consultar depósitos del curso 2
      Cuando consulta los depósitos con estado "renovado"
      Entonces la respuesta tiene código HTTP 400
      Y el código de error es "VALIDATION_ERROR"

    # criterio: El filtro de vencidos usa el estado persistido y no la fecha.
    @edge-case @fixture-fecha
    Escenario: Excluir de vencidos un depósito activo pasado de fecha
      Dado que existe un depósito activo de prueba cuya fecha de vencimiento ya pasó
      Cuando consulta los depósitos de su titular con estado "vencido"
      Entonces la respuesta tiene código HTTP 200
      Y ese depósito activo no aparece en el resultado

  @RF-G5-08 @api
  Regla: Constituir un depósito inmoviliza el capital y registra un débito

    # criterio: La constitución fija capital, tasa, plazo, fechas y proyección simple base 365.
    @positivo @db
    Escenario: Constituir un depósito con condiciones válidas
      Dado que la cuenta de prueba está activa y tiene saldo 5000000
      Cuando constituye por API un depósito de 2000000 al 10 por ciento durante 90 días
      Entonces la respuesta tiene código HTTP 201
      Y el depósito queda activo con interés generado "0.00"
      Y el interés proyectado es "49315.07" y los días restantes son 90
      Y la fecha de inicio es la del día y la de vencimiento es 90 días posterior
      Y ambas fechas tienen formato de año, mes y día
      Y el saldo persistido de la cuenta es "3000000.00"
      Y se registra un movimiento de débito por 2000000 asociado al depósito

    # criterio: La API no impone el mínimo de negocio de la pantalla web.
    @edge-case
    Escenario: Constituir por API un depósito de importe positivo pequeño
      Dado que existe una cuenta de prueba activa con saldo suficiente
      Cuando constituye por API un depósito de 1 al 10 por ciento durante 30 días
      Entonces la respuesta tiene código HTTP 201
      Y el depósito queda activo con capital "1.00"

    # criterio: La API acepta cualquier plazo entero entre 30 y 1095, incluidos ambos límites.
    @positivo @edge-case
    Esquema del escenario: Constituir con un plazo admitido por la API
      Dado que existe una cuenta de prueba activa con saldo suficiente
      Cuando constituye un depósito válido con plazo de <dias> días por API
      Entonces la respuesta tiene código HTTP 201
      Y el plazo del depósito es <dias> días

      Ejemplos:
        | dias |
        | 30   |
        | 31   |
        | 1095 |

    # criterio: La API rechaza importes, plazos, tasas y tipos numéricos inválidos.
    @negativo @db
    Esquema del escenario: Rechazar condiciones inválidas del depósito
      Dado que el resto de las condiciones del depósito son válidas
      Cuando intenta constituirlo por API con "<condicion>"
      Entonces la respuesta tiene código HTTP 400
      Y el código de error es "VALIDATION_ERROR"
      Y no se registra un depósito ni un débito en la cuenta

      Ejemplos:
        | condicion                      |
        | monto igual a cero             |
        | monto negativo                 |
        | plazo de 29 días               |
        | plazo de 1096 días             |
        | plazo con parte decimal        |
        | tasa anual negativa            |
        | tasa anual mayor que 999.99     |
        | monto enviado como texto       |
        | titular inexistente            |

    # criterio: Depositar exactamente el saldo disponible es válido.
    @positivo @edge-case @db
    Escenario: Constituir por el saldo total de la cuenta
      Dado que la cuenta de prueba está activa y tiene saldo 2000000
      Cuando constituye por API un depósito de 2000000 al 10 por ciento durante 90 días
      Entonces la respuesta tiene código HTTP 201
      Y el saldo persistido de la cuenta es "0.00"

    # criterio: Una tasa anual igual a cero es válida y no proyecta intereses.
    @edge-case
    Escenario: Constituir un depósito sin interés
      Dado que existe una cuenta de prueba activa con saldo suficiente
      Cuando constituye un depósito con tasa anual cero y las demás condiciones válidas
      Entonces la respuesta tiene código HTTP 201
      Y el interés proyectado es "0.00"

    # criterio: La falta de saldo rechaza la operación sin efectos parciales.
    @negativo @db
    Escenario: Constituir un depósito sin saldo suficiente
      Dado que la cuenta de prueba está activa y tiene saldo menor al capital solicitado
      Cuando intenta constituir un depósito a plazo por API
      Entonces la respuesta tiene código HTTP 409
      Y el código de error es "CONFLICT"
      Y el mensaje es "Saldo insuficiente para constituir el depósito."
      Y no se registra un depósito ni un débito en la cuenta

    # criterio: Una cuenta bloqueada no admite la constitución de depósitos.
    @negativo @db
    Escenario: Constituir desde una cuenta bloqueada
      Dado que la cuenta de prueba está bloqueada y tiene saldo suficiente
      Cuando intenta constituir un depósito a plazo por API
      Entonces la respuesta tiene código HTTP 409
      Y el código de error es "CONFLICT"
      Y no se registra un depósito ni un débito en la cuenta

    # criterio: La cuenta de débito debe existir y estar vigente.
    @negativo
    Escenario: Constituir desde una cuenta inexistente
      Dado que el titular existe y la cuenta solicitada no existe
      Cuando intenta constituir un depósito con las demás condiciones válidas
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"
      Y el mensaje es "Cuenta no encontrada."

  @RF-G5-09 @api
  Regla: Consultar un depósito no cambia su estado ni liquida intereses

    # criterio: El detalle conserva las condiciones de creación y los campos calculados.
    @positivo @smoke
    Escenario: El cliente consulta un depósito a plazo vigente
      Dado que el cliente tiene un depósito de prueba activo recién constituido
      Cuando consulta el detalle de ese depósito
      Entonces la respuesta tiene código HTTP 200
      Y devuelve el mismo identificador, capital, tasa, plazo y fechas de la constitución
      Y muestra el interés proyectado y los días restantes
      Y el interés generado sigue siendo "0.00"

    # criterio: Un identificador inexistente produce no encontrado.
    @negativo
    Escenario: Consultar un depósito inexistente
      Dado que el identificador solicitado no corresponde a ningún depósito
      Cuando consulta el detalle de ese depósito
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"
      Y el mensaje es "Depósito no encontrado."

    # criterio: La fecha vencida no produce transición ni acreditación automática.
    @edge-case @db @fixture-fecha
    Escenario: Consultar un depósito activo después de su fecha de vencimiento
      Dado que existe un depósito activo de prueba cuya fecha de vencimiento ya pasó
      Cuando consulta el detalle de ese depósito
      Entonces la respuesta tiene código HTTP 200
      Y el depósito sigue en estado "activo"
      Y los días restantes son negativos
      Y no se registra una acreditación automática de capital o intereses

    # criterio: La proyección corresponde al plazo completo incluso después de cancelar.
    @edge-case
    Escenario: Distinguir el interés proyectado del interés efectivamente pagado
      Dado que existe un depósito de prueba cancelado antes de completar su plazo
      Cuando consulta el detalle de ese depósito
      Entonces la respuesta tiene código HTTP 200
      Y el interés proyectado corresponde al plazo pactado completo
      Y el interés generado corresponde al importe pagado al cancelar

    # criterio: Las condiciones de un depósito no se modifican ni se eliminan.
    @negativo
    Esquema del escenario: Rechazar una operación no permitida sobre un depósito
      Dado que existe un depósito de prueba
      Cuando intenta "<operacion>" ese depósito
      Entonces la respuesta tiene código HTTP 405

      Ejemplos:
        | operacion                |
        | reemplazar sus condiciones |
        | eliminarlo               |

  @RF-G5-10 @api
  Regla: Cancelar un depósito activo acredita capital e interés proporcional una sola vez

    # criterio: Cancelar el día de constitución devuelve solo el capital.
    @positivo @db
    Escenario: Cancelar el depósito el mismo día de su constitución
      Dado que el cliente constituyó hoy un depósito de prueba por 2000000
      Cuando cancela ese depósito
      Entonces la respuesta tiene código HTTP 200
      Y el estado del depósito es "cancelado"
      Y los días transcurridos son 0 y el interés generado es "0.00"
      Y el saldo de la cuenta vuelve al valor anterior a la constitución
      Y se registra un movimiento de crédito por 2000000 asociado al depósito

    # criterio: El interés usa base 365 y días limitados entre cero y el plazo pactado.
    @positivo @edge-case @db @fixture-fecha
    Esquema del escenario: Cancelar con interés proporcional sin penalidad
      Dado que existe un depósito activo de prueba por 2000000 al 10 por ciento a 90 días
      Y su fecha de inicio equivale a <dias_reales> días antes del día de ejecución
      Cuando cancela ese depósito
      Entonces la respuesta tiene código HTTP 200
      Y se computan <dias_pagados> días transcurridos
      Y el interés generado es "<interes>"
      Y la cuenta recibe el capital más ese interés sin penalidad
      Y el depósito queda cancelado y registra el interés pagado

      Ejemplos:
        | dias_reales | dias_pagados | interes  |
        | -1          | 0            | 0.00     |
        | 10          | 10           | 5479.45  |
        | 120         | 90           | 49315.07 |

    # criterio: Cancelar requiere estado activo, aunque el depósito ya haya vencido por fecha.
    @negativo @db
    Esquema del escenario: Rechazar cancelación de un depósito no activo
      Dado que existe un depósito de prueba con estado guardado "<estado>"
      Cuando intenta cancelar ese depósito
      Entonces la respuesta tiene código HTTP 409
      Y el código de error es "CONFLICT"
      Y no se acredita dinero nuevamente en la cuenta

      Ejemplos:
        | estado    |
        | cancelado |
        | vencido   |

    # criterio: Cancelar un identificador inexistente devuelve no encontrado.
    @negativo
    Escenario: Cancelar un depósito inexistente
      Dado que el identificador solicitado no corresponde a ningún depósito
      Cuando intenta cancelar ese depósito
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"
      Y el mensaje es "Depósito no encontrado."

    # criterio: Si la cuenta fue dada de baja no se paga y el depósito sigue activo.
    @negativo @db @fixture-aislado
    Escenario: Cancelar un depósito cuya cuenta fue dada de baja
      Dado que existe un depósito activo aislado cuya cuenta asociada fue dada de baja
      Cuando intenta cancelar ese depósito
      Entonces la respuesta tiene código HTTP 404
      Y el código de error es "NOT_FOUND"
      Y el mensaje es "Cuenta asociada al depósito no encontrada."
      Y el depósito continúa activo sin acreditaciones

    # criterio: La cancelación permite acreditar una cuenta vigente bloqueada o cerrada.
    @edge-case @db @fixture-aislado
    Esquema del escenario: Acreditar la cancelación aunque la cuenta no admita débitos
      Dado que existe un depósito activo aislado cuya cuenta vigente está "<estado_cuenta>"
      Cuando cancela ese depósito
      Entonces la respuesta tiene código HTTP 200
      Y la cuenta recibe el capital más el interés proporcional
      Y el estado del depósito es "cancelado"

      Ejemplos:
        | estado_cuenta |
        | bloqueada     |
        | cerrada       |

  @RF-G5-TK @api @requiere-credenciales
  Regla: Las credenciales del grupo permiten obtener un token temporal

    # criterio: El token identifica al grupo 5 y puede autenticar las consultas del módulo.
    @positivo
    Escenario: Obtener un token válido del grupo
      Dado que la solicitud está autenticada para el curso 2
      Y se dispone de credenciales vigentes del grupo 5 desde el entorno
      Cuando solicita el token con esas credenciales
      Entonces la respuesta tiene código HTTP 200
      Y devuelve un token de tipo "Bearer" con vigencia de 3600 segundos
      Y identifica al grupo 5 y al curso 2
      Y ese token permite consultar el módulo sin enviar una API key

    # criterio: La respuesta no revela si falló el usuario, la contraseña o su activación.
    @negativo
    Esquema del escenario: Rechazar una combinación de credenciales inválida
      Dado que la solicitud está autenticada para el curso 2
      Cuando solicita un token con "<condicion>"
      Entonces la respuesta tiene código HTTP 400
      Y el código de error es "VALIDATION_ERROR"
      Y el mensaje es "Usuario o password inválidos."

      Ejemplos:
        | condicion               |
        | usuario inexistente     |
        | contraseña incorrecta   |
        | credencial inactiva     |

    # criterio: Credenciales válidas de otro grupo no sirven para esta ruta de emisión.
    @negativo
    Escenario: Rechazar la emisión con credenciales de otro grupo
      Dado que la solicitud está autenticada para el curso 2
      Y se dispone de credenciales válidas de prueba del grupo 1 desde el entorno
      Cuando solicita con ellas el token del grupo 5
      Entonces la respuesta tiene código HTTP 403
      Y el código de error es "FORBIDDEN"

  @transversal @api
  Regla: El acceso al módulo requiere autenticación del curso 2

    # criterio: Sin credencial de acceso la consulta se rechaza.
    @negativo
    Escenario: Consultar depósitos sin autenticación
      Dado que la solicitud no incluye API key ni token
      Cuando consulta el listado de depósitos
      Entonces la respuesta tiene código HTTP 401
      Y el código de error es "UNAUTHORIZED"

    # criterio: Un token alterado o vencido no autentica la solicitud.
    @negativo
    Esquema del escenario: Consultar depósitos con token no válido
      Dado que la solicitud usa un token "<condicion>" sin API key
      Cuando consulta el listado de depósitos
      Entonces la respuesta tiene código HTTP 401
      Y el código de error es "UNAUTHORIZED"

      Ejemplos:
        | condicion |
        | alterado  |
        | vencido   |

  @reglas-web @web
  Regla: La pantalla aplica condiciones adicionales a las de la API

    # criterio: La web solo ofrece cuentas activas del titular en guaraníes.
    @positivo
    Escenario: Seleccionar una cuenta de débito en la pantalla
      Dado que el cliente inició sesión y está en el formulario de ahorro o depósito
      Cuando selecciona el titular de la operación
      Entonces las opciones de cuenta contienen únicamente cuentas activas en guaraníes de ese titular

    # criterio: El mínimo de depósito de la UI es de 1000000 guaraníes.
    @negativo @RF-G5-08
    Escenario: Rechazar en la web un depósito por debajo del mínimo
      Dado que el cliente está en el formulario de depósito con una cuenta elegible y saldo suficiente
      Cuando intenta constituir un depósito de 999999 guaraníes
      Entonces el formulario informa que no alcanza el mínimo de 1000000 guaraníes
      Y no envía la solicitud de constitución a la API

    # criterio: El límite mínimo de la web es aceptado con las demás condiciones válidas.
    @positivo @edge-case @RF-G5-08
    Escenario: Constituir en la web un depósito por el importe mínimo
      Dado que el cliente está en el formulario de depósito con una cuenta elegible y saldo suficiente
      Cuando confirma un depósito de 1000000 guaraníes con plazo y tasa válidos
      Entonces la pantalla muestra el depósito creado con las condiciones elegidas

    # criterio: La web ofrece un catálogo cerrado de plazos, aunque la API acepte valores intermedios.
    @positivo @RF-G5-08
    Escenario: Consultar los plazos ofrecidos en la pantalla
      Dado que el cliente está en el formulario de constitución de un depósito
      Cuando consulta las opciones de plazo
      Entonces los plazos ofrecidos son 30, 60, 90, 180, 365, 730 y 1095 días

    # criterio: La sugerencia de tasa depende del plazo y puede editarse.
    @positivo @RF-G5-08
    Esquema del escenario: Consultar la tasa sugerida para el plazo elegido
      Dado que el cliente está en el formulario de constitución de un depósito
      Cuando selecciona el plazo de <dias> días
      Entonces la pantalla sugiere una tasa anual de <tasa> por ciento
      Y permite al cliente editar esa tasa

      Ejemplos:
        | dias | tasa |
        | 30   | 3.5  |
        | 1095 | 8    |

    # criterio: La UI impone mínimo de meta, relación aporte-meta, duración y longitud del nombre.
    @negativo @RF-G5-02
    Esquema del escenario: Rechazar condiciones de ahorro inválidas para la web
      Dado que el cliente está en el formulario de ahorro con los demás datos válidos
      Cuando intenta crear una meta con "<condicion>"
      Entonces la pantalla informa el incumplimiento de esa condición
      Y no envía la solicitud de creación a la API

      Ejemplos:
        | condicion                           |
        | meta inferior a 100000 guaraníes     |
        | aporte mensual mayor que la meta    |
        | plazo proyectado mayor a 120 meses  |
        | nombre con menos de 3 caracteres    |
        | nombre con más de 40 caracteres     |

    # criterio: La web impide eliminar un ahorro activo con saldo, aunque la API permita la baja.
    @negativo @RF-G5-05
    Escenario: Impedir en la web la eliminación de un plan con dinero
      Dado que el cliente consulta un plan activo de prueba con saldo acumulado
      Cuando intenta eliminar ese plan desde la pantalla
      Entonces la pantalla impide la eliminación del plan con saldo

    # criterio: La web detecta importes mayores al saldo antes de enviarlos al servidor.
    @negativo @RF-G5-06 @RF-G5-08
    Esquema del escenario: Evitar una operación por encima del saldo desde la web
      Dado que el cliente tiene una cuenta elegible con saldo menor al importe solicitado
      Cuando intenta realizar "<operacion>" desde el formulario
      Entonces la pantalla informa que el saldo es insuficiente
      Y no envía la operación a la API

      Ejemplos:
        | operacion               |
        | un aporte al ahorro     |
        | la constitución de un depósito |
