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
  Escenario: El cliente consulta el límite disponible de una tarjeta
    Dado que el cliente tiene una tarjeta activa con un límite disponible
    Cuando consulta el límite disponible de esa tarjeta
    Entonces el sistema muestra el límite disponible de la tarjeta

  @happy-path
  Escenario: El cliente solicita aumentar el límite de una tarjeta
    Dado que el cliente tiene una tarjeta activa con un límite establecido
    Cuando solicita aumentar el límite de esa tarjeta
    Entonces el sistema registra la solicitud de aumento de límite

  @negativo
  Escenario: El cliente intenta aumentar el límite de una tarjeta bloqueada
    Dado que el cliente tiene una tarjeta en estado bloqueada
    Cuando solicita aumentar el límite de esa tarjeta
    Entonces el sistema rechaza la solicitud de aumento de límite
