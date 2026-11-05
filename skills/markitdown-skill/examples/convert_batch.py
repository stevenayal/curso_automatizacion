"""Convertir una carpeta completa a Markdown → un M_*.md por archivo.

Uso:
    python convert_batch.py <carpeta> [-o SALIDA_DIR] [--ext EXT ...]

Omite subcarpetas de salida que ya contengan el M_*.md (no pisa sin --forzar).
Reporta OK/FAIL/SKIP al final. Requiere: pip install 'markitdown[all]'.
"""

import argparse
import sys
from pathlib import Path

SOPORTADAS = {".pdf", ".docx", ".pptx", ".xlsx", ".xls", ".html", ".csv", ".json", ".xml", ".zip", ".epub", ".msg"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch documento → M_*.md con MarkItDown")
    parser.add_argument("carpeta", help="Carpeta con documentos")
    parser.add_argument("-o", "--salida", default=None, help="Carpeta destino (defecto: misma carpeta)")
    parser.add_argument("--ext", nargs="*", default=None, help="Extensiones a incluir (ej: --ext .pdf .docx)")
    parser.add_argument("--forzar", action="store_true", help="Sobrescribir M_*.md existentes")
    args = parser.parse_args()

    try:
        from markitdown import MarkItDown
    except ImportError:
        print("ERROR: markitdown no instalado. pip install 'markitdown[all]'", file=sys.stderr)
        return 1

    carpeta = Path(args.carpeta)
    if not carpeta.is_dir():
        print(f"ERROR: no es carpeta legible: {carpeta}", file=sys.stderr)
        return 1

    destino = Path(args.salida) if args.salida else carpeta
    destino.mkdir(parents=True, exist_ok=True)
    exts = {e.lower() if e.startswith(".") else f".{e.lower()}" for e in args.ext} if args.ext else SOPORTADAS

    md = MarkItDown(enable_plugins=False)
    ok, fail, skip = 0, [], 0

    for archivo in sorted(carpeta.iterdir()):
        if not archivo.is_file() or archivo.suffix.lower() not in exts:
            continue
        salida = destino / f"M_{archivo.stem.upper().replace(' ', '_').replace('-', '_')}.md"
        if salida.exists() and not args.forzar:
            skip += 1
            continue
        try:
            texto = md.convert_local(str(archivo)).text_content
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
