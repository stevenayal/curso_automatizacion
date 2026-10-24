"""OCR de una carpeta completa con Tesseract → un T_*.md por archivo.

Uso:
    python ocr_batch.py <carpeta> -l spa [-o SALIDA_DIR] [--ext EXT ...]

Solo procesa imágenes directamente (PNG/JPEG/TIFF/BMP/GIF/WebP). Los PDF
se omiten y se reportan como SKIP — usar ocr_local.py para PDF (rasteriza
antes del OCR). Omite salidas T_*.md que ya existan (no pisa sin --forzar).
Requiere: tesseract (binario de sistema) + pip install pytesseract pillow
"""

import argparse
import sys
from pathlib import Path

IMAGENES = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif", ".webp"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch imagen → T_*.md con Tesseract OCR")
    parser.add_argument("carpeta", help="Carpeta con imágenes")
    parser.add_argument("-l", "--lang", required=True, help="Idioma tesseract (ej: spa, eng, spa+eng)")
    parser.add_argument("-o", "--salida", default=None, help="Carpeta destino (defecto: misma carpeta)")
    parser.add_argument("--ext", nargs="*", default=None, help="Extensiones a incluir (ej: --ext .png .jpg)")
    parser.add_argument("--oem", default="1", help="OCR engine mode (defecto: 1)")
    parser.add_argument("--psm", default="6", help="Page segmentation mode (defecto: 6)")
    parser.add_argument("--forzar", action="store_true", help="Sobrescribir T_*.md existentes")
    args = parser.parse_args()

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        print("ERROR: dependencias faltantes. pip install pytesseract pillow", file=sys.stderr)
        return 1

    carpeta = Path(args.carpeta)
    if not carpeta.is_dir():
        print(f"ERROR: no es carpeta legible: {carpeta}", file=sys.stderr)
        return 1

    destino = Path(args.salida) if args.salida else carpeta
    destino.mkdir(parents=True, exist_ok=True)
    exts = {e.lower() if e.startswith(".") else f".{e.lower()}" for e in args.ext} if args.ext else IMAGENES
    config = f"--oem {args.oem} --psm {args.psm}"

    ok, fail, skip = 0, [], 0

    for archivo in sorted(carpeta.iterdir()):
        if not archivo.is_file():
            continue
        if archivo.suffix.lower() == ".pdf":
            skip += 1
            print(f"SKIP: {archivo.name} -> PDF, usar ocr_local.py")
            continue
        if archivo.suffix.lower() not in exts:
            continue
        nombre = archivo.stem.upper().replace(" ", "_").replace("-", "_")
        salida = destino / f"T_{nombre}.md"
        if salida.exists() and not args.forzar:
            skip += 1
            continue
        try:
            texto = pytesseract.image_to_string(Image.open(archivo), lang=args.lang, config=config)
            salida.write_text(texto, encoding="utf-8")
            ok += 1
            print(f"OK: {archivo.name} -> {salida.name}")
        except Exception as exc:  # noqa: BLE001 — se reporta, no se interrumpe el batch
            fail.append((archivo.name, str(exc)))
            print(f"FAIL: {archivo.name} -> {exc}", file=sys.stderr)

    print(f"RESULT: OK {ok} | FAIL {len(fail)} | SKIP {skip}")
    for nombre, causa in fail:
        print(f"  - {nombre}: {causa}")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
