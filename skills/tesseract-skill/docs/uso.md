# Guía de uso — tesseract-skill

## Instalación

El binario `tesseract` es un paquete de sistema, no una librería de Python.
`pytesseract` es solo el wrapper que lo invoca por subprocess.

```bash
# Windows (winget)
winget install --id UB-Mannheim.TesseractOCR

# Debian/Ubuntu
sudo apt install tesseract-ocr tesseract-ocr-spa

# macOS
brew install tesseract tesseract-lang
```

```bash
pip install pytesseract pillow pdf2image
```

Desde la fuente local (`Z:\Proyectos\tesseract`) — compilar el motor en sí
solo es necesario para desarrollo del engine, no para usar la skill:
ver `INSTALL.GIT.md` en el repo fuente.

Verificá con `tesseract --version` y `tesseract --list-langs`.

## PDF escaneado — paso previo obligatorio

Tesseract **no lee PDF directamente**, solo imágenes (PNG/JPEG/TIFF/BMP/…).
Para un PDF escaneado hay dos caminos:

1. **Rasterizar y luego OCR** (control total, usado por `ocr_local.py`):
   ```bash
   pip install pdf2image   # requiere poppler instalado en el sistema
   ```
   ```python
   from pdf2image import convert_from_path
   paginas = convert_from_path("escaneo.pdf", dpi=300)
   ```
2. **`ocrmypdf`** (produce un PDF con capa de texto embebida, wraps tesseract):
   ```bash
   pip install ocrmypdf
   ocrmypdf -l spa escaneo.pdf escaneo_ocr.pdf
   ```
   Usar cuando el entregable debe seguir siendo PDF (buscable), no Markdown.

## Uso típico en el curso

1. El docente entrega un escaneo o captura de requerimientos (imagen o PDF
   sin texto seleccionable) cuando no hay `OPENAI_API_KEY` para el OCR de
   `markitdown-skill`.
2. `/tesseract:check` — verifica binario + idioma instalado.
3. `/tesseract:ocr` — genera `T_GRUPO_NN_*.md` (texto plano extraído).
4. Revisá el `T_*.md`: si hay zonas ilegibles o baja confianza, avisá — no
   se completa por adivinanza.
5. `/bdd:generate` (skill `bdd`) — deriva `.feature` + steps desde el texto.
6. `/postman:generate` (skill `postman-newman`) — colección + environment
   desde los escenarios.

## Comandos

| Comando | Acción |
|---------|--------|
| `/tesseract:ocr` | OCR de un archivo (imagen o PDF) → `T_*.md` |
| `/tesseract:batch` | OCR de una carpeta → un `T_*.md` por archivo, con reporte de fallos |
| `/tesseract:check` | Verificar instalación y legibilidad, sin ejecutar OCR |

## CLI directo (sin skill)

```bash
tesseract imagen.png salida -l spa
tesseract imagen.png stdout -l spa+eng --psm 6
tesseract --list-langs
tesseract --help-extra
```

`outputbase` sin extensión — tesseract agrega `.txt` (o el formato pedido
con configfiles: `pdf`, `hocr`, `tsv`, `alto`, `txt`).

## Idiomas

Explícito siempre, nunca por defecto silencioso:

```bash
tesseract imagen.png salida -l spa      # solo español
tesseract imagen.png salida -l spa+eng  # español + inglés
```

Listar instalados: `tesseract --list-langs`. Si falta el idioma, instalar
el paquete `tesseract-ocr-<lang>` (Linux) o el traineddata correspondiente
en `tessdata/` (Windows/macOS).

## PSM / OEM (calidad de reconocimiento)

- `--psm` (page segmentation mode): `6` = bloque de texto uniforme (default
  razonable para capturas/escaneos de página completa), `4` = columna
  única de texto de tamaños variables, `11` = texto disperso.
- `--oem` (OCR engine mode): `3` = default (LSTM + legacy si está
  disponible), `1` = solo LSTM (recomendado, más preciso).

```bash
tesseract escaneo.png salida -l spa --oem 1 --psm 6
```

## Seguridad

Tesseract corre localmente, sin red ni API keys — no hay superficie de
exfiltración de datos. Al combinarlo con post-proceso LLM (limpieza de
texto OCR, por ejemplo), aplican las mismas reglas que `markitdown-skill`:
nunca hardcodear keys, cliente provisto por el usuario.

→ Contrato BDD: skill `bdd` · Colecciones API: skill `postman-newman` ·
OCR con LLM (fallback con API key): skill `markitdown`.
