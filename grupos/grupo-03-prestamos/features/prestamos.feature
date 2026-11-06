# language: es
@grupo-03 @web
Característica: Préstamos
  Como cliente del banco
  quiero consultar mis préstamos y sus cuotas
  para saber cuánto debo y cuándo vence

  # Los escenarios @wip quedan documentados con el bloqueo verificado el 2026-11-06
  # contra https://aiquaa-sandbox-web.vercel.app (Curso 2). No se inventan datos ni
  # resultados: primero se comprueba el dato/fixture y la funcionalidad en la UI.

  @happy-path @smoke
  # criterio: un préstamo aprobado muestra su saldo pendiente y la próxima cuota por pagar.
  # datos: préstamo 2 del seed (Cliente #2, estado Aprobado, saldo PYG 6.880.000,00,
  # 5 de 12 cuotas pagadas; la próxima pendiente es la cuota 6).
  Escenario: Un usuario autorizado consulta el saldo de un préstamo vigente
    Dado que el administrador está autenticado en la sandbox
    Y que el préstamo vigente 2 está disponible
    Cuando consulta el detalle del préstamo 2
    Entonces el préstamo está aprobado
    Y muestra el saldo pendiente "PYG 6.880.000,00"
    Y muestra la próxima cuota pendiente

  # bloqueo (verificado): la UI no valida pertenencia. Con un cliente autenticado se puede
  # abrir por URL el detalle de un préstamo ajeno (cliente 1 → préstamo 4, de la clienta 3)
  # y la pantalla lo muestra; no existe un rechazo que el escenario pueda asertar.
  # Es un hallazgo de control de acceso, no un caso automatizable en verde.
  @wip @negativo
  # criterio: un cliente no debe poder consultar el préstamo de otro cliente.
  Escenario: Consulta de un préstamo de otro cliente
    Dado que el cliente está autenticado
    Cuando consulta un préstamo que no le pertenece
    Entonces el sistema rechaza la consulta

  # bloqueo (verificado): no hay fixture de préstamo totalmente pagado. La API devuelve 25
  # préstamos y ninguno tiene estado "pagado"; el préstamo 12 tiene saldo 0 pero figura
  # "solicitado". Además el estado "cancelado" del criterio no existe en el modelo: la UI
  # usa solicitado / aprobado / rechazado / pagado.
  @wip @edge-case
  # criterio: un préstamo sin cuotas pendientes muestra saldo cero y el estado final.
  Escenario: Préstamo con todas las cuotas pagadas
    Dado que el cliente tiene un préstamo con todas sus cuotas pagadas
    Cuando consulta el detalle de ese préstamo
    Entonces el saldo pendiente es cero y el estado es cancelado

  # bloqueo (verificado): el préstamo 4 muestra 2 cuotas en estado "Vencida", pero la UI no
  # expone un indicador de mora a nivel del préstamo ni un total que separe las vencidas.
  # El criterio pide "el sistema indica que el préstamo está en mora"; ese texto no existe.
  @wip @negativo
  # criterio: un préstamo con cuotas vencidas se informa como en mora y suma la deuda vencida.
  Escenario: Consulta de un préstamo con cuotas vencidas sin pagar
    Dado que el cliente tiene un préstamo con al menos una cuota vencida y sin pagar
    Cuando consulta el detalle de ese préstamo
    Entonces el sistema indica que el préstamo está en mora
    Y muestra el monto total adeudado incluyendo las cuotas vencidas

  # bloqueo: el escenario requiere ejecutar un pago sobre un préstamo cuya cuenta no tenga
  # fondos. La sandbox es compartida y no hay un fixture web aislado de cuenta sin saldo;
  # la regla prohíbe pagos sin fixture aislado.
  @wip @negativo
  # criterio: el sistema rechaza el pago de una cuota cuando la cuenta no tiene fondos.
  Escenario: Intento de pago de cuota con fondos insuficientes
    Dado que el cliente quiere pagar una cuota de su préstamo
    Cuando consulta al préstamo correspondiente a pagar
    Entonces el sistema rechaza el pago debido a fondos insuficientes

  # bloqueo (verificado): el detalle solo muestra un botón "Pagar" en la primera cuota
  # pendiente (la UI paga en orden). No hay checkboxes ni selección múltiple de cuotas.
  @wip @happy-path
  # criterio: el cliente puede seleccionar varias cuotas y el sistema suma sus montos.
  Escenario: El cliente selecciona múltiples cuotas para pagar
    Dado que el cliente tiene un préstamo vigente con al menos dos cuotas pendientes
    Cuando consulta el detalle y selecciona más de una cuota consecutiva a pagar
    Entonces el sistema calcula y devuelve la sumatoria exacta del monto de las cuotas seleccionadas
