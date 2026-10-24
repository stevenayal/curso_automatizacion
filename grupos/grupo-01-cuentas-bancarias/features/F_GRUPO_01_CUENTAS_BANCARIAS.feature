# language: es
@wip @grupo-01 @cuentas-bancarias
Característica: Gestión de cuentas bancarias
  Como usuario del módulo de cuentas bancarias
  quiero gestionar cuentas, saldos, estados y movimientos
  para validar el comportamiento definido por los requerimientos del Grupo 1

  @RF-G1-01 @positivo
  Escenario: Listar cuentas vigentes
    Dado que existen cuentas vigentes en el sistema
    Cuando consulto el listado de cuentas
    Entonces la respuesta debe ser 200
    Y los datos deben contener únicamente cuentas vigentes

  @RF-G1-01 @negativo
  Escenario: Rechazar un estado de filtro inválido
    Dado que estoy autorizado para consultar cuentas
    Cuando consulto las cuentas con estado "suspendida"
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"

  @RF-G1-02 @positivo
  Escenario: Abrir una cuenta de ahorro en guaraníes
    Dado que existe un usuario válido
    Cuando solicito abrir una cuenta de tipo "ahorro" en moneda "PYG"
    Entonces la respuesta debe ser 201
    Y la cuenta debe crearse con saldo "0.00"
    Y el estado debe ser "activa"
    Y el número de cuenta debe tener 10 dígitos

  @RF-G1-02 @negativo
  Escenario: Rechazar apertura con moneda no permitida
    Dado que existe un usuario válido
    Cuando solicito abrir una cuenta con moneda "EUR"
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"

  @RF-G1-03 @positivo
  Escenario: Consultar una cuenta existente
    Dado que existe una cuenta vigente
    Cuando consulto la cuenta por su identificador
    Entonces la respuesta debe ser 200
    Y el identificador devuelto debe coincidir con el solicitado

  @RF-G1-03 @negativo
  Escenario: Consultar una cuenta inexistente
    Cuando consulto una cuenta que no existe
    Entonces la respuesta debe ser 404
    Y el error debe ser "NOT_FOUND"

  @RF-G1-04 @positivo
  Escenario: Modificar tipo y moneda de una cuenta
    Dado que existe una cuenta vigente
    Cuando reemplazo su tipo de cuenta y moneda por valores válidos
    Entonces la respuesta debe ser 200
    Y los nuevos valores deben reflejarse al consultar nuevamente la cuenta

  @RF-G1-04 @negativo
  Escenario: Rechazar modificación incompleta
    Dado que existe una cuenta vigente
    Cuando intento modificarla enviando solo el tipo de cuenta
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"

  @RF-G1-05 @positivo
  Escenario: Dar de baja una cuenta con saldo cero
    Dado que existe una cuenta vigente con saldo cero
    Cuando solicito dar de baja la cuenta
    Entonces la respuesta debe ser 204
    Y la cuenta ya no debe aparecer en el listado de cuentas vigentes

  @RF-G1-05 @negativo
  Escenario: Rechazar baja de cuenta con saldo
    Dado que existe una cuenta vigente con saldo mayor que cero
    Cuando solicito dar de baja la cuenta
    Entonces la respuesta debe ser 409
    Y el error debe ser "CONFLICT"

  @RF-G1-06 @positivo
  Escenario: Bloquear una cuenta activa
    Dado que existe una cuenta en estado "activa"
    Cuando cambio su estado a "bloqueada"
    Entonces la respuesta debe ser 200
    Y el estado de la cuenta debe ser "bloqueada"

  @RF-G1-06 @negativo
  Escenario: Rechazar cierre de una cuenta con saldo
    Dado que existe una cuenta con saldo mayor que cero
    Cuando intento cambiar su estado a "cerrada"
    Entonces la respuesta debe ser 409
    Y el error debe ser "CONFLICT"

  @RF-G1-07 @positivo
  Escenario: Consultar saldo de una cuenta recién abierta
    Dado que existe una cuenta recién abierta sin movimientos
    Cuando consulto el saldo de la cuenta
    Entonces la respuesta debe ser 200
    Y el saldo debe ser "0.00"
    Y el último movimiento debe ser nulo

  @RF-G1-08 @positivo
  Escenario: Consultar movimientos de una cuenta sin movimientos
    Dado que existe una cuenta recién abierta
    Cuando consulto los movimientos de la cuenta
    Entonces la respuesta debe ser 200
    Y la lista de movimientos debe estar vacía

  @RF-G1-09 @positivo
  Escenario: Registrar un depósito
    Dado que existe una cuenta activa con saldo cero
    Cuando registro un movimiento de tipo "credito" por 500000
    Entonces la respuesta debe ser 201
    Y el saldo posterior debe ser "500000.00"

  @RF-G1-09 @positivo
  Escenario: Registrar un retiro con saldo suficiente
    Dado que existe una cuenta activa con saldo 500000
    Cuando registro un movimiento de tipo "debito" por 200000
    Entonces la respuesta debe ser 201
    Y el saldo posterior debe ser "300000.00"

  @RF-G1-09 @negativo
  Escenario: Rechazar retiro por saldo insuficiente
    Dado que existe una cuenta activa con saldo 100000
    Cuando intento registrar un débito por 200000
    Entonces la respuesta debe ser 409
    Y el error debe ser "CONFLICT"
    Y el saldo de la cuenta no debe cambiar

  @RF-G1-09 @negativo
  Esquema del escenario: Rechazar montos inválidos
    Dado que existe una cuenta activa
    Cuando intento registrar un movimiento con monto <monto>
    Entonces la respuesta debe ser 400
    Y el error debe ser "VALIDATION_ERROR"

    Ejemplos:
      | monto |
      | 0     |
      | -100  |
      | "100" |
