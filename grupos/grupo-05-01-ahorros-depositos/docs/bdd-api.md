# Trazabilidad BDD del Grupo 05-01

## Fuente y alcance

Los escenarios de [ahorros-depositos.feature](../features/ahorros-depositos.feature)
se derivan del documento **Ahorros y Depósitos — Requerimientos funcionales,
Grupo 5, CIT, versión 1.0, 10 de octubre de 2026**.
Los importes, límites, fórmulas y códigos utilizados en los escenarios se
contrastaron con el PDF.

La feature reúne **59 definiciones de escenario**, que representan **98 casos**
al expandir las tablas de ejemplos: **84 de API y 14 de web**. Incluye casos
positivos, negativos y de frontera. Esto representa cobertura de diseño de los
requerimientos seleccionados, no una afirmación de cobertura completa o de
ejecución satisfactoria de todo el documento.

## Matriz de requerimientos

Cada regla de API conserva el identificador `RF-G5-*` del PDF. Los escenarios
web se agrupan bajo `@reglas-web` y los de acceso bajo `@transversal`; esos tags
son clasificaciones de prueba, no identificadores adicionales del documento.

| Referencia | Páginas del PDF | Comportamiento cubierto | Casos API |
|---|---|---|---:|
| RF-G5-01 | 7, 20 | Listado vigente, filtros combinados, faltante de meta y estado inválido | 5 |
| RF-G5-02 | 8, 21 | Creación sin débito, tasa predeterminada y datos inválidos | 8 |
| RF-G5-03 | 9, 21 | Consulta del plan y recursos inexistentes o dados de baja | 3 |
| RF-G5-04 | 10, 21 | Reemplazo, reinicio de tasa, meta frente al saldo y planes no activos | 5 |
| RF-G5-05 | 11, 21 | Baja lógica, ausencia de reintegro y segunda baja | 3 |
| RF-G5-06 | 12, 21–22 | Aporte predeterminado o explícito, meta exacta, excedente y rechazos atómicos | 11 |
| RF-G5-07 | 13, 22 | Listado, filtros, campos calculados y estado persistido | 6 |
| RF-G5-08 | 14, 22 | Constitución, débito, interés, fechas, plazos, tasa cero y rechazos | 19 |
| RF-G5-09 | 15, 22 | Detalle, ausencia de vencimiento automático, proyección y operaciones no admitidas | 6 |
| RF-G5-10 | 16, 22–23 | Cancelación, días acotados, interés proporcional, estados y cuenta asociada | 10 |
| RF-G5-TK | 17, 23 | Emisión de token, credenciales inválidas y credenciales de otro grupo | 5 |
| Sección 5 | 17–19, 23 | Acceso sin credenciales y tokens alterados o vencidos | 3 |

Los **14 casos web** corresponden a la sección 6, página 20: cuentas elegibles,
importe mínimo del depósito, catálogo de plazos, tasa sugerida editable,
restricciones de la meta de ahorro, eliminación de planes con saldo y rechazo
local de importes superiores al saldo.

## Correcciones del BDD anterior

| Intención original | Comportamiento documentado que ahora se comprueba |
|---|---|
| Consultar un depósito vigente | Se conservan sus condiciones y se distinguen interés proyectado e interés generado. |
| Rechazar un importe menor al mínimo | La web exige 1.000.000 PYG; la API admite cualquier monto positivo. Son casos separados. |
| Consultar un depósito en su vencimiento | La API no vence ni acredita automáticamente: un depósito activo pasado de fecha sigue activo y puede mostrar días restantes negativos. |
| Consultar tasas disponibles | El tarifario es una sugerencia editable de la web; no existe un endpoint de tasas del módulo. |
| Consultar intereses generados | La proyección usa todo el plazo; lo efectivamente pagado queda en el interés generado después de cancelar. |
| Constituir por el mínimo permitido | El mínimo de la web se prueba como frontera; la API tiene su propia validación de monto mayor que cero. |
| Cancelar anticipadamente | Se verifica una sola acreditación de capital e interés proporcional, sin penalidad y con días limitados al plazo. |
| Constituir sin saldo suficiente | La API responde 409 sin depósito ni débito parcial; la web lo detecta antes de enviar la operación. |

## Relación con las pruebas API existentes

**Base:** `https://aiquaa-sandbox-api.vercel.app`. La autenticación utiliza una
credencial del curso 2 desde el entorno; la feature no contiene claves,
contraseñas ni tokens reales.

| Comportamiento | Método y endpoint | Resultado y campos principales |
|---|---|---|
| Consultar un depósito activo o con estado guardado vencido | `GET /api/v2/depositos/{id}` | 200; `monto`, `tasa_anual`, `fecha_vencimiento`, `estado`, `interes_proyectado`, `dias_restantes` |
| Listar por titular y estado | `GET /api/v2/depositos` | 200; filtros `usuarioId` y `estado` combinados |
| Constituir un depósito | `POST /api/v2/depositos` | 201; débito de cuenta y estado `activo` |
| Rechazar capital mayor al saldo | `POST /api/v2/depositos` | 409 `CONFLICT`; sin cambios en la cuenta ni creación del depósito |
| Cancelar un depósito activo | `POST /api/v2/depositos/{id}/cancelar` | 200; `dias_transcurridos`, `interes_generado`, estado `cancelado` y crédito de cuenta |

La proyección del depósito usa interés simple:
`capital × tasa_anual / 100 × plazo_dias / 365`.
Al cancelar, los días pagados se limitan entre cero y el plazo pactado y el
interés se redondea a dos decimales. La consulta posterior conserva la proyección
del plazo completo, aunque la cancelación haya pagado menos interés.

## Estado de automatización y datos pendientes

Toda la feature conserva **`@wip`**. Los 98 casos están documentados y su
sintaxis se revisa con el parser Gherkin; **no son 98 pruebas ejecutadas**.
Todavía faltan los steps del Grupo 05-01 y, para web, sus Page Objects. Las
configuraciones actuales de Cucumber excluyen `@wip` de la suite habitual.

La feature usa `@grupo-05-01` para identificar nuestro grupo. La futura
automatización deberá limitar la selección a nuestra ruta o a ese tag para
ejecutar únicamente nuestros escenarios.

| Tag o condición | Preparación necesaria antes de automatizar |
|---|---|
| `@api` / `@db` | Credencial del curso 2, datos de prueba propios y comprobaciones de persistencia mediante SQL parametrizado. |
| `@fixture-aislado` | Planes, depósitos y cuentas exclusivos; algunas bajas dejan dinero inaccesible según el comportamiento del sandbox. |
| `@fixture-fecha` | Fixtures con fechas controladas; no cambiar fechas o estados de registros compartidos para forzar vencimientos. |
| `@requiere-credenciales` | Credenciales de grupo y estados de prueba proporcionados por el curso, disponibles únicamente desde el entorno. |
| `@web` | Sesión de prueba, Page Objects y localizadores verificados contra la aplicación. |

Los escenarios futuros deben conservar valores creados durante su preparación
y verificar tanto el resultado visible como el efecto persistido. Los casos de
ahorro requieren una estrategia de datos aislados: el sandbox no dispone de una
operación de rescate que devuelva los aportes a la cuenta.

El anexo BCP/SEDECO del CIT es material de referencia. No se
convirtió en criterios de aprobación: el propio documento lo presenta como
orientativo y describe funciones que el sandbox no implementa.
