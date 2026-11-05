# tesseract-skill — CLAUDE.md

## Project

OCR (imagen/PDF escaneado → texto) skill wrapping Tesseract OCR (Google/HP,
Apache-2.0) para el curso de automatización de aiquaa. Owned by aiquaa-labs.
Upstream source cloned at `Z:\Proyectos\tesseract` (motor `libtesseract` +
CLI `tesseract`). Wrapper Python: `pytesseract`.

Alternativa **local y sin LLM** al OCR de `markitdown-skill`
(`markitdown-ocr` requiere `llm_client` + API key). Usar tesseract-skill
cuando no hay API key disponible o se necesita OCR offline.
Feeds `bdd-skill` (`T_*.md` → `.feature`) — never duplicate BDD/Postman
logic here, reference those skills instead.

## Structure

```
skills/tesseract/    ← main skill (context intake + OCR patterns)
examples/            ← ocr_local.py, ocr_batch.py, T_EJEMPLO_SALIDA.md
docs/                ← usage guide in Spanish
```

## File naming convention

- Texto OCR: `T_<NOMBRE>.md` (NOMBRE UPPER_SNAKE_CASE)
- Scripts: `ocr_local.py` (single), `ocr_batch.py` (folder)
- One `T_*.md` per source image/PDF — never overwrite without asking

## Key rules

- Tesseract solo lee imágenes (PNG/JPEG/TIFF/BMP/…), nunca PDF directo — un
  PDF escaneado se rasteriza a imágenes primero (`pdf2image`/poppler) o se
  usa `ocrmypdf` (wraps tesseract) para producir PDF con texto embebido.
- Idioma explícito siempre: `-l spa`, `-l eng`, `-l spa+eng` — nunca asumir,
  preguntar si no es obvio por el contenido.
- `tesseract` (binario del sistema) y el `traineddata` del idioma deben
  estar instalados aparte de `pytesseract` (que es solo el wrapper Python).
- No inventar texto en zonas ilegibles — reportar confianza baja / texto
  vacío, nunca completar por adivinanza.
- Nunca hardcodear, imprimir ni commitear API keys (no aplica motor local,
  pero sí si se combina con post-proceso LLM).
