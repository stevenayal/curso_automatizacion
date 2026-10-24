# Guía de uso — markitdown-skill

## Instalación

```bash
pip install 'markitdown[all]'
```

Solo el formato que necesitás:

```bash
pip install 'markitdown[pdf,docx,pptx]'
```

Desde la fuente local (`C:\proyectos\markitdown`):

```bash
pip install -e C:\proyectos\markitdown\packages\markitdown[all]
```

Requiere Python 3.10+. Verificá con `markitdown --version`.

## Uso típico en el curso

1. El docente entrega el PDF de requerimientos del grupo (`docs/requerimientos/grupo-NN-*.pdf`).
2. `/markitdown:check` — verifica instalación y que el archivo sea legible.
3. `/markitdown:convert` — genera `M_GRUPO_NN_*.md` (mismo texto, estructura Markdown: headings, listas, tablas).
4. Revisá el `M_*.md`: si hay tablas rotas o valores dudosos, avisá — no se corrigen en silencio.
5. `/bdd:generate` (skill `bdd`) — deriva `.feature` + steps desde el Markdown.
6. `/postman:generate` (skill `postman-newman`) — colección + environment desde los escenarios.

## Comandos

| Comando | Acción |
|---------|--------|
| `/markitdown:convert` | Convertir un archivo → `M_*.md` |
| `/markitdown:batch` | Convertir una carpeta → un `M_*.md` por archivo, con reporte de fallos |
| `/markitdown:check` | Verificar instalación y legibilidad, sin convertir |

## CLI directo (sin skill)

```bash
markitdown entrada.pdf -o M_ENTRADA.md
cat entrada.pdf | markitdown
markitdown --list-plugins
```

## OCR y descripciones de imágenes

Solo con cliente LLM provisto por vos (ej: `OPENAI_API_KEY` en tu entorno):

```bash
pip install markitdown-ocr
```

```python
from markitdown import MarkItDown
from openai import OpenAI

md = MarkItDown(enable_plugins=True, llm_client=OpenAI(), llm_model="gpt-4o")
print(md.convert("escaneado.pdf").text_content)
```

Sin cliente, la conversión igual corre: imágenes con solo metadata y sin OCR (se informa en `SKIPPED`).

## Alternativa MCP

Si tu host de agentes soporta MCP, el repo fuente trae `packages/markitdown-mcp`
(servidor MCP con la conversión como herramienta). Mismas reglas: salidas
`M_*.md`, sin keys hardcodeadas, entradas sanitizadas.

## Seguridad

MarkItDown hace I/O con los permisos del proceso actual. Con entradas no
confiables: restringí rutas y esquemas de URL, y usá `convert_local()` /
`convert_stream()` en vez de `convert()`.

→ Contrato BDD: skill `bdd` · Colecciones API: skill `postman-newman`.
