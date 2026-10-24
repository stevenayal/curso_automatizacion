# Guardrails del Healer

## Cuándo puede correr

Las tres condiciones, siempre:

1. `CLASIF_*.json` marca el test con `healerAllowed: true` (`TEST_BUG` + `high`).
2. Intento actual ≤ `AI_MAX_HEAL_ATTEMPTS` (default 2, máximo recomendado 3).
3. Llamadas acumuladas del test ≤ `AI_MAX_CALLS` y tokens ≤ `AI_MAX_TOKENS`.

`TEST_BUG/medium` → el usuario confirma explícitamente que es desalineación del test, y recién
ahí se trata como candidato. `PRODUCT_BUG`, `ENVIRONMENT`, `DATA`, `NETWORK`, `UNKNOWN`,
flaky → nunca.

## Whitelist — puede proponer cambios sobre

| Tipo | Ejemplo |
|---|---|
| Locator / selector | botón renombrado, testid nuevo, scoping a `dialog` |
| Wait / sincronización | `toBeVisible()` antes de actuar; reemplazar `waitForTimeout` |
| Navegación | URL cambiada, paso intermedio nuevo (modal, tab) |
| Fixture técnico | path de `storageState`, `baseURL` por project |

## Blacklist — nunca modifica automáticamente

- expected business result
- cálculos, montos, saldos esperados
- reglas contables
- HTTP status funcional esperado (`expect(status).toBe(201)`)
- reglas regulatorias
- permisos / roles
- límites monetarios
- datos de prueba que cambian el significado del escenario

Ejemplo prohibido:

```typescript
// antes
expect(balance).toBe(1_000_000);
// el sistema devuelve 850000 → el Healer NO propone
expect(balance).toBe(850_000);
```

Salida correcta: `HUMAN_REVIEW_REQUIRED — expected de negocio (saldo) difiere; posible PRODUCT_BUG`.

## Permisos por capa — arquitectura Cucumber + BDD + POM

| Capa | Healer |
|---|---|
| `features/*.feature` | **nunca** — es la especificación de negocio |
| `steps/` — `Then` con `expect` de valor | **nunca** |
| `steps/` — glue (qué método PO se invoca) | solo `TEST_BUG/high`, sin cambiar la expresión Cucumber |
| `support/world.ts`, `support/hooks.ts` | fixture técnico |
| `pages/` | **sí** — locators, esperas, navegación |

Detalle: `references/bdd-pom-architecture.md`.

## Chequeo mecánico del diff propuesto

Antes de presentar el diff, rechazarlo (→ `HUMAN_REVIEW_REQUIRED`) si alguna línea `-`/`+`:

- toca un `expect(...)` cuyo matcher es de valor (`toBe`, `toEqual`, `toStrictEqual`,
  `toBeCloseTo`, `toBeGreaterThan*`, `toBeLessThan*`, `toHaveLength`) — salvo que el cambio sea
  solo el locator dentro de `expect(locator)`;
- cambia un literal numérico dentro de un `expect`;
- modifica archivos fuera de `tests/`, `pages/`, `fixtures/`, `steps/`, `support/` (p. ej. `src/`, `data/`, `.env*`);
- toca cualquier `*.feature`, o cambia la expresión de un `Given/When/Then(...)` en `steps/`;
- elimina un `expect` o un `test(...)` completo, o agrega `test.skip` / `test.fixme`;
- sube timeouts por encima del valor de `playwright.config.ts` sin causa en el error.

## Loop con presupuesto

```text
intento = 1
mientras intento ≤ AI_MAX_HEAL_ATTEMPTS:
    respuesta = healer(STATIC + DYNAMIC(intento, intentos_previos))
    si VEREDICTO = HUMAN_REVIEW_REQUIRED → cortar
    si CONFIANZA ≠ high → escalar tier (model-routing.md), intento += 1, continuar
    si diff falla chequeo mecánico → cortar con HUMAN_REVIEW_REQUIRED
    usuario corre: npx playwright test <file> -g "<title>" --project <project>
    si pasa → HEAL_<TEST>.md listo para PR (course-pr-skill)
    intento += 1
cortar con HUMAN_REVIEW_REQUIRED
```

El agente **no** corre el test en loop por su cuenta: da el comando, el usuario (o CI) lo
ejecuta y pega el resultado.

## Formato `HEAL_<TEST>.md`

```markdown
# HEAL_TRF_01

| Campo | Valor |
|---|---|
| Test | tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts › TRF-01 [chromium] |
| Clasificación | TEST_BUG / high / locator-not-found |
| Intento | 1/2 |
| Tier | económico |
| Tokens (in/out/cached) | 3.100 / 420 / 2.600 |
| Veredicto | FIX_PROPUESTO |
| Toca blacklist | no |

## Causa
Botón renombrado "Confirmar transferencia" → "Confirmar" dentro del dialog.

## Diff
(unified diff)

## Verificación
npx playwright test tests/transferencias/T_TRANSFERENCIA_EXITOSA.spec.ts -g "TRF-01" --project chromium
```

## Entrega

Nunca commit, push ni merge directo. `HEAL_*.md` + diff aplicado localmente → `course-pr-skill`
(`/curso:entregar`) con revisión humana obligatoria. Nivel A (core bancario, contabilidad,
regulación): el Healer solo diagnostica, no propone diff.
