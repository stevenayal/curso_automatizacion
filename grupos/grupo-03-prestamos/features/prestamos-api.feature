# language: es
@grupo-03 @api @fixture
Característica: Préstamos - API REST y validación en base de datos
  Como cliente de la API del banco
  quiero solicitar, aprobar y pagar préstamos
  para validar que la API y la base de datos mantengan el saldo y las cuotas consistentes

  # Los escenarios crean un usuario y un préstamo propios con el fixture
  # grupos/grupo-03-prestamos/fixtures/PrestamosFixture.ts.
  # Requieren API_KEY (Curso 2) y no tocan los préstamos del seed compartido.
  # Los datos (1.200.000, 12 %, 6 meses, cuota 1) son los mismos de la colección Postman.

  @happy-path @smoke
  Escenario: Solicitar un préstamo crea el registro en estado solicitado
    Dado un usuario de prueba sin préstamos
    Cuando solicita un préstamo por 1200000 a 12 % en 6 meses
    Entonces la API de préstamos responde 201 con estado "solicitado"
    Y la base de datos registra el préstamo con los datos enviados

  @negativo
  Escenario: La API rechaza un préstamo con monto negativo
    Dado un usuario de prueba sin préstamos
    Cuando solicita un préstamo por -500 a 12 % en 6 meses
    Entonces la API de préstamos responde 400
    Y la base de datos no registra un nuevo préstamo

  @happy-path
  Escenario: Aprobar un préstamo genera sus cuotas pendientes
    Dado un préstamo solicitado de 1200000 a 12 % en 6 meses
    Cuando aprueba el préstamo
    Entonces la API de préstamos responde 200 con estado "aprobado"
    Y la base de datos registra 6 cuotas pendientes sin fecha de pago
    Y el saldo pendiente en la base de datos es mayor a cero

  @happy-path
  Escenario: Pagar una cuota descuenta su monto del saldo pendiente
    Dado un préstamo aprobado con 6 cuotas pendientes
    Cuando paga la cuota 1
    Entonces la API de préstamos responde 200
    Y la base de datos marca la cuota 1 como pagada con fecha de pago
    Y el saldo pendiente baja exactamente el monto de la cuota

  @negativo
  Escenario: Pagar una cuota inexistente no modifica el saldo
    Dado un préstamo aprobado con 6 cuotas pendientes
    Cuando paga la cuota 99
    Entonces la API de préstamos responde 404
    Y la base de datos conserva el saldo y las cuotas pagadas

  @negativo
  Escenario: Pagar dos veces la misma cuota no genera un doble cobro
    Dado un préstamo aprobado con la cuota 1 pagada
    Cuando intenta pagar nuevamente la cuota 1
    Entonces la API de préstamos responde 400 o 409
    Y la base de datos conserva el saldo y las cuotas pagadas
