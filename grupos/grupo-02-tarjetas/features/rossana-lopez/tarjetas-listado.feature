# language: es
@wip @grupo-02
Característica: Listado de tarjetas
  Como cliente del banco
  quiero ver el listado de mis tarjetas
  para conocer cuáles tengo activas

  # Escenarios de Rossana López (grupo 02), separados de tarjetas.feature
  # para evitar conflictos con el resto del grupo.
  # Quitar el tag @wip cuando los steps estén implementados en tests/bdd/steps.

  @happy-path
  Escenario: Listar tarjetas
    Dado que el cliente cuenta con tarjetas activas
    Cuando el cliente pulsa la opción Tarjetas
    Entonces se muestra un listado de sus tarjetas activas

  @negativo
  Escenario: Error en la lectura de tarjetas
    Dado que el cliente inició sesión de manera correcta
    Cuando pulsa la opción Tarjetas y ocurre un error de lectura
    Entonces el sistema le muestra un mensaje de error de lectura
