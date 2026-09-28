# language: es
@wip @grupo-02
Característica: Tarjetas de crédito y débito
  Como cliente del banco
  quiero gestionar mis tarjetas y sus límites
  para operar de forma segura

  # Quitar el tag @wip cuando los steps estén implementados en tests/bdd/steps.

  @happy-path
  Escenario: El cliente bloquea una tarjeta activa
    Dado que el cliente tiene una tarjeta en estado activa
    Cuando solicita el bloqueo de esa tarjeta
    Entonces la tarjeta queda en estado bloqueada

  @negativo
  Escenario: Bloqueo de una tarjeta ya bloqueada
    Dado que el cliente tiene una tarjeta en estado bloqueada
    Cuando solicita nuevamente el bloqueo de esa tarjeta
    Entonces el sistema rechaza la operación y el estado no cambia

  @edge-case
  Escenario: Consulta de una tarjeta vencida
    Dado que el cliente tiene una tarjeta con fecha de vencimiento pasada
    Cuando consulta el disponible de esa tarjeta
    Entonces el sistema indica que la tarjeta está vencida


  @happy-path
  Escenario: Modificación exitosa del límite de compra de una tarjeta
    Dado que el cliente tiene una tarjeta activa con un límite de compra actual
    Cuando solicita aumentar el límite de compra a un monto permitido
    Entonces el sistema actualiza el límite de la tarjeta correctamente

  @negativo
  Escenario: Compra rechazada por superar el límite disponible
    Dado que el cliente tiene una tarjeta activa con un límite disponible determinado
    Cuando intenta realizar una compra por un monto superior al límite disponible
    Entonces el sistema rechaza la transacción por fondos insuficientes
  @happy-path
  Escenario: Reimpresión de Tarjeta
    Dado que el cliente tiene una tarjeta en estado activo y esta se extravía o sufre deterioro
    Cuando solicita la reimpresión de la tarjeta
    Entonces el sistema emite la nueva tarjeta y registra la reimpresión en el historial de la tarjeta
