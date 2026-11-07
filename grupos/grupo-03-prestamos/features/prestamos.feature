# language: es
# Fuente: docs/requerimientos/grupo-03-prestamos.pdf, sección 6 (flujo web y reglas de UI).
# Los escenarios de API + base de datos están en F_GRUPO_03_PRESTAMOS_API.feature.
# Trazabilidad y escenarios descartados: grupos/grupo-03-prestamos/docs/BDD_TRAZABILIDAD.md
@grupo-03 @web
Característica: Préstamos en la aplicación web
  Como cliente del banco
  quiero simular, solicitar y seguir mis préstamos desde la web
  para saber cuánto debo, cuánto pago por cuota y cuándo vence

  @happy-path @smoke
  # criterio: un préstamo aprobado muestra su saldo pendiente y la próxima cuota por pagar.
  # datos: préstamo 2 del seed (Cliente #2, estado Aprobado, saldo PYG 6.880.000,00,
  # 5 de 12 cuotas pagadas; la próxima pendiente es la cuota 6).
  Escenario: Un usuario autorizado consulta el saldo de un préstamo vigente
    Dado que el administrador está autenticado en la sandbox
    Y que el préstamo vigente 2 está disponible
    Cuando consulta el detalle del préstamo 2
    Entonces el préstamo está aprobado
    Y muestra el saldo pendiente "PYG 6.880.000,00"
    Y muestra la próxima cuota pendiente

  # criterio: un préstamo cancelado muestra saldo cero y estado pagado
  @wip @RF-G3-03 @edge-case @datos-sembrados
  Escenario: Ver el detalle de un préstamo totalmente pagado
    Dado que el administrador está autenticado en la sandbox
    Cuando consulta el detalle del préstamo 6
    Entonces el préstamo está en estado "pagado"
    Y muestra el saldo pendiente "PYG 0,00"
    Y el avance de pago es 100 %

  # criterio: la simulación muestra el cronograma antes de solicitar y coincide con el que genera la aprobación
  @wip @RF-G3-02 @RF-G3-06 @happy-path
  Escenario: Simular un préstamo antes de solicitarlo
    Dado que el administrador está autenticado en la sandbox
    Y está en la pantalla de nueva solicitud de préstamo
    Cuando simula un préstamo de 6.000.000 al 20 % en 6 meses
    Entonces ve un cronograma proyectado de 6 cuotas de "PYG 1.200.000,00"
    Y ve el total a devolver "PYG 7.200.000,00"

  # criterio: regla de UI — el monto debe estar entre 500.000 y 500.000.000 (la API acepta cualquier monto positivo)
  @wip @RF-G3-02 @negativo @regla-ui
  Esquema del escenario: La web rechaza montos fuera del rango permitido
    Dado que el administrador está autenticado en la sandbox
    Y está en la pantalla de nueva solicitud de préstamo
    Cuando ingresa un monto de <monto>
    Entonces ve un mensaje de validación sobre el monto
    Y no puede avanzar a la confirmación

    Ejemplos:
      | monto       |
      | 499999      |
      | 500000001   |

  # criterio: regla de UI — el plazo se elige de una lista fija (la API acepta de 1 a 120)
  @wip @RF-G3-02 @regla-ui
  Escenario: El plazo solo se elige de la lista permitida
    Dado que el administrador está autenticado en la sandbox
    Y está en la pantalla de nueva solicitud de préstamo
    Cuando abre la lista de plazos
    Entonces solo puede elegir 6, 12, 18, 24, 36, 48 o 60 meses

  # criterio: regla de UI — la cuenta de acreditación y la aceptación de condiciones son obligatorias
  @wip @RF-G3-02 @negativo @regla-ui
  Escenario: No se puede confirmar sin cuenta ni aceptación de condiciones
    Dado que el administrador está autenticado en la sandbox
    Y está en la pantalla de nueva solicitud de préstamo
    Cuando completa la simulación sin elegir una cuenta de acreditación
    Entonces no puede confirmar la solicitud
    Y al elegir la cuenta tampoco puede confirmar sin aceptar las condiciones

  # criterio: regla de UI — solo se puede pagar la próxima cuota impaga, en orden (la API acepta cualquier orden)
  @wip @RF-G3-08 @regla-ui
  Escenario: La web solo permite pagar la próxima cuota
    Dado que el administrador está autenticado en la sandbox
    Y tiene un préstamo aprobado propio con 3 cuotas pendientes
    Cuando abre el detalle del préstamo
    Entonces solo la cuota 1 tiene la acción de pago habilitada
    Y al pagarla, la acción de pago pasa a la cuota 2

  # criterio: mientras está solicitado se puede desistir; con saldo pendiente la baja queda deshabilitada
  @wip @RF-G3-05 @regla-ui
  Escenario: Desistir de una solicitud desde el detalle
    Dado que el administrador está autenticado en la sandbox
    Y tiene un préstamo solicitado propio
    Cuando abre el detalle del préstamo
    Entonces ve la acción "Desistir de la solicitud" habilitada
    Y después de aprobarlo la acción de baja queda deshabilitada
