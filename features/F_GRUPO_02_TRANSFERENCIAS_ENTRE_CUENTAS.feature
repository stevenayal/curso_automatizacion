# language: es
@wip @grupo-02 @api @db
Característica: Transferencias internas entre cuentas
  Como QA automatizador del sandbox
  quiero validar el registro y la consulta de transferencias internas
  para comprobar las reglas funcionales del módulo sin asumir liquidación de saldos

  # Basado en M_GRUPO_02_TRANSFERENCIAS_ENTRE_CUENTAS.md.
  # Quitar @wip al implementar los steps de API y base de datos.

  Antecedentes:
    Dado que tengo una API key válida

  # criterio: dadas dos cuentas distintas existentes, una transferencia válida se crea en estado pendiente y no altera el saldo de origen.
  @happy-path
  Escenario: Registrar una transferencia válida
    Dado que existen dos cuentas distintas para una transferencia
    Y conozco el saldo de la cuenta de origen
    Cuando registro una transferencia con un importe mayor que cero
    Entonces la respuesta es 201 Created
    Y la transferencia queda registrada en estado pendiente
    Y el saldo de la cuenta de origen no cambia

  # criterio: una transferencia por un importe mayor al saldo disponible es aceptada porque el sandbox no controla fondos.
  @edge-case
  Escenario: Registrar una transferencia por un importe mayor al saldo
    Dado que existen dos cuentas distintas para una transferencia
    Y el importe es mayor que el saldo de la cuenta de origen
    Cuando registro la transferencia
    Entonces la respuesta es 201 Created
    Y la transferencia queda registrada en estado pendiente
    Y el saldo de la cuenta de origen no cambia

  # criterio: al usar la misma cuenta como origen y destino, la API responde 400 VALIDATION_ERROR y no registra la transferencia.
  @negativo
  Escenario: Rechazar una transferencia con la misma cuenta de origen y destino
    Dado que existe una cuenta para transferencia
    Cuando intento registrarla como cuenta de origen y cuenta de destino
    Entonces la respuesta es 400 Bad Request
    Y el código de error es VALIDATION_ERROR
    Y no se registra la transferencia

  # criterio: al registrar contra una cuenta de destino inexistente, la API responde 400 VALIDATION_ERROR y no deja una transferencia registrada.
  @negativo
  Escenario: Rechazar una transferencia hacia una cuenta inexistente
    Dado que existe una cuenta de origen para transferencia
    Cuando registro una transferencia con una cuenta de destino inexistente
    Entonces la respuesta es 400 Bad Request
    Y el código de error es VALIDATION_ERROR
    Y no se registra la transferencia

  # criterio: cuando se envían ambos filtros, el listado corresponde solo a cuentaOrigenId y no a la intersección de ambos filtros.
  @edge-case
  Escenario: Priorizar el filtro por cuenta de origen al listar transferencias
    Dado que existen transferencias con cuentas de origen y destino distintas
    Cuando listo las transferencias indicando cuenta de origen y cuenta de destino
    Entonces la respuesta es 200 OK
    Y el resultado corresponde solo a la cuenta de origen indicada

  # criterio: después de dar de baja una transferencia vigente, su consulta responde 404 y deja de aparecer en el listado.
  Escenario: Dar de baja una transferencia registrada
    Dado que existe una transferencia vigente
    Cuando la doy de baja
    Entonces la respuesta es 204 No Content sin cuerpo
    Y la consulta de la transferencia responde 404 Not Found
    Y la transferencia no aparece en el listado
