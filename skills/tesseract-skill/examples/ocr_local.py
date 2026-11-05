"""OCR de una imagen o PDF escaneado con Tesseract → T_<NOMBRE>.md.

Uso:
    python ocr_local.py <origen> -l spa [-o SALIDA.md] [--oem 1] [--psm 6]

PDF: se rasteriza página por página con pdf2image (requiere poppler) antes
del OCR — tesseract no lee PDF directamente.
Requiere: tesseract (binario de sistema) + pip install pytesseract pillow pdf2image
"""

import argparse
import sys
from pathlib import Path

IMAGENES = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Imagen/PDF → T_*.md con Tesseract OCR")
    parser.add_argument("origen", help="Ruta del archivo a procesar")
    parser.add_argument("-l", "--lang", required=True, help="Idioma tesseract (ej: spa, eng, spa+eng)")
    parser.add_argument("-o", "--salida", default=None, help="Archivo .md destino (defecto: T_<STEM>.md)")
    parser.add_argument("--oem", default="1", help="OCR engine mode (defecto: 1, solo LSTM)")
    parser.add_argument("--psm", default="6", help="Page segmentation mode (defecto: 6, bloque uniforme)")
    parser.add_argument("--dpi", type=int, default=300, help="DPI de rasterizado para PDF (defecto: 300)")
    args = parser.parse_args()

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        print("ERROR: dependencias faltantes. pip install pytesseract pillow", file=sys.stderr)
        return 1

    origen = Path(args.origen)
    if not origen.is_file():
        print(f"ERROR: no existe o no es legible: {origen}", file=sys.stderr)
        return 1

    salida = args.salida
    if salida is None:
        nombre = origen.stem.upper().replace(" ", "_").replace("-", "_")
        salida = origen.parent / f"T_{nombre}.md"
    else:
        salida = Path(salida)
    if salida.exists():
        print(f"ERROR: ya existe {salida}. Pasá -o con otro nombre.", file=sys.stderr)
        return 1

    config = f"--oem {args.oem} --psm {args.psm}"

    try:
        if origen.suffix.lower() == ".pdf":
            try:
                from pdf2image import convert_from_path
            except ImportError:
                print("ERROR: PDF requiere pdf2image. pip install pdf2image (+ poppler)", file=sys.stderr)
                return 1
            paginas = convert_from_path(str(origen), dpi=args.dpi)
            textos = [
                pytesseract.image_to_string(pagina, lang=args.lang, config=config)
                for pagina in paginas
            ]
            texto = "\n\n---\n\n".join(textos)
        elif origen.suffix.lower() in IMAGENES:
            texto = pytesseract.image_to_string(Image.open(origen), lang=args.lang, config=config)
        else:
            print(f"ERROR: formato no soportado: {origen.suffix}", file=sys.stderr)
            return 1
    except pytesseract.TesseractNotFoundError:
        print("ERROR: binario tesseract no instalado o no en PATH.", file=sys.stderr)
        return 1

    salida.write_text(texto, encoding="utf-8")
    lineas = texto.count("\n") + 1
    print(f"OK: {origen} -> {salida} ({lineas} lineas, {len(texto)} chars) [lang={args.lang}, {config}]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
