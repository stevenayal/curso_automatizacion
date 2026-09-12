# Grupo 03 — Préstamos

**Módulo:** Préstamos, cuotas, saldo, vencimientos y estado
**Rama / carpeta:** `grupo-03-prestamos`

> **Nota:** los endpoints REST de préstamos **todavía no están publicados** en la sandbox API.
> Arranquen por BDD + validación SQL (sandbox `/api/v1/sql/*` y acceso directo a la DB) y sumen
> la capa REST en cuanto salgan. Verificar disponibilidad con `GET /api/v1/docs`.

## Integrantes

Máximo 3. Completar con nombre y email (ver [`docs/ROSTER.md`](../../docs/ROSTER.md)):

| # | Nombre y apellido | Email |
|---|---|---|
| 1 | MARIA LUCIA SALINAS | malusalinas14@fpuna.edu.py |
| 2 | OSCAR RODRIGUEZ | osrerf@gmail.com |
| 3 | PATRICIA OJEDA | patyoc@gmail.com |

## Alcance

Completar antes de escribir el primer escenario:

- **Objetivo:**
Validar que el sistema permita a los clientes autenticados consultar con precisión la información financiera de sus préstamos activos y cancelados. El sistema debe consolidar correctamente el saldo total pendiente, listar el cronograma de cuotas con sus respectivos montos y fechas de vencimiento, reflejar en tiempo real el impacto de los pagos y actualizar los estados del crédito según las reglas de negocio establecidas.
- **Supuestos:**
Autenticación previa: Se asume que el cliente ya ha superado con éxito las capas de seguridad e inicio de sesión antes de interactuar con el módulo de préstamos.
Disponibilidad de datos: El núcleo bancario (Core Bancario) o los servicios web de backend exponen de manera síncrona la información actualizada de saldos, tasas y fechas de corte.
Persistencia de transacciones: Cualquier pago o abono realizado en ventanilla, corresponsal o canales digitales se procesa y se refleja de inmediato (o dentro de la hora de corte) en la base de datos de consultas.
- **Riesgos:**
Desincronización del Core Bancario: Que fallas en la comunicación con el sistema central muestren saldos desactualizados, provocando que un cliente pague de más o visualice cuotas pendientes ya abonadas.Cálculo incorrecto de mora: Que el reloj del sistema o los procesos batch nocturnos no ejecuten la transición de estado de "Vigente" a "En Mora" a la hora de corte exacta, afectando el cálculo de intereses punitorios.
Concurrencia en pagos simultáneos: Riesgo de inconsistencia de saldos si el cliente intenta pagar una cuota desde la aplicación web al mismo tiempo que se procesa un cobro automático o un pago en sucursal física.
- **Cobertura incluida:**
Operaciones multi-cuota: Capacidad del sistema para permitir al usuario seleccionar más de una cuota consecutiva y devolver la sumatoria exacta del monto consolidado.
Seguridad de datos: Restricciones de acceso para garantizar que un cliente autenticado no pueda consultar el detalle de un préstamo que pertenezca a un tercero.
- **Cobertura excluida:**
Flujo de originación: El proceso de simulación, solicitud, evaluación de riesgo crediticio, aprobación y desembolso de nuevos préstamos.
## API y datos

| Capa | Recursos |
|---|---|
| REST | *por publicar* — revisar `GET /api/v1/docs` |
| SQL sandbox | `POST /api/v1/sql/select`, `POST /api/v1/sql/update` sobre `prestamos` y `cuotas` (nombres a confirmar contra la DB) |
| DB directa | usuario `qa_g03` — ver [`docs/ACCESO-DB.md`](../../docs/ACCESO-DB.md) |

Primer paso sugerido: listar las tablas del módulo con un `SELECT` contra la DB y documentar el
modelo de datos real en este README antes de escribir escenarios.

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [X] Análisis y alcance (sección de arriba completa)
- [X] BDD — `features/prestamos.feature` (happy path, negativo y edge case)
- [ ] API — colección Postman/Newman en `postman/` + patrón SQL REST dinámico
- [ ] UI — `tests/e2e/prestamos.spec.ts` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR de `grupo-03-prestamos` hacia `main` usando la plantilla del repo
