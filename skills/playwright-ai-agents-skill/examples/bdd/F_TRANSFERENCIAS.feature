# F_TRANSFERENCIAS.feature
# Salida del Planner en modo BDD (/pw-ia:plan --bdd) — escenarios de PLAN_TRANSFERENCIAS.md.
# Lenguaje de negocio: sin selectores, sin URLs, sin "hago click". Ese detalle vive en pages/.
# Esta capa es BLACKLIST del Healer: la IA nunca la modifica para hacer pasar un escenario.
# Keywords en inglés + texto en español, igual que bdd-skill.
# Generado por skill playwright-ai-agents · aiquaa.com

@transferencias @web
Feature: Transferencia entre cuentas propias
  Como cliente retail
  Quiero transferir dinero entre mis cuentas
  Para disponer del saldo donde lo necesito

  Background:
    Given que soy un cliente retail con sesión iniciada

  # criterio: HU-231 CA1 — una transferencia con saldo suficiente se confirma
  @TRF-01 @smoke
  Scenario: Transferencia exitosa entre cuentas propias
    Given que la cuenta "CA_GS" tiene un saldo disponible de 1000000
    When transfiero 500000 de "CA_GS" a "CC_GS"
    Then veo la confirmación de la transferencia

  # criterio: HU-231 CA2 — el saldo de origen se descuenta exactamente por el monto
  @TRF-02 @ledger
  Scenario: El saldo de origen se descuenta por el monto transferido
    Given que la cuenta "CA_GS" tiene un saldo disponible de 1000000
    When transfiero 500000 de "CA_GS" a "CC_GS"
    Then el saldo disponible de "CA_GS" es 500000

  # criterio: HU-231 CA3 — sin saldo suficiente la transferencia se rechaza y el saldo no cambia
  @TRF-03 @negativo
  Scenario Outline: Transferencia rechazada por saldo insuficiente
    Given que la cuenta "CA_GS" tiene un saldo disponible de <saldo>
    When transfiero <monto> de "CA_GS" a "CC_GS"
    Then veo el rechazo "Saldo insuficiente"
    And el saldo disponible de "CA_GS" es <saldo>

    Examples:
      | saldo  | monto  |
      | 100000 | 100001 |
      | 0      | 1      |
