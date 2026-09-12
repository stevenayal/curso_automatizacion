# language: es
@wip @grupo-03
Característica: Préstamos
  Como cliente del banco
  quiero consultar y gestionar mis préstamos, cuotas y pagos
  para saber cuánto debo, cuándo vence y mantener al día mis obligaciones

  # Quitar el tag @wip cuando los steps estén implementados en tests/bdd/steps.


  @happy-path
  Escenario: El cliente consulta el saldo de un préstamo vigente
    Dado que el cliente tiene un préstamo vigente
    Cuando consulta el detalle de ese préstamo
    Entonces el sistema devuelve el saldo pendiente y la próxima cuota

  @negativo
  Escenario:  Intento de pago de cuota con fondos insuficientes
    Dado que el cliente quiere pagar una cuota de su prestamo
    Cuando consulta al préstamo correspondiente a pagar
    Entonces el sistema rechaza el pago debido a fondos insuficientes

  @edge-case
  Escenario: Préstamo con todas las cuotas pagadas
    Dado que el cliente tiene un préstamo con todas sus cuotas pagadas
    Cuando consulta el detalle de ese préstamo
    Entonces el saldo pendiente es cero y el estado es cancelado

  @negativo
  Escenario: Consulta de un préstamo con cuotas vencidas sin pagar
    Dado que el cliente tiene un préstamo con al menos una cuota vencida y sin pagar
    Cuando consulta el detalle de ese préstamo
    Entonces el sistema indica que el préstamo está en mora
    Y muestra el monto total adeudado incluyendo las cuotas vencidas


