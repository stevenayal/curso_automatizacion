# markitdown-skill

**Herramienta:** [MarkItDown](https://github.com/microsoft/markitdown) (Microsoft, MIT)
**Lenguaje:** Python 3.10+ (CLI + API) · alternativo MCP (`markitdown-mcp`)
**Reporte:** no aplica — la salida es el Markdown

Convierte PDF, Word, PowerPoint, Excel, imágenes, audio, HTML, CSV, JSON, XML,
ZIP, EPub y YouTube a Markdown token-eficiente para análisis con LLMs.
Pensada para el curso de automatización de aiquaa: el PDF de requerimientos de
cada grupo (1 a 10) se convierte a `M_*.md` y alimenta a `bdd-skill`
(`/bdd:generate`) y a `postman-newman-skill` (`/postman:generate`).

Fuente local: `C:\proyectos\markitdown`.

## Instalación

```bash
pip install 'markitdown[all]'
```

O desde la fuente local:

```bash
pip install -e C:\proyectos\markitdown\packages\markitdown[all]
```

## Comandos

| Comando | Acción |
|---------|--------|
| `/markitdown:convert` | Convertir un archivo → `M_*.md` |
| `/markitdown:batch` | Convertir una carpeta → un `M_*.md` por archivo |
| `/markitdown:check` | Verificar instalación y legibilidad, sin convertir |

## Salidas

`M_<NOMBRE>.md` · `convert_local.py` · `convert_batch.py`

## Uso rápido

```bash
markitdown docs/requerimientos/grupo-03-pagos-de-servicios.pdf -o M_GRUPO_03_PAGOS_DE_SERVICIOS.md
python examples/convert_local.py docs/requerimientos/grupo-03-pagos-de-servicios.pdf -o M_GRUPO_03_PAGOS_DE_SERVICIOS.md
```

→ [Documentación completa](./docs/uso.md) · [BDD](../bdd-skill) · [Postman/Newman](../postman-newman-skill)

## Licencia

MIT (skill). MarkItDown upstream: MIT © Microsoft.
