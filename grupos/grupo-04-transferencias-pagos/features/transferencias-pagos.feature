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

#Registrar beneficiario
 @happy-path
  Escenario: Registrar beneficiario exitosamente
    Dado que el usuario se encuentra en el sector de "Agregar Beneficiario"
    Cuando completa el formulario con los datos y confirma la operación
    Entonces el nuevo contacto debe aparecer en la lista de cuentas guardadas

  @negativo
  Escenario: Intenta registrar beneficiario con datos inexistentes
    Dado que el usuario se encuentra en el sector de "Agregar Beneficiario"
    Cuando completa el formulario con datos que no existen
    Entonces el sistema rechaza la operación y no registra el contacto

  @edge-case
  Escenario: Intenta registrar beneficiario ya existente
    Dado el usuario cuenta con un beneficiario con Nro de cuenta '000113636-01-1'
    Cuando completa el formulario con Nro de cuenta '000113636-01-1' ya existente
    Entonces el sistema lanza una validación de dato redundante y no duplica el contacto
