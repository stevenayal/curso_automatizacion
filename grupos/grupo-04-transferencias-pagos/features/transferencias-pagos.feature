# language: es
@wip @grupo-04
Característica: Transferencias y pagos
  Como cliente del banco
  quiero transferir dinero y pagar facturas
  para cumplir con mis obligaciones

  # Quitar el tag @wip cuando los steps estén implementados en tests/bdd/steps.

  @happy-path
  Escenario: Transferencia entre cuentas propias
    Dado que el cliente tiene dos cuentas activas con saldo suficiente
    Cuando transfiere un importe válido de una cuenta a la otra
    Entonces la transferencia queda registrada en estado exitoso

  @negativo
  Escenario: Transferencia con la misma cuenta de origen y destino
    Dado que el cliente tiene una cuenta activa
    Cuando intenta transferir a esa misma cuenta
    Entonces el sistema rechaza la operación y no registra la transferencia

  @edge-case
  Escenario: Pago de una factura ya pagada
    Dado que existe una factura en estado pagada
    Cuando el cliente intenta pagarla de nuevo
    Entonces el sistema rechaza el pago y no se duplica el registro

  @happy-path
  Escenario: Pago exitoso de una factura pendiente
    Dado que el cliente tiene una factura pendiente y saldo suficiente en su cuenta
    Cuando paga la factura por el monto total adeudado
    Entonces la factura pasa a estado pagada y se descuenta el monto de la cuenta

  @negativo
  Escenario: Transferencia con saldo insuficiente
    Dado que el cliente tiene una cuenta activa con saldo insuficiente
    Cuando intenta transferir un importe mayor al saldo disponible
    Entonces el sistema rechaza la operación y no registra la transferencia

  @negativo
  Escenario: Transferencia a una cuenta destino inexistente
    Dado que el cliente tiene una cuenta activa con saldo suficiente
    Cuando intenta transferir a un número de cuenta que no existe
    Entonces el sistema rechaza la operación y no registra la transferencia