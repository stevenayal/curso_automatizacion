# Tarea 3.0 – Grupo 1 – Cuentas Bancarias

## Objetivo
Automatizar validaciones antes y después de operaciones sobre cuentas usando Postman y SQL REST v2.

## Casos de prueba

- **Consulta SQL:** selecciona una cuenta activa mediante `POST /api/v2/sql/select`.
- **Caso positivo:** selecciona una cuenta activa y guarda su saldo inicial, registra un crédito de 1000 mediante `POST /api/v2/cuentas/{{cuenta_id}}/movimientos`, verifica respuesta 201, inserción en `movimientos` y saldo final en `cuentas`.
- **Caso negativo:** registra una solicitud con crédito de monto -500, espera respuesta 400 y verifica con SQL que el saldo y el conteo de movimientos no cambien.

## Configuración

Importar `Grupo1_Tarea3_Coleccion_Entrega.json` en Postman. Configurar la variable de colección `api_key` en el entorno local con una clave **del Curso 2**; nunca subir su valor a GitHub. `base_url` apunta a la API de entrenamiento. El request de token de la colección completa usa variables `grupo1_username` y `grupo1_password`, sin credenciales incrustadas.

## Ejecución

Ejecutar primero la consulta de solo lectura; luego los casos positivo y negativo por separado. El positivo **modifica el saldo y crea un movimiento cada vez que se ejecuta**. Ejecutar únicamente sobre datos autorizados de QA; no programarlo repetidamente sin aislamiento de datos. En Newman, proporcionar credenciales mediante variables de entorno o secretos CI sin imprimirlas en logs.

## Evidencias

Guardar las capturas de resultados (positivo 4/4, negativo 3/3) en `evidence/semana-03/`. Antes de subirlas, ocultar API keys, credenciales y tokens. Las capturas del historial de la conversación muestran ejecuciones exitosas; el JSON exportado contiene las pruebas pero no incluye los resultados históricos.

## Entrega

Ubicar la colección en `postman/`, evidencias en `evidence/semana-03/`, adjuntar este README y abrir un PR grupal al repositorio del profesor.
