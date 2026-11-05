# markitdown-skill — CLAUDE.md

## Project

Document-to-Markdown skill wrapping Microsoft MarkItDown for the aiquaa
automation course. Owned by aiquaa-labs. Upstream source cloned at
`C:\proyectos\markitdown` (packages: `markitdown`, `markitdown-mcp`,
`markitdown-ocr`, `markitdown-sample-plugin`).
Feeds `bdd-skill` (`M_*.md` → `.feature`) — never duplicate BDD/Postman
logic here, reference those skills instead.

## Structure

```
skills/markitdown/   ← main skill (context intake + conversion patterns)
examples/            ← convert_local.py, convert_batch.py, M_EJEMPLO_SALIDA.md
docs/                ← usage guide in Spanish
```

## File naming convention

- Converted Markdown: `M_<NOMBRE>.md` (NOMBRE UPPER_SNAKE_CASE)
- Scripts: `convert_local.py` (single), `convert_batch.py` (folder)
- One `M_*.md` per source document — never overwrite without asking

## Key rules

- Narrowest conversion call wins: `convert_local()` > `convert_stream()` >
  `convert()` — plain `convert()` handles URIs too, avoid with untrusted input.
- No LLM/OCR without a user-provided client — convert without it and report
  what was skipped (EXIF-only images, no OCR).
- Never hardcode, print, or commit API keys.
- Output mirrors the source — report garbled tables/values, never silently
  rewrite them.
- Extras installed per format (`[pdf]`, `[docx]`, …), `[all]` only when justified.
