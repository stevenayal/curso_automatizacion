# Perfiles de carga — referencia

Los 5 tipos de prueba de rendimiento del temario **PtU CPTJM** (sección 1.1.2), más la línea
base (1.1.3.5.1), como perfiles parametrizados de `P_SANDBOX_API.jmx` — o de cualquier plan
generado por esta skill siguiendo el mismo patrón `${__P(...)}`.

Ningún perfil edita el `.jmx`. Todo se pasa por `-J` en la línea de comandos, o se lee de
`V_PERFILES.properties` con `-q`.

| Perfil | LO / sección PtU | Pregunta que responde |
|--------|-------------------|-------------------------|
| `baseline` | 1.1.3.5.1 | ¿cuál es el mejor tiempo posible, sin concurrencia? |
| `carga` | 1.1.2.1 | ¿el sistema responde bien con la concurrencia esperada? |
| `estres` | 1.1.2.2 | ¿qué componente falla primero al superar la carga esperada? |
| `pico` | 1.1.2.3 | ¿el sistema se recupera después de una ráfaga? |
| `resistencia` | 1.1.2.4 | ¿hay fugas de memoria o degradación sostenida en el tiempo? |
| `escalabilidad` | 1.1.2.5 | ¿cómo crece el rendimiento a medida que crece la carga? |

## baseline — línea base

Un solo hilo, sin ramp-up, pocas iteraciones. Es la referencia contra la que se compara todo
lo demás — sin ella, "degradación" no significa nada.

```bash
jmeter -n -t P_SANDBOX_API.jmx -l results/R_BASELINE.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=baseline -Jthreads=1 -Jrampup=0 -Jloops=10
```

## carga

Concurrencia esperada real del sistema (definirla con el docente/negocio, no inventarla).
Ramp-up gradual para no confundir "arranque brusco" con "carga real".

```bash
jmeter -n -t P_SANDBOX_API.jmx -l results/R_CARGA.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=carga -Jthreads=10 -Jrampup=30 -Jloops=-1 -Jduration=120
```

## estres

2 a 5 veces la carga esperada. El objetivo no es "que pase", es **encontrar dónde rompe**
y documentarlo — un error rate alto acá es un resultado válido, no una prueba fallida.

```bash
jmeter -n -t P_SANDBOX_API.jmx -l results/R_ESTRES.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=estres -Jthreads=30 -Jrampup=30 -Jloops=-1 -Jduration=180
```

## pico

Ráfaga corta, ramp-up casi nulo. Verificar **antes, durante y después**: el "después" es lo
que importa — ¿el sistema vuelve a tiempos normales o queda degradado?

```bash
jmeter -n -t P_SANDBOX_API.jmx -l results/R_PICO.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=pico -Jthreads=50 -Jrampup=5 -Jloops=-1 -Jduration=30
```

## resistencia

Carga esperada sostenida por horas, no minutos. `loops=-1` + `duration` en segundos.
Monitorear memoria del proceso bajo prueba y conexiones abiertas durante toda la corrida —
ver sección Monitoreo en `SKILL.md`.

```bash
jmeter -n -t P_SANDBOX_API.jmx -l results/R_RESISTENCIA.jtl \
  -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
  -Jperfil=resistencia -Jthreads=10 -Jrampup=60 -Jloops=-1 -Jduration=3600
```

## escalabilidad

Se corre en **escalones**, no en una sola ejecución — una corrida por fila de la tabla,
graficando throughput/latencia contra threads para ver dónde deja de ser lineal.

```bash
for paso in 1 2 3 4; do
  threads=$(grep "paso${paso}.threads" V_PERFILES.properties | cut -d= -f2)
  duration=$(grep "paso${paso}.duration" V_PERFILES.properties | cut -d= -f2)
  jmeter -n -t P_SANDBOX_API.jmx -l "results/R_ESCALABILIDAD_paso${paso}.jtl" \
    -JbaseUrl=aiquaa-sandbox-api.vercel.app -JapiKey=$SANDBOX_API_KEY \
    -Jperfil=escalabilidad -Jthreads=$threads -Jrampup=15 -Jloops=-1 -Jduration=$duration
done
```

---

## Rate limit del sandbox — decisión obligatoria antes de subir threads

Con **una sola** `x-api-key`, el techo real es 30 req/min (ver skill `sandbox`). Antes de
correr `carga`, `estres`, `pico` o `escalabilidad` con más de unos pocos threads, decidir:

- **(a) Repartir keys** — sembrar N keys en `api_keys` (una por thread group o por rango de
  threads vía CSV Data Set de keys) para que el techo real sea el del sistema, no el del rate
  limiter.
- **(b) Medir el rate limit como resultado** — dejar una sola key y documentar en qué RPS
  aparecen los primeros 429 y si `Retry-After` se respeta. Válido y realista: en producción
  casi todo servicio expone algún rate limit, y saber leerlo es parte del temario (1.1.3.1.3,
  criterios de aceptación).

La skill pregunta esto en el Context Intake — no asumir.
