# language: es
@grupo-05
Característica: Ahorros y depósitos
  Como cliente del banco
  quiero gestionar mis depósitos a plazo
  para conocer tasas, plazos y vencimientos

  # Fuente: docs/requerimientos/grupo-05-ahorros-depositos.pdf (RF-G5-07 a RF-G5-10, secciones 6 y 7).
  #
  # @web  -> se ejecuta por pantalla, sin modificar datos: toda escritura hacia la API se bloquea en el
  #          navegador (ver DepositosPage.signInAsAdmin). Los valores esperados salen del documento o
  #          de lo que muestra la propia pantalla.
  # @api  -> escenario de la API REST; corre con la API key del Curso 2 (API_KEY).
  # @fixture -> crea su propio cliente y cuenta (grupos/grupo-05-ahorros-depositos/fixtures/
  #          DepositosFixture.ts): los escenarios que constituyen o cancelan no tocan datos compartidos.
  # @wip  -> no se ejecuta; el motivo está en el comentario sobre cada escenario.

  # ── Escenarios ejecutables (@web) ──────────────────────────────────────────

  @happy-path @web @smoke
  Escenario: El cliente consulta el detalle de un depósito a plazo vigente
    Dado que el cliente tiene un depósito a plazo vigente
    Cuando consulta el detalle de ese depósito
    Entonces el sistema muestra el capital, la tasa y la fecha de vencimiento

  @happy-path @web
  Escenario: El detalle de un depósito vigente muestra su interés proyectado
    Dado que el cliente tiene un depósito a plazo vigente
    Cuando consulta el detalle de ese depósito
    Entonces el sistema muestra el interés proyectado del depósito

  @happy-path @web
  Escenario: El detalle de un depósito vigente ofrece la cancelación anticipada
    Dado que el cliente tiene un depósito a plazo vigente
    Cuando consulta el detalle de ese depósito
    Entonces el sistema ofrece cancelar anticipadamente el depósito

  # La API no vence depósitos: el vencimiento automático está fuera de alcance (sección 1) y el estado
  # «vencido» solo existe en datos sembrados. Hay depósitos «Activo» con fecha de vencimiento pasada y
  # días restantes negativos. Por eso no se puede armar un depósito «que vence hoy»; se verifica el
  # comportamiento real: un depósito ya vencido se muestra como Vencido, con su interés generado y
  # sin opción de cancelar.
  @edge-case @web
  Escenario: Un depósito vencido se muestra como vencido y sin cancelación disponible
    Dado que existe un depósito a plazo vencido
    Cuando consulta el detalle de ese depósito
    Entonces el sistema lo muestra como vencido y con su interés generado
    Y el sistema no ofrece cancelar anticipadamente el depósito

  @happy-path @web @smoke
  Escenario: Consultar las tasas disponibles para depósitos a plazo
    Dado que existen opciones de depósitos a plazo disponibles
    Cuando el cliente consulta las tasas vigentes
    Entonces el sistema muestra el importe mínimo y los plazos disponibles
    Y la tasa sugerida es 3.5 % a 30 días
    Y la tasa sugerida es 8 % a 1095 días

  @edge-case @web
  Escenario: El formulario solo ofrece los plazos del tarifario
    Dado que existen opciones de depósitos a plazo disponibles
    Cuando el cliente despliega la lista de plazos
    Entonces el sistema ofrece únicamente los plazos de 30, 60, 90, 180, 365, 730 y 1095 días

  # Los intereses valen para el plazo completo: monto × tasa / 100 × plazo / 365 (interés simple).
  @happy-path @web @smoke
  Esquema del escenario: La vista previa proyecta el interés del depósito
    Dado que el cliente elige una cuenta activa en el formulario de depósito
    Cuando ingresa un depósito de <monto> guaraníes a <plazo> días con tasa de <tasa> %
    Entonces la vista previa muestra un interés proyectado de "<interes>"

    Ejemplos:
      | monto   | plazo | tasa | interes   |
      | 5000000 | 180   | 11.5 | 283561.64 |
      | 2000000 | 90    | 10   | 49315.07  |

  # Regla de UI (sección 6): la pantalla exige un monto mínimo de 1.000.000 de guaraníes y rechaza en
  # el navegador, antes de llegar a la API. La API no tiene monto mínimo (ver el escenario @api más abajo).
  @negativo @web
  Escenario: Depósito con importe menor al mínimo permitido
    Dado que el cliente elige una cuenta activa en el formulario de depósito
    Cuando intenta constituir un depósito por debajo del importe mínimo
    Entonces el formulario rechaza la operación por no alcanzar el importe mínimo
    Y el depósito no es generado

  # Regla de UI (sección 6): un importe mayor al saldo de la cuenta se rechaza en el navegador.
  @negativo @web
  Escenario: Constituir un depósito sin saldo suficiente
    Dado que el cliente elige una cuenta activa en el formulario de depósito
    Y el importe del depósito supera el saldo que muestra la pantalla
    Cuando intenta constituir un depósito a plazo
    Entonces el formulario rechaza la operación por saldo insuficiente
    Y el depósito no es generado

  @negativo @web
  Escenario: Consulta de un depósito a plazo inexistente
    Dado que el cliente está autenticado
    Cuando consulta un depósito a plazo que no existe
    Entonces el sistema responde que el depósito no fue encontrado

  @happy-path @web
  Escenario: Filtrar los depósitos por estado vencido
    Dado que el cliente está autenticado
    Cuando filtra los depósitos por el estado "Vencido"
    Entonces todos los depósitos listados están en estado "Vencido"

  # ── Escrituras por pantalla sobre el cliente del fixture (@web @fixture) ───

  @edge-case @web @fixture
  Escenario: Constituir un depósito con el importe mínimo permitido
    Dado que el cliente tiene saldo suficiente
    Cuando constituye un depósito por el importe mínimo permitido
    Entonces el sistema registra el depósito correctamente

  # Constituido hoy: el interés prorrateado es 0 y se acredita exactamente el capital.
  @happy-path @web @fixture
  Escenario: Cancelar un depósito a plazo antes de su vencimiento
    Dado que el cliente tiene un depósito a plazo vigente propio
    Cuando cancela el depósito antes de la fecha de vencimiento
    Entonces el sistema procesa la cancelación anticipada
    Y acredita el capital más los intereses prorrateados en la cuenta del cliente

  @edge-case @web @fixture
  Escenario: Constituir un depósito por el total del saldo disponible
    Dado que el cliente tiene una cuenta de ahorro activa
    Y el saldo disponible es igual al importe del depósito
    Cuando constituye el depósito a plazo
    Entonces el sistema registra el depósito correctamente
    Y el saldo disponible de la cuenta queda en cero

  # ── API REST (@api: requiere API key del Curso 2) ──────────────────────────

  @happy-path @api @fixture
  Escenario: La API constituye un depósito y proyecta su interés
    Dado una cuenta activa con saldo 5000000
    Cuando constituye un depósito de 2000000 al 10 % de tasa anual por 90 días
    Entonces la API responde 201 con estado "activo"
    Y interes_proyectado es "49315.07"
    Y dias_restantes es 90
    Y el saldo de la cuenta es "3000000.00"

  @negativo @api @fixture
  Esquema del escenario: La API valida los límites del plazo
    Dado una cuenta activa con saldo suficiente
    Cuando constituye un depósito por <plazo> días
    Entonces la API responde <status>

    Ejemplos:
      | plazo | status                 |
      | 29    | 400 VALIDATION_ERROR   |
      | 30    | 201                    |
      | 1095  | 201                    |
      | 1096  | 400 VALIDATION_ERROR   |

  # Brecha frente a la pantalla: la API no tiene monto mínimo de negocio y acepta cualquier monto positivo.
  @edge-case @api @fixture
  Escenario: La API acepta un depósito por debajo del mínimo que exige la pantalla
    Dado una cuenta activa con saldo suficiente
    Cuando constituye un depósito por un monto positivo inferior a 1000000
    Entonces la API responde 201

  @negativo @api @fixture
  Escenario: La API rechaza un depósito sin saldo suficiente
    Dado una cuenta activa con saldo menor al importe del depósito
    Cuando intenta constituir por API un depósito a plazo
    Entonces la API responde 409 CONFLICT con el mensaje "Saldo insuficiente para constituir el depósito."
    Y el saldo de la cuenta no cambia

  @negativo @api @fixture
  Escenario: La API responde 404 al consultar un depósito inexistente
    Dado que el cliente usa la API del Curso 2
    Cuando consulta por API un depósito a plazo que no existe
    Entonces la API responde 404 NOT_FOUND con el mensaje "Depósito no encontrado."

  @negativo @api @fixture
  Escenario: La API no permite modificar ni dar de baja un depósito
    Dado un depósito existente
    Cuando envía PUT o DELETE sobre ese depósito
    Entonces la API responde 405

  @negativo @api @fixture
  Escenario: La API rechaza un estado de listado no permitido
    Dado que el cliente usa la API del Curso 2
    Cuando lista los depósitos con estado "renovado"
    Entonces la API responde 400 VALIDATION_ERROR

  # El interés proyectado es el del plazo completo, también si el depósito sembrado 1 ya fue cancelado.
  @happy-path @api @fixture
  Escenario: La API proyecta el interés del depósito sembrado 1
    Dado el depósito sembrado 1 de 5000000 al 11,5 % por 180 días
    Cuando consulta por API el detalle de ese depósito
    Entonces interes_proyectado es "283561.64"

  @happy-path @api @fixture
  Escenario: La API cancela un depósito constituido hoy sin interés
    Dado un depósito constituido hoy por 2000000
    Cuando cancela el depósito
    Entonces la API responde 200 con estado "cancelado"
    Y dias_transcurridos es 0
    Y interes_generado es "0.00"
    Y el saldo de la cuenta vuelve al valor previo a la constitución

  @negativo @api @fixture
  Escenario: La API rechaza cancelar un depósito que no está activo
    Dado un depósito en estado "vencido"
    Cuando cancela el depósito
    Entonces la API responde 409 CONFLICT
    Y la cuenta no vuelve a acreditarse
