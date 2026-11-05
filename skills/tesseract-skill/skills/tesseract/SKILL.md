---
name: tesseract
description: >
  Extraer texto de imágenes y PDFs escaneados (OCR) con Tesseract OCR,
  100% local y sin API key. Usar cuando el usuario mencione "tesseract",
  "OCR", "reconocimiento óptico de caracteres", "extraer texto de imagen",
  "PDF escaneado", "no tengo API key para OCR", "captura de pantalla a
  texto", o pida procesar imágenes/escaneos para análisis con LLMs sin
  usar un servicio externo. Auto-activa para cualquier flujo imagen/PDF
  escaneado → texto: OCR simple, batch, o como alternativa local al OCR
  de markitdown-skill cuando no hay LLM client disponible.
---

Tesseract OCR image. Claude write text. Terse output. No fluff.

---

## Context Intake — ALWAYS run this first

**Before running OCR on anything, collect context.** No exceptions. Not one
extraction runs without knowing the source, the language, and the output.

Scan the conversation for these signals and mark each as known or missing:

| Signal | What it tells you |
|--------|------------------|
| Local path (`docs/escaneos/grupo-03.png`, `C:\...`) | source file (+ its extension) |
| `.pdf` extension | needs rasterization first (`pdf2image`) — not direct OCR |
| `T_*.md` file | previous OCR output, may need re-run or fix |
| Language hint (Spanish text visible, "está en español") | `-l spa` vs `-l eng` vs `-l spa+eng` |
| "es una captura" / "escaneo de baja calidad" | may need `--psm`/`--oem` tuning, warn about accuracy |
| Existing `tesseract` binary / `pytesseract` install | skip install step |
| "no tengo API key" / mención de `markitdown-ocr` sin key | confirms tesseract-skill as the local no-LLM path |

---

### Step 1 — Ask for what's missing (one question at a time)

Work through this priority order. Stop after the first unanswered question.

#### Priority 1 — The source (always mandatory)

If you don't have a readable source file yet, ask:

> ¿Qué imagen o PDF querés procesar con OCR? Pasame la ruta local (ej:
> `docs/escaneos/grupo-03.png`).
>
> Formatos soportados directo: PNG, JPEG, TIFF, BMP, GIF, WebP. PDF
> escaneado: se rasteriza a imágenes primero (o usá `ocrmypdf` si el
> entregable debe seguir siendo PDF).

Verify before running: the path exists and is readable. If it's a PDF with
selectable text (not scanned), say so — that's a `markitdown-skill` job,
not OCR.

#### Priority 2 — The language

If not obvious from context, ask:

> ¿En qué idioma está el texto? (ej: `spa` español, `eng` inglés,
> `spa+eng` ambos). Nunca asumo un idioma por defecto.

Rule: always pass `-l` explicitly. Never silently default to `eng` on
non-English content.

#### Priority 3 — The output

If no output path was given, ask:

> ¿Dónde guardo el texto? Por defecto propongo `T_<NOMBRE>.md` junto al
> origen.
>
> Ej: `grupo-03.png` → `T_GRUPO_03.md`

Rules: outputs always follow `T_<NOMBRE>.md` (UPPER_SNAKE_CASE). Never
overwrite an existing `T_*.md` without asking.

#### Priority 4 — Dependencies

If `tesseract` may not be installed, or the language pack is missing, check:

> Reviso instalación: `tesseract --version` y `tesseract --list-langs`.
> Si falta el binario:
> - Windows: `winget install --id UB-Mannheim.TesseractOCR`
> - Debian/Ubuntu: `sudo apt install tesseract-ocr tesseract-ocr-spa`
> - macOS: `brew install tesseract tesseract-lang`
>
> Wrapper Python: `pip install pytesseract pillow pdf2image`
>
> Fuente local del motor: `Z:\Proyectos\tesseract`.

`pytesseract` alone is not enough — the `tesseract` system binary and the
language's `traineddata` must be installed separately.

#### Priority 5 — PDF rasterization (only if source is `.pdf`)

> Es un PDF escaneado. Necesito rasterizarlo a imágenes antes del OCR:
> `pip install pdf2image` (requiere `poppler` en el sistema). Alternativa
> si el entregable debe seguir siendo PDF: `pip install ocrmypdf` (agrega
> capa de texto sin cambiar el formato).

Never attempt to feed a `.pdf` straight to `tesseract`/`pytesseract.image_to_string` — it only reads raster images.

#### Priority 6 — PSM/OEM tuning (only if accuracy is a concern)

Ask only when the user reports garbled output or the image is a low-quality
scan/screenshot:

> Para mejorar precisión puedo ajustar:
> - `--oem 1` (solo motor LSTM, más preciso que el default `3`)
> - `--psm` según el layout: `6` bloque uniforme (default), `4` columna de
>   texto con tamaños variables, `11` texto disperso
>
> ¿Sabés el layout de la imagen, o pruebo con el default (`--oem 1 --psm 6`)?

---

### Step 2 — Confirm understanding before running OCR

```
CONTEXTO DETECTADO:
  ORIGEN:   <ruta + formato>
  IDIOMA:   <-l spa | eng | spa+eng>
  SALIDA:   T_<NOMBRE>.md en <carpeta>
  DEPS:     <tesseract + pytesseract ya instalado | falta instalar>
  RASTER:   <no aplica | pdf2image | ocrmypdf>
  PSM/OEM:  <default (--oem 1 --psm 6) | ajustado>
  MODO:     CLI de una | batch | Python API

¿Confirmas o corregís algo antes de correr OCR?
```

Wait for confirmation for batch/PDF work. Single-image CLI runs with
obvious language may proceed directly.

---

## File Naming Convention

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Texto OCR | `T_NOMBRE.md` | `T_GRUPO_03_ESCANEO.md` |
| Script OCR simple | `ocr_local.py` | `examples/ocr_local.py` |
| Script batch | `ocr_batch.py` | `examples/ocr_batch.py` |

Rules: `NOMBRE` = UPPER_SNAKE_CASE. Un `T_*.md` por imagen/PDF origen.
Nunca versionar el binario/imagen junto al texto salvo que el flujo del
curso lo pida.

---

## Stack

- Engine: Tesseract OCR (Google/HP, Apache-2.0) — binario de sistema,
  `tesseract --version`
- Wrapper: `pytesseract` (Apache-2.0) — `pip install pytesseract`
- Rasterización PDF: `pdf2image` (requiere `poppler`) o `ocrmypdf`
- Source: `Z:\Proyectos\tesseract` (clon local del motor) o binarios
  precompilados
- Downstream en este repo: `T_*.md` → `bdd-skill` (`/bdd:generate`)
- Relacionado: `markitdown-skill` (OCR vía LLM, requiere API key —
  tesseract-skill es la alternativa local sin key)

---

## Commands

| Trigger | Action |
|---------|--------|
| `/tesseract:ocr` | OCR single file (image or PDF) → `T_*.md` |
| `/tesseract:batch` | OCR folder → one `T_*.md` per file, skip failures with report |
| `/tesseract:check` | Verify binary + language install, no OCR run |

---

## Rules

Drop: "It looks like...", "I'd suggest...", "You might want to...".
Fragments OK. Technical terms exact.

**Output format (`/tesseract:ocr`):**

```
SOURCE: <path>
LANG: <spa|eng|spa+eng>
OUTPUT: T_<NOMBRE>.md (<n> lines, <n> chars)
PSM/OEM: <values used>
CONFIDENCE: <alta|media|baja — zonas ilegibles si las hay>
```

**Output format (`/tesseract:batch`):**

```
BATCH: <folder>
RESULT: ✅ OK <n> | ❌ FAIL <n> | ⏭ SKIP <n>
FAILURES (if any):
  ❌ <file> → <cause: unsupported format | unreadable | tesseract error>
```

**Output format (`/tesseract:check`):**

```
CHECK: <path>
READABLE: yes | no
FORMAT: <ext> → <direct OCR | needs rasterization | unsupported>
TESSERACT: <version|not installed>
LANGS: <installed list>
```

---

## CLI Reference

```bash
# Check install
tesseract --version
tesseract --list-langs

# Single image, plain text file
tesseract imagen.png salida -l spa

# stdout, multiple languages
tesseract imagen.png stdout -l spa+eng

# PSM/OEM tuning
tesseract imagen.png salida -l spa --oem 1 --psm 6

# Other output formats (configfile as extra arg)
tesseract imagen.png salida -l spa pdf     # PDF con texto embebido
tesseract imagen.png salida -l spa hocr    # HTML posicional
tesseract imagen.png salida -l spa tsv     # TSV con confianza por palabra

tesseract --help-extra
```

`outputbase` va sin extensión — tesseract agrega `.txt` (o la que
corresponda al configfile pedido).

---

## Python API Patterns

### Basic — single image (no LLM, no key)

```python
import pytesseract
from PIL import Image

texto = pytesseract.image_to_string(Image.open("imagen.png"), lang="spa")
```

### Explicit config (PSM/OEM)

```python
import pytesseract
from PIL import Image

config = "--oem 1 --psm 6"
texto = pytesseract.image_to_string(Image.open("imagen.png"), lang="spa", config=config)
```

### Scanned PDF — rasterize first, then OCR each page

```python
import pytesseract
from pdf2image import convert_from_path  # requiere poppler

paginas = convert_from_path("escaneo.pdf", dpi=300)
texto = "\n\n".join(
    pytesseract.image_to_string(pagina, lang="spa") for pagina in paginas
)
```

### Confidence per word (detect low-quality zones)

```python
import pytesseract
from PIL import Image

datos = pytesseract.image_to_data(Image.open("imagen.png"), lang="spa", output_type=pytesseract.Output.DICT)
baja_confianza = [
    (palabra, conf) for palabra, conf in zip(datos["text"], datos["conf"])
    if palabra.strip() and int(conf) < 60
]
# reportar baja_confianza, no completar por adivinanza
```

### Searchable PDF output (keeps PDF format)

```bash
pip install ocrmypdf
ocrmypdf -l spa escaneo.pdf escaneo_ocr.pdf
```

---

## Security

- Motor 100% local — sin red, sin API keys, sin superficie de
  exfiltración de datos por el OCR en sí.
- `pytesseract` invoca el binario `tesseract` vía subprocess con la ruta
  del archivo como argumento — nunca construir esa ruta con input no
  sanitizado en contexto server-side (path traversal).
- Si se combina con post-proceso LLM sobre el texto OCR (limpieza,
  resumen), aplican las reglas de `markitdown-skill`: cliente provisto
  por el usuario, nunca hardcodear ni imprimir keys.

---

## Course Flow (aiquaa)

```
Imagen/PDF escaneado (docs/escaneos/grupo-NN-*.png)
  → /tesseract:ocr → T_GRUPO_NN_*.md
    → /bdd:generate (bdd-skill) → .feature + steps
      → /postman:generate (postman-newman-skill) → colección + environment
```

Usar tesseract-skill en vez de `markitdown-skill` (`markitdown-ocr`) cuando
no hay `OPENAI_API_KEY` disponible para el grupo. El `T_*.md` resultante es
input de análisis — nunca inventar contenido en zonas ilegibles, reportar
confianza baja en su lugar.

---

## Common Failures & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `tesseract: command not found` / `TesseractNotFoundError` | Binario no instalado o no en PATH | Instalar paquete de sistema (winget/apt/brew), reiniciar shell |
| `Failed loading language 'spa'` | Falta el traineddata del idioma | `apt install tesseract-ocr-spa` o copiar `.traineddata` a `tessdata/` |
| Salida vacía o basura en PDF | Se pasó el `.pdf` directo sin rasterizar | Usar `pdf2image`/`ocrmypdf`, nunca `.pdf` directo a tesseract |
| Texto salpicado de caracteres random | PSM incorrecto para el layout | Probar `--psm 4` (columnas) o `--psm 11` (texto disperso) |
| Baja precisión general | Imagen de baja resolución/contraste | Recomendar ≥300 DPI, escala de grises, binarizado antes del OCR |
| `pdf2image.exceptions.PDFInfoNotInstalledError` | Falta `poppler` en el sistema | Instalar poppler (`apt install poppler-utils`, `choco install poppler`) |

---

## Boundaries

Writes `T_*.md` outputs, OCR scripts, install commands.
Does NOT invent text in illegible regions — reports low confidence instead.
Does NOT feed a `.pdf` directly to tesseract without rasterizing first.
Does NOT require or handle API keys — that's `markitdown-skill`'s job.
Does NOT print, log, or commit any credentials if combined with LLM post-processing.
"stop tesseract" or "normal mode": revert to verbose style.
