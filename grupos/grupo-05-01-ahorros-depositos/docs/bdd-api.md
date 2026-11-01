# Trazabilidad BDD del Grupo 05-01

## Fuente y alcance

Los escenarios de [ahorros-depositos.feature](../features/ahorros-depositos.feature)
se derivan del documento **Ahorros y Depósitos — Requerimientos funcionales,
Grupo 5, CIT, versión 1.0, 10 de octubre de 2026**.
Los importes, límites, fórmulas y códigos utilizados en los escenarios se
contrastaron con el PDF.

La feature reúne **59 definiciones de escenario**, que representan **99 casos**
al expandir las tablas de ejemplos: **84 de API y 15 de web diseñados**.
Los **15 casos web están automatizados**. Incluye casos
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

Los **15 casos web** cubren la sección 6, página 20: cuentas elegibles,
importe mínimo del depósito, catálogo de plazos, tasa sugerida editable,
restricciones de la meta de ahorro, eliminación de planes con saldo y rechazo
local de importes superiores al saldo. Los dos ejemplos de constitución y
cancelación también verifican RF-G5-08 y RF-G5-10, páginas 14 y 16.

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

La práctica de la semana 6 conecta **15 casos web** con Cucumber, Playwright y
Page Objects. Los **84 casos de API conservan `@wip`**.
La validación de sintaxis de esos pendientes no representa su ejecución contra
la aplicación. Las configuraciones de Cucumber excluyen `@wip` de la suite habitual.

La feature usa `@grupo-05-01` para identificar nuestro grupo. La
[configuración general](../../../cucumber.js) carga sus módulos TypeScript
desde `tests/bdd/` de la raíz. El filtro `@grupo-05-01 and @web and not @wip`
selecciona únicamente nuestros casos implementados. El estado del grupo se añade al World
sin reemplazar el de otras suites; los hooks se filtran por nuestro tag.

## Enlace de escenarios ejecutables — Semana 6

| ID | Criterio / casos | Step de negocio | Page Object y comprobación |
|---|---|---|---|
| S6-G05-01-01 | RF-G5-08, sección 6 / 1 caso | Intentar constituir por 999999 PYG | `intentarConstituir`; mensaje exacto de mínimo y ningún intento de escritura a la API |
| S6-G05-01-02 | RF-G5-08, sección 6 / 1 caso | Consultar las opciones de plazo | `plazosDisponibles`; comparación del catálogo completo y ordenado |
| S6-G05-01-03 | RF-G5-08, sección 6 / 2 ejemplos | Seleccionar 30 o 1095 días | `seleccionarPlazo`; tasa sugerida 3.5 u 8 y campo editable |
| S6-G05-01-04 | Sección 6 / 1 caso | Seleccionar el titular | `opcionesDeCuenta`; conjunto exacto de cuentas del titular, en PYG, con estado `activa` y flag `activa=true` |
| S6-G05-01-05 | RF-G5-02, sección 6 / 5 ejemplos | Intentar crear una meta inválida | `intentarCrearMeta`; un único error específico para mínimo, relación aporte/meta, 121 meses o nombre de 2/41 caracteres; sin POST |
| S6-G05-01-06 | RF-G5-06 y RF-G5-08, sección 6 / 2 ejemplos | Intentar aporte o depósito por encima del saldo | `intentarAportar` / `intentarConstituir`; mensaje de saldo insuficiente con el disponible y ausencia de POST |
| S6-G05-01-07 | RF-G5-08 y RF-G5-10 / 2 ejemplos | Constituir, consultar y cancelar el mismo día | POM de depósitos existente en la raíz; estado activo y cancelado, condiciones exactas, interés pagado cero, débito/reintegro únicos y saldo restaurado |
| S6-G05-01-08 | RF-G5-05, sección 6 / 1 caso | Intentar eliminar un ahorro activo con saldo | `intentarEliminarPlanConSaldo`; botón deshabilitado, aviso exacto, ausencia de DELETE, estado y saldos sin cambios |

Los steps están en `tests/bdd/steps/grupo-05-01.steps.ts`, relativo a la raíz
del repositorio. Las expresiones de negocio delegan las acciones a
`playwright/pages/DepositosPage.ts` y `playwright/pages/AhorrosPage.ts`
dentro de la carpeta del grupo.
Los flujos positivos reutilizan además `playwright/pages/DepositosPage.ts` de
la raíz sin modificarlo. Su preparación y limpieza están en
`fixtures/DepositosFixture.ts` dentro del grupo.
El acceso está en `SandboxAccessPage.ts`; `storageState`
se reutiliza en memoria y cada caso tiene un contexto independiente.

Las cuentas y planes se descubren mediante consultas GET desde
`tests/bdd/support/grupo-05-01.lecturas.ts`, sin API key local ni IDs fijos.
Esta ruta de soporte también es relativa a la raíz del repositorio.
El aporte exige un plan activo y vigente del cliente vinculado a la cuenta
elegible. Se calcula un importe mayor que el saldo, conservando condiciones
válidas en los otros campos. Cada ejemplo de meta cambia una sola regla.

Una guarda bloquea las escrituras de los trece casos de consulta y rechazo.
Los dos flujos positivos solo autorizan una creación con los datos del fixture
y una cancelación del depósito recién creado. El HTML registra sus estados HTTP
201 y 200; las respuestas provienen de la aplicación real. Cualquier otra
escritura hace fallar el caso. Las expectativas se mantienen en los steps y no
se sustituyen por los valores observados si fallan.

El caso de eliminación selecciona por GET un plan existente del cliente, activo,
vigente y con saldo acumulado positivo. Compara por API el estado y los saldos
antes y después de consultar la eliminación en la web. No aporta ni elimina:
la UI debe deshabilitar «Eliminar meta» y mostrar el aviso de bloqueo.
Si el botón se habilita por una regresión, la guarda bloquea cualquier DELETE
y el caso falla. Si no hay datos elegibles, falla con causa de datos sin crearlos.

Cada flujo positivo prepara un cliente y una cuenta exclusivos con 5.000.000 PYG.
Usa `API_KEY` del `.env` únicamente contra la API oficial, sin enviarla a la web.
Se comprueban las condiciones y la proyección: 2.876,71 PYG para el depósito de
1.000.000 PYG al 3,5 % a 30 días, y 0,00 para el de 2.000.000 PYG al 0 % a 90 días.
Al cancelar el mismo día se exige interés generado cero y saldo exacto inicial.
La limpieza cancela los depósitos propios que sigan activos, retira el fondeo
sintético y verifica la baja lógica de cliente y cuenta. El historial cancelado
permanece. No se usan los fondos de Elena. Una escritura de resultado incierto
hace fallar la limpieza y conserva los recursos propios para recuperación.

El [README](../README.md#semana-6--cucumber-con-playwright) contiene los comandos
de repetición y el HTML de ejecución.

### Resultado local — 31 de octubre de 2026

- TypeScript: `tsc --noEmit` aprobado.
- Dry-run: 15 casos seleccionados, sin pasos indefinidos ni ambiguos; no ejecuta acciones.
- Ejecución final: **15 casos y 67 pasos aprobados**, sin reintentos: seis positivos
  y nueve negativos. Cuatro escrituras de negocio autorizadas y ninguna no autorizada;
  ambos fixtures restauraron el saldo y completaron su baja.
- [HTML de la ejecución final](../evidence/semana-06/cucumber-report.html).
- Los 84 casos de API con `@wip` no forman parte de estos resultados.

## Datos y automatización pendientes

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
