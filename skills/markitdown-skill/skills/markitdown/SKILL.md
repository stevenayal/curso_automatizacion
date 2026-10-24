---
name: markitdown
description: >
  Convertir archivos (PDF, Word, PowerPoint, Excel, imágenes, audio, HTML,
  CSV, JSON, XML, ZIP, EPub, YouTube) a Markdown con Microsoft MarkItDown.
  Usar cuando el usuario mencione "markitdown", "convertir a markdown",
  "pasar a md", "PDF a markdown", "extraer texto de", "requerimiento en PDF",
  "documento a BDD", o pida procesar documentos para análisis con LLMs.
  Auto-activa para cualquier flujo documento → Markdown: conversión simple,
  batch, descripciones de imágenes con LLM u OCR.
---

Markitdown convert file. Claude write markdown. Terse output. No fluff.

---

## Context Intake — ALWAYS run this first

**Before converting anything, collect context.** No exceptions. Not one conversion runs without knowing the source, the output, and whether LLM features are really needed.

Scan the conversation for these signals and mark each as known or missing:

| Signal | What it tells you |
|--------|------------------|
| Local path (`docs/requerimientos/grupo-03.pdf`, `C:\...`) | source file (+ its extension → converter) |
| URL (YouTube, http/https) | remote source — goes through `convert`/URI path |
| `M_*.md` file | previous conversion output, may need re-run or fix |
| "las imágenes también" / "describir imágenes" | needs `llm_client` + `llm_model` — ask, never assume keys |
| "es escaneado" / "no selecciona texto" | needs OCR plugin (`markitdown-ocr`) + LLM client |
| Existing `markitdown` install / venv | skip install step |

---

### Step 1 — Ask for what's missing (one question at a time)

Work through this priority order. Stop after the first unanswered question.

#### Priority 1 — The source (always mandatory)

If you don't have a readable source file yet, ask:

> ¿Qué archivo querés convertir? Pasame la ruta local (ej: `docs/requerimientos/grupo-03-pagos-de-servicios.pdf`) o la URL.
>
> Formatos soportados: PDF, DOCX, PPTX, XLSX/XLS, imágenes, audio (wav/mp3), HTML, CSV, JSON, XML, ZIP, EPub, YouTube.

Verify before running: the path exists and is readable. If the extension is outside the supported list — say so, don't guess a converter.

#### Priority 2 — The output

If no output path was given, ask:

> ¿Dónde guardo el Markdown? Por defecto propongo `M_<NOMBRE>.md` junto al origen.
>
> Ej: `grupo-03.pdf` → `M_GRUPO_03_PAGOS_DE_SERVICIOS.md`

Rules: outputs always follow `M_<NOMBRE>.md` (UPPER_SNAKE_CASE). Never overwrite an existing `M_*.md` without asking.

#### Priority 3 — Dependencies

If `markitdown` may not be installed, or the format needs an extra, check:

> Reviso instalación: `markitdown --version`. Si falta, instalo:
> - Todo: `pip install 'markitdown[all]'`
> - Mínimo por formato: `pip install 'markitdown[pdf,docx,pptx]'`
>
> Fuente local alternativa: `C:\proyectos\markitdown` → `pip install -e packages/markitdown[all]`
>
> Requiere Python 3.10+.

Extras map (install only what's needed):

| Format | Extra |
|--------|-------|
| PDF | `[pdf]` |
| DOCX | `[docx]` |
| PPTX | `[pptx]` |
| XLSX / XLS | `[xlsx]` / `[xls]` |
| Outlook `.msg` | `[outlook]` |
| Audio transcription (wav/mp3) | `[audio-transcription]` |
| YouTube transcription | `[youtube-transcription]` |
| Azure Document Intelligence | `[az-doc-intel]` |

#### Priority 4 — LLM image descriptions / OCR (only if requested)

Ask only when the user wants image content described or scanned text extracted:

> Para describir imágenes u OCR necesito un cliente LLM:
> - ¿Tenés `OPENAI_API_KEY` (u otro cliente compatible OpenAI) configurado?
> - ¿Qué modelo uso? (ej: `gpt-4o`)
>
> Sin esto convierto igual, pero las imágenes salen solo con metadata EXIF y el OCR se omite en silencio.

Never invent API keys. Never print a key. If no client — convert without LLM and say what was skipped.

#### Priority 5 — Plugins (only if asked)

Plugins are disabled by default. If the user mentions OCR/plugins:

> Los plugins vienen deshabilitados. Para OCR: `pip install markitdown-ocr` (+ cliente OpenAI) y `MarkItDown(enable_plugins=True, llm_client=..., llm_model=...)`.
> Listo instalados con: `markitdown --list-plugins`.

---

### Step 2 — Confirm understanding before converting

```
CONTEXTO DETECTADO:
  ORIGEN:  <ruta o URL + formato>
  SALIDA:  M_<NOMBRE>.md en <carpeta>
  DEPS:    <markitdown[all] | extras mínimos | ya instalado>
  LLM:     <modelo o "no requerido — imágenes solo metadata">
  OCR:     <plugin o "no requerido">
  MODO:    CLI de una | batch | Python API

¿Confirmas o corregís algo antes de convertir?
```

Wait for confirmation for batch/LLM work. Single local CLI conversions may proceed directly.

---

## File Naming Convention

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Markdown convertido | `M_NOMBRE.md` | `M_GRUPO_03_PAGOS_DE_SERVICIOS.md` |
| Script conversión simple | `convert_local.py` | `examples/convert_local.py` |
| Script batch | `convert_batch.py` | `examples/convert_batch.py` |

Rules: `NOMBRE` = UPPER_SNAKE_CASE. Un `M_*.md` por documento origen. Nunca versionar el binario junto al MD salvo que el flujo del curso lo pida (`docs/requerimientos/` sí versiona PDF+MD como fuente de análisis).

---

## Stack

- Converter: MarkItDown (Microsoft, MIT) — `pip install 'markitdown[all]'`, Python 3.10+
- Interfaces: CLI (`markitdown`), Python API (`from markitdown import MarkItDown`), MCP (`packages/markitdown-mcp` en el repo fuente)
- Source: `C:\proyectos\markitdown` (clon local) o PyPI
- Downstream en este repo: `M_*.md` → `bdd-skill` (`/bdd:generate`), `docs/requerimientos/`

---

## Commands

| Trigger | Action |
|---------|--------|
| `/markitdown:convert` | Convert single file → `M_*.md` |
| `/markitdown:batch` | Convert folder → one `M_*.md` per file, skip failures with report |
| `/markitdown:check` | Verify install + source readability, no conversion |

---

## Rules

Drop: "It looks like...", "I'd suggest...", "You might want to...". Fragments OK. Technical terms exact.

**Output format (`/markitdown:convert`):**

```
SOURCE: <path>
OUTPUT: M_<NOMBRE>.md (<n> lines, <n> chars)
CONVERTER: <pdf|docx|...>
SKIPPED: <images w/o LLM | OCR | none>
```

**Output format (`/markitdown:batch`):**

```
BATCH: <folder>
RESULT: ✅ OK <n> | ❌ FAIL <n> | ⏭ SKIP <n>
FAILURES (if any):
  ❌ <file> → <cause: unsupported | unreadable | converter error>
```

**Output format (`/markitdown:check`):**

```
CHECK: <path>
READABLE: yes | no
FORMAT: <ext> → <converter|unsupported>
MARKITDOWN: <version|not installed>
```

---

## CLI Reference

```bash
# Check install
markitdown --version

# Single file to stdout / to file
markitdown path-to-file.pdf > document.md
markitdown path-to-file.pdf -o M_DOCUMENTO.md

# Pipe
cat path-to-file.pdf | markitdown

# Plugins
markitdown --list-plugins
markitdown --use-plugins path-to-file.pdf
```

---

## Python API Patterns

### Basic (no LLM)

```python
from markitdown import MarkItDown

md = MarkItDown(enable_plugins=False)
result = md.convert("documento.pdf")
print(result.text_content)
```

### Narrowest call (local files only — preferred)

```python
from markitdown import MarkItDown

md = MarkItDown(enable_plugins=False)
result = md.convert_local("documento.pdf")  # local files only, no URI fetching
with open("M_DOCUMENTO.md", "w", encoding="utf-8") as f:
    f.write(result.text_content)
```

### Stream (maximum control)

```python
from markitdown import MarkItDown

md = MarkItDown(enable_plugins=False)
with open("documento.pdf", "rb") as f:
    result = md.convert_stream(f, file_extension=".pdf")
print(result.text_content)
```

### LLM image descriptions (only with user-provided client)

```python
from markitdown import MarkItDown
from openai import OpenAI  # key from user's env, never hardcoded

client = OpenAI()
md = MarkItDown(llm_client=client, llm_model="gpt-4o")
result = md.convert("presentacion.pptx")
print(result.text_content)
```

### OCR plugin (scanned PDFs)

```python
# pip install markitdown-ocr
from markitdown import MarkItDown
from openai import OpenAI

md = MarkItDown(enable_plugins=True, llm_client=OpenAI(), llm_model="gpt-4o")
result = md.convert("escaneado.pdf")
print(result.text_content)
```

---

## Security (from upstream — non-negotiable)

- MarkItDown runs I/O with current process privileges. Sanitize inputs in untrusted environments.
- Call the narrowest conversion method: `convert_local()` for local files, `convert_stream()` for streams, `convert_response()` after fetching URIs yourself. Plain `convert()` accepts local + remote + streams — avoid it with untrusted input.
- Restrict paths, URI schemes and network destinations for hosted/server-side use (block private/loopback/link-local/metadata addresses).
- Never hardcode API keys in scripts or examples. Keys come from the user's environment.

---

## Course Flow (aiquaa)

```
PDF requerimiento (docs/requerimientos/grupo-NN-*.pdf)
  → /markitdown:convert → M_GRUPO_NN_*.md
    → /bdd:generate (bdd-skill) → .feature + steps
      → /postman:generate (postman-newman-skill) → colección + environment
```

The converted `M_*.md` is analysis input — never invent content the source doesn't have. If tables/values come out garbled, report it instead of fixing silently.

---

## MCP Alternative

The source repo ships `packages/markitdown-mcp` (MCP server exposing conversion as a tool). Use it when the agent host supports MCP and local `pip install` is not desired. Same naming (`M_*.md`) and same security rules apply — the MCP tool still runs with process privileges.

---

## Common Failures & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `markitdown: command not found` | Not installed / venv inactive | `pip install 'markitdown[all]'`, activate venv |
| Empty output on scanned PDF | Image-only PDF, no OCR | OCR plugin + `llm_client`/`llm_model` |
| Images without description | No LLM client | Provide client, or accept EXIF-only output |
| `ModuleNotFoundError: markitdown` | Wrong interpreter | Use the venv Python that has it installed |
| Garbled tables | Converter limits | Report, don't silently rewrite values |
| Unsupported format error | Extra not installed | Install the mapped extra from the table |

---

## Boundaries

Writes `M_*.md` outputs, conversion scripts, install commands.
Does NOT invent document content — output mirrors the source.
Does NOT run OCR/LLM description without a user-provided client.
Does NOT print, log, or commit API keys.
Does NOT fetch remote URLs without explicit user confirmation.
"stop markitdown" or "normal mode": revert to verbose style.
