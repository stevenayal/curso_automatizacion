
# Evidencias - Semana 3 - Grupo 1

## Tarea 3.0
Pre-request y Post-response con validacion SQL.

### Caso positivo
- Operacion: credito de G. 1.000
- Resultado HTTP: 201 Created
- Pruebas: 4/4 PASSED
- Validacion SQL: movimiento registrado y saldo actualizado.

### Caso negativo
- Operacion: credito de G. -500
- Resultado HTTP: 400 Bad Request
- Pruebas: 3/3 PASSED
- Validacion SQL: saldo y cantidad de movimientos sin cambios.

## Evidencias
Las capturas adjuntas muestran los resultados
de Postman y las validaciones SQL.
