@tareas @web @sin-sesion
Feature: Lista personal de tareas
  Como visitante
  Quiero registrar mis tareas
  Para consultarlas al volver a la lista

  Background:
    Given que mi lista de tareas está vacía

  # criterio: DEMO-CA1 — una tarea registrada se conserva al volver a la lista
  @TAR-01 @smoke
  Scenario Outline: Conservar una tarea registrada
    When registro la tarea "<tarea>"
    Then la lista conserva la tarea "<tarea>"

    Examples:
      | tarea                 |
      | Preparar demostración |
      | Revisar documentación |

  # criterio: DEMO-CA2 — una tarea sin título no se registra
  @TAR-02 @negativo
  Scenario: Rechazar una tarea sin título
    When registro la tarea "   "
    Then se rechaza el registro con el mensaje "Escribe una tarea"
    And la lista contiene 0 tareas
