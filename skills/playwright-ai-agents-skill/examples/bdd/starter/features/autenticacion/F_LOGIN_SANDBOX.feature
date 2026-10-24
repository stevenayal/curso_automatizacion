@sandbox @autenticacion @web @sin-sesion
Feature: Inicio de sesión del sandbox
  Como visitante del sandbox
  Quiero recibir una explicación cuando mi cuenta no puede iniciar sesión
  Para saber que debo usar un usuario activo

  # criterio: la aplicación rechaza una cuenta inexistente sin crear una sesión
  @SANDBOX-LOGIN-01 @smoke
  Scenario: Rechazar un email inexistente
    Given que estoy en el inicio de sesión del sandbox
    When ingreso con el email inexistente "no-existe-bdd@example.com"
    Then veo el mensaje de acceso "Usuario no encontrado o inactivo."

  # criterio: un usuario marcado activo en la base puede acceder a la aplicación
  @SANDBOX-LOGIN-02 @api
  Scenario: Iniciar sesión con un usuario activo consultado
    Given que estoy en el inicio de sesión del sandbox
    And que obtengo un usuario activo desde la API del sandbox
    When ingreso con el usuario activo consultado
    Then veo la bienvenida del usuario activo
