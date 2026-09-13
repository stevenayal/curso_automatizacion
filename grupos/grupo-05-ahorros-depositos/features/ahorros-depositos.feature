# language: es
@wip @grupo-05
Característica: Ahorros y depósitos
  Como cliente del banco
  quiero gestionar mis depósitos a plazo
  para conocer tasas, plazos y vencimientos

  # Quitar el tag @wip cuando los steps estén implementados en tests/bdd/steps.

  @happy-path
  Escenario: El cliente consulta un depósito a plazo vigente
    Dado que el cliente tiene un depósito a plazo vigente
    Cuando consulta el detalle de ese depósito
    Entonces el sistema devuelve el capital, la tasa y la fecha de vencimiento

  @negativo
  Escenario: Depósito con importe menor al mínimo permitido
    Dado que el cliente tiene una cuenta de ahorro activa
    Cuando intenta constituir un depósito por debajo del importe mínimo
    Entonces el sistema rechaza la operación

  @edge-case
  Escenario: Depósito en su fecha de vencimiento
    Dado que el cliente tiene un depósito que vence hoy
    Cuando consulta el estado de ese depósito
    Entonces el sistema lo muestra como vencido y con los intereses acreditados

  @happy-path
  Escenario: Consultar las tasas disponibles para depósitos a plazo
    Dado que existen opciones de depósitos a plazo disponibles
    Cuando el cliente consulta las tasas vigentes
    Entonces el sistema muestra los importes, plazos y tasas de interés disponibles

  @happy-path
  Escenario: Consultas los intereses generados
    Dado que el cliente tenga al menos un depósito a plazo vigente
    Cuando el cliente consulte un respectivo plazo
    Entonces el sistema le mostrará los intereses generados
    
  @edge-case
  Escenario: Constituir un depósito con el importe mínimo permitido
    Dado que el cliente tiene saldo suficiente
    Cuando constituye un depósito por el importe mínimo permitido
    Entonces el sistema registra el depósito correctamente