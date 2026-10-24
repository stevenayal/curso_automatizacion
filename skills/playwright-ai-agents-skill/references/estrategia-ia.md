# Estrategia IA + Playwright — documento base

> Fuente de verdad conceptual de `playwright-ai-agents-skill`. `SKILL.md` resume; las reglas
> operativas ejecutables viven en los archivos de abajo. Si una regla cambia, se actualiza
> primero acá y después se refleja en `SKILL.md` y en el reference correspondiente.

## Dónde se implementa cada sección

| Sección | Implementación en la skill |
|---|---|
| §1 Planner / Generator / Healer | `SKILL.md` → `/pw-ia:plan`, `/pw-ia:generate`, `/pw-ia:heal` · `examples/PLAN_TRANSFERENCIAS.md` |
| §2, §7–§9 CLI vs MCP, snapshots, visión | `SKILL.md` → Exploración de UI |
| §3, §20–§22 Repo, Page Objects, DSL, API/UI | `examples/pages/TransfersPage.ts` · `examples/T_TRANSFERENCIA_EXITOSA.spec.ts` · `playwright-skill` |
| §5–§6 Locators y `data-testid` | `playwright-skill` (protocolo anti-falla) · `PLAN_*.md` → contrato testid |
| §10–§11 storageState y seed tests | `examples/seed.spec.ts` · `playwright-skill/examples/auth.setup.ts` |
| §12–§13, §18, §24 Routing, escalamiento, caching, batch | `references/model-routing.md` · `examples/HEALER_PROMPT.md` |
| §14–§15, §28 Healer con presupuesto y blacklist | `references/healing-guardrails.md` · `examples/.env.ai.example` |
| §16, §25 Failure Classifier | `scripts/classify-failures.mjs` · `references/failure-taxonomy.md` |
| §17 Evidencias | `SKILL.md` → Evidencias |
| §25–§27 Pipeline, TIA, pirámide | `examples/Y_EXAMPLE_playwright_ai.yml` · `SKILL.md` → `/pw-ia:impact` |
| §29, §31 Métricas y distribución | `references/metrics.md` |

---

## Investigación y estrategia de bajo consumo

## Conclusión principal

Para un entorno QA empresarial con Playwright, **no conviene usar un agente de IA controlando el navegador en cada ejecución de prueba**. Esto incrementa el consumo por contexto, snapshots del DOM/accessibility tree, llamadas a herramientas y razonamiento repetido.

La arquitectura recomendada es:

> **IA para generar, analizar y reparar. Playwright Test tradicional para ejecutar.**

```text
Requisito / historia
        ↓
Planner con IA
        ↓
Plan de pruebas estructurado
        ↓
Generator con IA
        ↓
Código Playwright TypeScript
        ↓
Validación estática
        ↓
Playwright Test
        ↓
CI/CD determinístico
        ↓
¿Falló?
   ├── No → Fin
   └── Sí
        ↓
Clasificar fallo
        ↓
Solo si parece fallo del test
        ↓
Healer con IA
        ↓
PR / revisión humana
```

---

## 1. Agentes de Playwright

Playwright dispone de un enfoque basado en tres responsabilidades principales:

- **Planner:** explora la aplicación y genera un plan de pruebas.
- **Generator:** transforma el plan en pruebas Playwright.
- **Healer:** analiza y propone reparaciones para pruebas fallidas.

### Planner

Debe trabajar principalmente sobre la intención funcional:

```text
Requisito
↓
identificar escenarios
↓
riesgos
↓
precondiciones
↓
datos
↓
expected results
```

No debería encargarse de toda la generación y ejecución simultáneamente.

### Generator

Puede recibir especificaciones estructuradas:

```text
specs/
  transferencia-cuentas.md
```

y generar:

```text
tests/
  transferencias/
    transferencia-exitosa.spec.ts
    saldo-insuficiente.spec.ts
    cuenta-bloqueada.spec.ts
```

### Healer

Debe utilizarse únicamente cuando existen indicios de que el producto funciona y el problema probablemente está en la automatización.

Ejemplos:

- locator inválido;
- cambio de texto;
- cambio de estructura DOM;
- sincronización incorrecta;
- navegación modificada.

---

## 2. Playwright MCP vs. CLI + Skills

Para generación masiva de automatización, **Playwright CLI + Skills resulta especialmente interesante por su menor necesidad de contexto**.

MCP puede implicar el intercambio repetido de:

```text
tool schemas
+
accessibility snapshots
+
estado de página
+
resultados de herramientas
```

Mientras que CLI permite interacciones más compactas para coding agents.

### Recomendación de uso

| Caso | Enfoque recomendado |
|---|---|
| Generación de tests | CLI + Skills |
| Coding agents | CLI + Skills |
| Repositorios grandes | CLI + Skills |
| Exploración autónoma de UI | MCP |
| Self-healing complejo | MCP |
| Navegación interactiva persistente | MCP |
| Ejecución normal CI/CD | Playwright Test |

No utilizar como arquitectura estándar:

```text
Agent → MCP → Browser → Agent → MCP → Browser → ...
```

para cientos o miles de casos.

Preferir:

```text
Agent
 ↓
Playwright CLI
 ↓
exploración puntual
 ↓
genera .spec.ts
 ↓
FIN IA
```

Después:

```bash
npx playwright test
```

Las ejecuciones posteriores no necesitan consumir tokens de IA.

---

## 3. Arquitectura del repositorio

```text
qa-automation/
│
├── agents/
│   ├── planner/
│   ├── generator/
│   └── healer/
│
├── specs/
│   ├── transferencias/
│   ├── pagos/
│   ├── login/
│   └── usuarios/
│
├── tests/
│   ├── smoke/
│   ├── regression/
│   ├── integration/
│   └── e2e/
│
├── pages/
├── fixtures/
├── data/
├── playwright/
│   └── .auth/
└── playwright.config.ts
```

Separar:

```text
specs = intención funcional
tests = implementación automatizada
```

Esto reduce el contexto necesario para regenerar o reparar pruebas.

---

## 4. Nunca utilizar IA durante una ejecución normal

### Antipatrón

```text
click login
→ preguntar IA

fill username
→ preguntar IA

click submit
→ preguntar IA
```

Un escenario de 30 pasos puede convertirse en decenas de llamadas al modelo.

### Patrón recomendado

La IA genera una vez:

```typescript
await page.getByLabel('Usuario').fill(user);
await page.getByLabel('Contraseña').fill(password);
await page.getByRole('button', { name: 'Ingresar' }).click();
```

Después Playwright ejecuta este código sin intervención del LLM.

---

## 5. Locators semánticos

Jerarquía recomendada:

```text
1. getByRole
2. getByLabel
3. getByText
4. getByTestId
5. CSS
6. XPath
```

Evitar:

```typescript
page.locator('#app > div:nth-child(3) > div > button:nth-child(2)')
```

Preferir:

```typescript
page.getByRole('button', {
  name: 'Confirmar transferencia'
});
```

Locators robustos significan menos mantenimiento y menos llamadas al Healer.

---

## 6. Contrato de `data-testid`

Para elementos críticos del negocio conviene establecer un contrato con desarrollo:

```html
<button data-testid="transfer-submit">Transferir</button>
```

Automatización:

```typescript
page.getByTestId('transfer-submit')
```

Ejemplos de IDs consistentes:

```text
transfer-account-origin
transfer-account-target
transfer-amount
transfer-submit
transfer-confirm
transfer-success
```

Regla sugerida:

> Los elementos críticos de negocio deben disponer de un identificador estable para automatización cuando los locators semánticos no sean suficientes.

---

## 7. Evitar enviar todo el DOM al modelo

Antipatrón:

```text
snapshot completo → LLM
```

para cada interacción.

Preferir:

```text
snapshot
↓
buscar región relevante
↓
extraer fragmento
↓
enviar solamente ese fragmento
```

En lugar de proporcionar decenas de miles de tokens de una página, enviar únicamente información como:

```text
button "Transferir"
input "Monto"
combobox "Cuenta origen"
```

---

## 8. Buscar antes de solicitar snapshots completos

Cuando la herramienta disponible permita búsquedas dirigidas, intentar localizar primero el elemento o región requerida.

Conceptualmente:

```text
find("Confirmar")
```

antes de solicitar otra representación completa de la página.

Esto reduce contexto innecesario.

---

## 9. Vision solamente como fallback

Jerarquía recomendada:

```text
Accessibility tree
↓
DOM / locator
↓
snapshot parcial
↓
screenshot
↓
vision model
```

Utilizar visión principalmente para:

- canvas;
- gráficos;
- mapas;
- PDFs visuales;
- diagramas;
- componentes sin accesibilidad adecuada;
- validaciones estrictamente visuales.

No utilizar screenshots multimodales para acciones que pueden resolverse mediante locators.

---

## 10. Reutilizar autenticación

Playwright permite reutilizar el estado de autenticación mediante `storageState`.

```typescript
{
  name: 'chromium',
  use: {
    storageState: 'playwright/.auth/user.json'
  }
}
```

Arquitectura recomendada:

```text
setup-auth
↓
API login / token
↓
storageState
↓
500 tests
```

En lugar de realizar cientos de logins por UI.

Esto reduce:

- tiempo;
- acciones de browser;
- errores;
- procesamiento del agente;
- consumo de IA durante generación/exploración.

---

## 11. Seed tests

Crear puntos de partida estables para los agentes.

```typescript
test('seed', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByText('Bienvenido')).toBeVisible();
});
```

Ejemplos empresariales:

```text
seed-retail-user
seed-corporate-user
seed-admin
seed-operations
seed-accounting
```

Así el agente no tiene que redescubrir login, roles, menús y configuración inicial cada vez.

---

## 12. Model routing

No utilizar el modelo más potente para todas las tareas.

```text
              ┌→ modelo económico
              │
request → router
              │
              └→ modelo avanzado
```

### Modelo económico

Usarlo para:

- generar tests desde especificaciones claras;
- crear locators;
- refactoring;
- convertir pruebas;
- clasificar errores;
- crear fixtures;
- generar datos.

### Modelo avanzado

Reservarlo para:

- exploración desconocida;
- razonamiento complejo;
- healing ambiguo;
- flujos multi-page;
- problemas que mezclan frontend, backend y reglas funcionales.

---

## 13. Escalamiento por confianza

```text
Modelo económico
↓
¿confianza alta?
   Sí → aplicar/proponer
   No
↓
Modelo intermedio
↓
¿resuelto?
   Sí → aplicar/proponer
   No
↓
Modelo avanzado con mayor reasoning
```

Esto evita utilizar permanentemente el modelo más costoso.

---

## 14. Healer con presupuesto

Nunca permitir loops ilimitados:

```text
while (!passing) {
   agent.fix()
}
```

Recomendación:

```text
AI_MAX_HEAL_ATTEMPTS=2
```

Como máximo, dependiendo del caso, tres intentos.

Después:

```text
HUMAN_REVIEW_REQUIRED
```

---

## 15. Prohibir healing automático de reglas funcionales

La IA puede reparar automáticamente o proponer cambios sobre:

- locator;
- wait;
- navegación;
- selector;
- sincronización;
- fixture técnico.

No debe modificar automáticamente:

- expected business result;
- cálculos;
- saldo esperado;
- reglas contables;
- HTTP status funcional esperado;
- reglas regulatorias;
- permisos;
- límites monetarios.

Ejemplo peligroso:

```typescript
expect(balance).toBe(1_000_000)
```

Si el sistema devuelve `850000`, el agente no debe cambiar automáticamente la expectativa para hacer pasar la prueba.

---

## 16. Clasificar errores antes del Healer

```text
FAIL
 ↓
Failure Classifier
```

Clasificaciones sugeridas:

```text
PRODUCT_BUG
TEST_BUG
ENVIRONMENT
DATA
NETWORK
UNKNOWN
```

Solo los casos clasificados con suficiente confianza como `TEST_BUG` deberían activar automáticamente el Healer.

Ejemplo:

```text
HTTP 500
→ PRODUCT_BUG / UNKNOWN
→ no activar healer automáticamente
```

```text
locator timeout
→ probable TEST_BUG
→ healer permitido
```

---

## 17. Evidencias solamente cuando sean necesarias

Configuración sugerida:

```typescript
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
}
```

Evitar generar permanentemente:

```text
screenshot siempre
video siempre
trace siempre
```

Esto reduce almacenamiento y, especialmente, la cantidad de evidencia que posteriormente podría ser enviada a modelos de IA.

---

## 18. Prompt caching

Organizar prompts con una sección estable y otra dinámica:

```text
[STATIC]

reglas QA
Playwright conventions
framework
coding standards
security rules
healing rules

[DYNAMIC]

test específico
error
fragmento de página
```

Esto favorece mecanismos de prompt caching ofrecidos por proveedores de LLM y reduce el costo del contexto repetitivo.

---

## 19. No enviar todo el repositorio

No proporcionar al agente indiscriminadamente:

```text
src/*
tests/*
docs/*
package files
configuraciones irrelevantes
```

Para generar un test normalmente debería recibir únicamente:

```text
spec
page object relevante
fixture
tipos
helpers necesarios
coding rules
```

El principio es **contexto mínimo suficiente**.

---

## 20. Page Objects como compresión semántica

Además del mantenimiento, los Page Objects pueden reducir contexto para la IA.

En lugar de generar repetidamente acciones de bajo nivel:

```typescript
page.getByRole(...)
page.getByText(...)
page.getByLabel(...)
```

el agente puede utilizar:

```typescript
TransfersPage.transfer({
   origin,
   destination,
   amount
});
```

Esto permite razonar a nivel de negocio.

---

## 21. Domain DSL

Para operaciones repetitivas puede crearse una capa aún más abstracta:

```typescript
await banking.transfer({
  from: 'CA_GS',
  to: 'CC_USD',
  amount: 500000
});
```

Aplicable a:

- transferencias;
- pagos;
- login;
- consulta de saldos;
- extractos;
- autorizaciones;
- segundo factor.

La IA genera menos código repetitivo y utiliza primitivas conocidas y testeadas.

---

## 22. Separar API y UI

No preparar todos los datos mediante UI.

Por ejemplo, crear mediante API:

```text
cliente
cuenta
saldo
usuario
beneficiario
```

Luego utilizar UI solamente para el flujo que realmente se desea validar.

Playwright permite trabajar con APIs mediante `APIRequestContext`.

Arquitectura:

```text
API setup
↓
UI business flow
↓
API/DB verification cuando corresponda
```

Esto reduce duración, flakiness y necesidad de exploración inteligente.

---

## 23. Niveles de generación con IA

### Nivel A — Manual

Para funciones altamente críticas:

- core bancario;
- contabilidad;
- regulación;
- movimientos monetarios críticos.

### Nivel B — IA + revisión humana

```text
AI → PR → QA review → merge
```

Recomendado como modelo empresarial principal.

### Nivel C — Generación automática controlada

Para:

- CRUD;
- validaciones simples;
- pantallas administrativas;
- escenarios repetitivos.

### Nivel D — Exploración autónoma

La IA explora y propone pruebas, pero no realiza merge automático de cambios críticos.

---

## 24. Generación batch

Cuando existen cientos o miles de escenarios que no necesitan respuesta inmediata, conviene utilizar procesamiento batch si el proveedor del modelo ofrece descuentos para cargas asíncronas.

Ejemplo:

```text
noche
↓
500 escenarios pendientes
↓
Batch generation
↓
validación automática
↓
PRs disponibles para revisión
```

Ideal para una fábrica de automatización.

---

## 25. Pipeline recomendado

```text
Developer PR
     │
     ▼
Changed Files Detector
     │
     ▼
Risk Analyzer
     │
     ├── LOW
     │     ↓
     │   smoke
     │
     ├── MEDIUM
     │     ↓
     │   affected regression
     │
     └── HIGH
           ↓
         critical/full E2E
```

Luego:

```text
Playwright Test
   ↓
PASS ─────────────→ DONE

FAIL
   ↓
Failure Classifier
   ↓
┌───────────────────────────────┐
│ Product bug → Bug management │
│ Environment → retry/infra     │
│ Test bug → Healer             │
│ Unknown → Human analysis      │
└───────────────────────────────┘
```

La IA se encuentra principalmente después de un fallo o durante generación, no en cada ejecución.

---

## 26. Test Impact Analysis

No ejecutar toda la regresión ante cada cambio.

```text
git diff
↓
impact analysis
↓
tests afectados
```

Ejemplo:

```text
payments/*
```

puede disparar:

```text
@payments
@ledger
@accounts
```

en lugar de:

```text
@all
```

Combinar con:

- tags;
- projects;
- grep;
- sharding;
- ejecución paralela.

---

## 27. Pirámide operativa de regresión

Ejemplo para 1.000 tests:

```text
100 smoke
300 critical regression
600 extended/full regression
```

### Pull Request

```text
100–300 tests relevantes
```

### Nightly

```text
1.000 tests
```

### Ejecución extendida

```text
1.000 tests
+
múltiples browsers
+
resoluciones
+
datasets extendidos
```

La IA solamente analiza los fallos relevantes.

---

## 28. Presupuesto para agentes

Definir límites explícitos.

Ejemplo conceptual:

```text
AI_BUDGET_PER_TEST=<definir según proveedor>
AI_MAX_CALLS=3
AI_MAX_TOKENS=<límite interno>
AI_MAX_HEAL_ATTEMPTS=2
```

Al superar el presupuesto:

```text
HUMAN_REVIEW_REQUIRED
```

El presupuesto debe medirse y ajustarse utilizando datos reales del proyecto.

---

## 29. Métricas

| Métrica | Dirección objetivo |
|---|---:|
| tokens/test generado | ↓ |
| costo/test generado | ↓ |
| tokens/healing | ↓ |
| healing success rate | ↑ |
| false healing | ≈ 0 |
| flaky rate | ↓ |
| human modifications/test | ↓ |
| AI calls/test | ↓ |
| ejecuciones sin IA | >95% |
| tests con locators robustos | >90% |

Agregar una métrica económica importante:

```text
AI cost / bug útil detectado
```

También medir:

```text
AI cost / test mantenido
AI cost / test generado aceptado
% de código generado rechazado
% de healing aceptado
mean tokens per generation
mean tokens per failure analysis
```

---

## 30. Arquitectura empresarial propuesta

```text
                    ┌───────────────┐
                    │   CI/CD / PR  │
                    └───────┬───────┘
                            │
                    User Story / PR
                            │
                            ▼
                   ┌────────────────┐
                   │ Risk Analyzer  │
                   │  small LLM     │
                   └───────┬────────┘
                           │
                    new functionality?
                     /            \
                   no              yes
                   │                │
                   ▼                ▼
             regression       Test Planner
                                   │
                                   ▼
                            Markdown Spec
                                   │
                                   ▼
                           Generator Agent
                           CLI + Skills
                                   │
                                   ▼
                          Playwright .spec
                                   │
                                   ▼
                            static checks
                                   │
                           ┌───────▼──────┐
                           │ Playwright   │
                           │ Test Runner  │
                           └───────┬──────┘
                                   │
                         ┌─────────┴───────┐
                         │                 │
                        PASS              FAIL
                         │                 │
                         ▼                 ▼
                       DONE        Failure Classifier
                                           │
                                   ┌───────┴───────┐
                                   │               │
                              product bug       test issue
                                   │               │
                              bug tracker      Healer Agent
                                                   │
                                                   ▼
                                                  PR
```

---

## 31. Distribución tecnológica sugerida

Como referencia arquitectónica inicial:

```text
70% Playwright Test determinístico
15% Playwright CLI + Skills
10% AI Planner / Generator
5% MCP / Healer
```

No debe interpretarse como una regla matemática rígida, sino como el principio de que **la mayor parte del sistema debe seguir siendo determinística**.

Evitar una arquitectura `100% MCP agent`.

---

## 32. Regla operativa fundamental

> **Una prueba automatizada aprobada nunca debería necesitar IA para pasar.**

La IA sirve principalmente para:

```text
CREAR
MANTENER
DIAGNOSTICAR
```

No para:

```text
EJECUTAR
```

---

## 33. Impacto esperado en consumo

Una arquitectura browser-agent-first puede producir repetidamente:

```text
acción
snapshot
reasoning
acción
snapshot
reasoning
...
```

La arquitectura propuesta busca convertir esto en:

```text
1 sesión IA para generación
+
0 llamadas IA en ejecuciones exitosas normales
```

Por lo tanto, después de aprobar el código Playwright, el costo marginal de IA de una regresión normal puede acercarse a cero.

La IA vuelve a intervenir solamente cuando:

- hay nueva funcionalidad;
- se necesita generar una nueva prueba;
- aparece un fallo que requiere clasificación;
- existe evidencia de mantenimiento/healing;
- un humano solicita análisis adicional.

---

# Recomendación final

Para una implementación empresarial moderna utilizaría:

```text
Playwright Test
+
TypeScript
+
Page Objects / Domain DSL
+
Playwright CLI + Skills
+
Planner / Generator
+
Healer bajo demanda
+
MCP como herramienta especializada/fallback
+
modelo económico por defecto
+
modelo avanzado por escalamiento
+
Prompt Caching
+
storageState
+
API setup
+
trace on-first-retry
+
screenshots only-on-failure
+
máximo 2 intentos automáticos de healing
+
revisión humana obligatoria para cambios funcionales
```

La estrategia más sostenible consiste en mantener una separación clara entre **inteligencia generativa** y **ejecución determinística**.

La IA debe acelerar la creación y mantenimiento de automatización, no convertirse en una dependencia permanente de cada ejecución de la suite.

---

## Fuentes principales para profundizar

- Microsoft Playwright — documentación oficial de Test Agents, locators, autenticación, API testing, CI, trace y ejecución paralela.
- Microsoft Playwright MCP — documentación y repositorio oficial del servidor MCP para automatización de navegador.
- Playwright CLI / Skills — enfoque orientado a coding agents y automatización con menor carga contextual que flujos MCP completos.
- OpenAI — documentación de Prompt Caching, selección/routing de modelos y procesamiento Batch para cargas asíncronas.

> **Nota:** los porcentajes de ahorro y presupuestos definitivos deben obtenerse mediante instrumentación del framework real: tokens de entrada/salida, cached tokens, cantidad de tool calls, costo por generación, costo por healing y tasa de aceptación humana.
