# language: es
@grupo-03 @web
Característica: Préstamos
  Como cliente del banco
  quiero consultar mis préstamos y sus cuotas
  para saber cuánto debo y cuándo vence

  @happy-path @smoke
  # criterio: un préstamo aprobado muestra su saldo pendiente y la próxima cuota por pagar.
  Escenario: Un usuario autorizado consulta el saldo de un préstamo vigente
    Dado que el administrador está autenticado en la sandbox
    Y que el préstamo vigente 2 está disponible
    Cuando consulta el detalle del préstamo 2
    Entonces el préstamo está aprobado
    Y muestra el saldo pendiente "PYG 6.880.000,00"
    Y muestra la próxima cuota pendiente

  # bloqueo: no hay un segundo usuario autenticable documentado ni un préstamo
  # ajeno con fixture en la UI; con solo admin@aiquaa.com no se puede reproducir.
  @wip @negativo
  Escenario: Consulta de un préstamo de otro cliente
    Dado que el cliente está autenticado
    Cuando consulta un préstamo que no le pertenece
    Entonces el sistema rechaza la consulta

  # bloqueo: el fixture documentado (préstamo 6) no existe en la UI de la sandbox.
  # Además el estado esperado "cancelado" no coincide con el modelo, que usa "pagado".
  @wip @edge-case
  Escenario: Préstamo con todas las cuotas pagadas
    Dado que el cliente tiene un préstamo con todas sus cuotas pagadas
    Cuando consulta el detalle de ese préstamo
    Entonces el saldo pendiente es cero y el estado es cancelado

  # bloqueo: la UI no expone un estado de mora ni hay un fixture verificable de
  # cuotas vencidas; ese fixture existe en la API, no en la web.
  @wip @negativo
  Escenario: Consulta de un préstamo con cuotas vencidas sin pagar
    Dado que el cliente tiene un préstamo con al menos una cuota vencida y sin pagar
    Cuando consulta el detalle de ese préstamo
    Entonces el sistema indica que el préstamo está en mora
    Y muestra el monto total adeudado incluyendo las cuotas vencidas

  # bloqueo: requiere una cuenta aislada sin fondos; pagar en la sandbox
  # compartida mutaría datos y la regla prohíbe pagos sin fixture aislado.
  @wip @negativo
  Escenario:  Intento de pago de cuota con fondos insuficientes
    Dado que el cliente quiere pagar una cuota de su prestamo
    Cuando consulta al préstamo correspondiente a pagar
    Entonces el sistema rechaza el pago debido a fondos insuficientes

  # bloqueo: la UI actual solo permite pagar la siguiente cuota; no ofrece
  # selección múltiple de cuotas consecutivas.
  @wip @happy-path
  Escenario: El cliente selecciona múltiples cuotas para pagar
    Dado que el cliente tiene un préstamo vigente con al menos dos cuotas pendientes
    Cuando consulta el detalle y selecciona más de una cuota consecutiva a pagar
    Entonces el sistema calcula y devuelve la sumatoria exacta del monto de las cuotas seleccionadas
