"""Convertir un archivo a Markdown con MarkItDown → M_<NOMBRE>.md.

Uso:
    python convert_local.py <origen> [-o SALIDA.md] [--extremo-local]

Por defecto usa convert_local() (solo archivos locales, sin fetch de URIs).
Requiere: pip install 'markitdown[all]' (o el extra del formato).
"""

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Documento → M_*.md con MarkItDown")
    parser.add_argument("origen", help="Ruta del archivo a convertir")
    parser.add_argument("-o", "--salida", default=None, help="Archivo .md destino (defecto: M_<STEM>.md)")
    parser.add_argument(
        "--permitir-uri",
        action="store_true",
        help="Usar convert() permisivo (local+remoto). Solo con fuentes confiables.",
    )
    args = parser.parse_args()

    try:
        from markitdown import MarkItDown
    except ImportError:
        print("ERROR: markitdown no instalado. pip install 'markitdown[all]'", file=sys.stderr)
        return 1

    origen = Path(args.origen)
    if not origen.is_file():
        print(f"ERROR: no existe o no es legible: {origen}", file=sys.stderr)
        return 1

    salida = Path(args.salida) if args.salida else origen.parent / f"M_{origen.stem.upper().replace(' ', '_').replace('-', '_')}.md"
    if salida.exists():
        print(f"ERROR: ya existe {salida}. Pasá -o con otro nombre.", file=sys.stderr)
        return 1

    md = MarkItDown(enable_plugins=False)
    if args.permitir_uri:
        result = md.convert(str(origen))
    else:
        result = md.convert_local(str(origen))

    salida.write_text(result.text_content, encoding="utf-8")
    lineas = result.text_content.count("\n") + 1
    print(f"OK: {origen} -> {salida} ({lineas} lineas, {len(result.text_content)} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
