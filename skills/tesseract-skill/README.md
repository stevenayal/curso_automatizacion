# tesseract-skill

**Herramienta:** [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (Google/HP, Apache-2.0) · wrapper Python [`pytesseract`](https://github.com/madmaze/pytesseract)
**Lenguaje:** C++ (motor + CLI) · Python 3.8+ (wrapper)
**Reporte:** no aplica — la salida es el texto/Markdown OCR

Extrae texto de imágenes (PNG, JPEG, TIFF, BMP, GIF, WebP) y PDFs escaneados
mediante reconocimiento óptico de caracteres (OCR), **100% local, sin API
key ni LLM**. Soporta más de 100 idiomas "out of the box" (`spa`, `eng`,
`spa+eng`, …).

Pensada para el curso de automatización de aiquaa como alternativa al OCR
de `markitdown-skill` cuando no hay `OPENAI_API_KEY` disponible: escaneos o
capturas de requerimientos se convierten a `T_*.md` y alimentan a
`bdd-skill` (`/bdd:generate`) y a `postman-newman-skill` (`/postman:generate`).

Fuente local: `Z:\Proyectos\tesseract`.

## Instalación

Binario del sistema (obligatorio, no lo instala pip):

```bash
# Windows (winget)
winget install --id UB-Mannheim.TesseractOCR

# Debian/Ubuntu
sudo apt install tesseract-ocr tesseract-ocr-spa

# macOS
brew install tesseract tesseract-lang
```

Wrapper Python:

```bash
pip install pytesseract pillow pdf2image
```

## Comandos

| Comando | Acción |
|---------|--------|
| `/tesseract:ocr` | OCR de una imagen/PDF → `T_*.md` |
| `/tesseract:batch` | OCR de una carpeta → un `T_*.md` por archivo |
| `/tesseract:check` | Verificar instalación (binario + idiomas), sin ejecutar OCR |

## Salidas

`T_<NOMBRE>.md` · `ocr_local.py` · `ocr_batch.py`

## Uso rápido

```bash
tesseract escaneo.png T_ESCANEO -l spa
python examples/ocr_local.py escaneo.png -o T_ESCANEO.md -l spa
```

→ [Documentación completa](./docs/uso.md) · [MarkItDown](../markitdown-skill) · [BDD](../bdd-skill) · [Postman/Newman](../postman-newman-skill)

## Licencia

MIT (skill). Tesseract OCR upstream: Apache-2.0 © Google/HP. `pytesseract`: Apache-2.0.
