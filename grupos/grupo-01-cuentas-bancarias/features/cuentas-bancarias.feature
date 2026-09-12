# language: es
@wip @grupo-01
Característica: Cuentas bancarias
  Como cliente del banco
  quiero consultar mis cuentas, saldos y movimientos
  para controlar el estado de mi dinero 

  # Quitar el tag @wip cuando los steps estén implementados en tests/bdd/steps.

  @happy-path
  Escenario: El cliente consulta el saldo de una cuenta activa
    Dado que el cliente tiene una cuenta activa
    Cuando consulta el detalle de esa cuenta
    Entonces el sistema devuelve el saldo y la moneda de la cuenta

  @negativo
  Escenario: Consulta de una cuenta inexistente
    Dado que el cliente está autenticado
    Cuando consulta una cuenta que no existe
    Entonces el sistema responde que la cuenta no fue encontrada

  @edge-case
  Escenario: Cuenta sin movimientos registrados
    Dado que el cliente tiene una cuenta recién creada
    Cuando consulta los movimientos de esa cuenta
    Entonces el sistema devuelve una lista vacía sin error

    Escenario: Apertura de Cuentas en Guaranies
    Dado que el cliente aun no tiene cuenta
    Cuando ingresa a la app y solicita una cuenta en guaranies
    Entonces el sistema le genera un numero de cuenta de caja de ahorro
