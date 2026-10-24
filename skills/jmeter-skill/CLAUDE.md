# jmeter-skill — CLAUDE.md

## Project

Performance and stress testing skill for Apache JMeter. Owned by aiquaa-labs.
Lives at `Z:\Proyectos\aiquaa-labs\jmeter-skill`.
Complementary to postman-newman-skill (functional) and hurl-skill (declarative CI).
JMeter = performance / stress / load testing.

## Structure

```
skills/jmeter/   ← main skill (context intake + .jmx generation)
references/      ← perfiles.md (5 load profiles), ptu-cptjm.md (LO1-23 map)
examples/        ← P_SANDBOX_API.jmx (property-driven), D_, V_PERFILES.properties, Y_ templates
reporter/        ← PDF report generator (Python + pandas + reportlab)
docs/            ← usage guide in Spanish
.github/workflows/ ← CI for the skill itself
```

Depends on `sandbox-skill` for the practice API contract (endpoints, auth, rate limit) —
don't duplicate those facts here.

## File naming convention

- Test plans: `P_NOMBRE_DE_API.jmx` (one plan covers all profiles — never one .jmx per profile)
- Data CSV:   `D_NOMBRE_DE_API.csv`
- Profiles:   `V_PERFILES.properties` (one per project)
- Results:    `R_NOMBRE_DE_API.jtl` or `R_NOMBRE_DE_API_<perfil>.jtl`
- Reports:    `INFORME_PERF_NOMBRE_DE_API.pdf`
- Pipelines:  `Y_NOMBRE_DE_API_jmeter.yml`

## Load profiles (v2 — replaced the old fixed 1000x30 scenario)

Everything is `${__P(prop,default)}` — no XML editing between runs. See `references/perfiles.md`
for the full table (threads/rampup/loops/duration per profile) and the PtU CPTJM rationale
(load/stress/spike/endurance/scalability + baseline). Thread Group uses
`scheduler=true` + `duration` + `LoopController.loops` combined — whichever hits first wins,
so `loops=N` (finite) covers baseline/stress and `loops=-1` (infinite) + `duration=N` covers
load/endurance, from the *same* Thread Group XML.

## Reporter

- Entry: `reporter/jmeter_report.py` (v2)
- Deps:  `reporter/requirements.txt` (reportlab, pandas)
- Input: `.jtl` (CSV format from JMeter Simple Data Writer)
- Output: PDF with cover + SLA line + optional baseline comparison + sampler detail + top errors + verdict
- Verdict logic (all configurable via flags, defaults shown):
  `--sla-error-rate 2` / `--sla-p95 3000` / `--sla-throughput` (none by default) →
  error_rate > max(5×sla_error_rate, 10%) = COLAPSO | over any SLA = DEGRADACIÓN | else = DENTRO DE SLA
- `--baseline <path.jtl>` adds a % comparison table (avg/p95/error_rate) against a baseline run
- Total requests in the cover comes from `stats["total"]` (actual row count), not
  `threads * loops` — that product is meaningless when `loops=-1` (duration-based profiles)

## Key rules

- Never hardcode URLs, tokens or API keys in .jmx — always User Defined Variables or CSV
- CSV: recycle=true, stopThread=false, shareMode=all
- Unique-constrained fields (e.g. sandbox `usuarios.email`) need `${__UUID()}` or similar,
  never a static CSV value repeated across loops
- Pipeline: always continueOnError on jmeter step, report generates condition=always
- Reporter lang: Spanish output, HTTP methods/codes stay in English
- Against the sandbox: rate limit is 30 req/min per `x-api-key` — the Context Intake must ask
  whether to shard keys or measure the 429 as part of the result before scaling threads up
