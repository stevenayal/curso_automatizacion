"""
bdd_report.py v1 — Generador de reporte PDF para resultados de Cucumber (.json)
Powered by skill bdd · aiquaa.com

Uso:
    python bdd_report.py --results results/cucumber-report.json
    python bdd_report.py --results results/cucumber-report.json \\
        --output INFORME_BDD_GRUPO_03.pdf \\
        --grupo "Grupo 3 — Pagos de Servicios" \\
        --author "Juan Pérez — juan@empresa.com" \\
        --repo-url "https://github.com/org/repo"

Entrada: el JSON formatter nativo de cucumber-js
  (cucumber.js → format: ['json:results/cucumber-report.json']).
Extrae: features, escenarios, pasos, duración, y comentarios "# criterio: <texto>"
sobre cada Scenario para armar la matriz de trazabilidad.
"""

import argparse
import json
import os
import re
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    HRFlowable, Image, KeepTogether, PageBreak, Paragraph, Preformatted,
    SimpleDocTemplate, Spacer, Table, TableStyle,
)

# ─── Paleta (misma familia que jmeter_report.py / playwright_report.py) ──────
BLACK       = colors.HexColor("#000000")
WHITE       = colors.HexColor("#FFFFFF")
NAVY        = colors.HexColor("#0D1B40")
GRAY_DARK   = colors.HexColor("#1A1A1A")
GRAY_MID    = colors.HexColor("#4A4A4A")
GRAY_LIGHT  = colors.HexColor("#F5F5F5")
GRAY_BORDER = colors.HexColor("#DDDDDD")
GREEN_PASS  = colors.HexColor("#16A34A")
RED_FAIL    = colors.HexColor("#DC2626")
AMBER_WARN  = colors.HexColor("#D97706")
BLUE_INFO   = colors.HexColor("#2563EB")
GREEN_BG    = colors.HexColor("#F0FDF4")
RED_BG      = colors.HexColor("#FEF2F2")
AMBER_BG    = colors.HexColor("#FFFBEB")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm

STATUS_COLOR = {
    "passed": GREEN_PASS,
    "failed": RED_FAIL,
    "pending": AMBER_WARN,
    "undefined": AMBER_WARN,
    "skipped": GRAY_MID,
}
STATUS_ICON = {
    "passed": "PASS",
    "failed": "FAIL",
    "pending": "PEND",
    "undefined": "UNDEF",
    "skipped": "SKIP",
}


def styles():
    return {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=24,
                                 textColor=WHITE, alignment=TA_CENTER, leading=28),
        "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=12,
                                    textColor=WHITE, alignment=TA_CENTER, leading=16),
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=15,
                              textColor=NAVY, spaceBefore=14, spaceAfter=6),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11,
                              textColor=GRAY_DARK, spaceBefore=8, spaceAfter=4),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5,
                                textColor=GRAY_DARK, leading=13, alignment=TA_LEFT),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8,
                                 textColor=GRAY_MID, leading=11),
        "mono": ParagraphStyle("mono", fontName="Courier", fontSize=8,
                                textColor=GRAY_DARK, leading=11),
    }


# ─── Criterios leídos del .feature ──────────────────────────────────────────
# cucumber-js deja de exportar los comentarios en el JSON a partir de la v10,
# así que los criterios se recuperan leyendo el archivo .feature referenciado
# por `uri`: se toma el último comentario "# criterio: <texto>" que precede a
# cada `Scenario`/`Scenario Outline`.
ID_TAG_RE = re.compile(r"^@[A-Z]+\d*-[A-Z0-9]+-\d+$")


def criterios_desde_feature(uri, _cache={}):
    """Mapea nombre de escenario → criterio documentado en el .feature."""
    if not uri:
        return {}
    if uri in _cache:
        return _cache[uri]

    mapping = {}
    try:
        with open(uri, "r", encoding="utf-8") as fh:
            pendiente = None
            for linea in fh:
                limpia = linea.strip()
                m = re.match(r"#\s*criterio:\s*(.+)", limpia, re.IGNORECASE)
                if m:
                    pendiente = m.group(1).strip()
                    continue
                if limpia.startswith("#"):
                    # un criterio puede continuar en las líneas de comentario siguientes
                    if pendiente:
                        cont = limpia.lstrip("#").strip()
                        if cont:
                            pendiente = f"{pendiente} {cont}"
                    continue
                if not limpia:
                    continue
                m = re.match(r"(?:Scenario|Escenario)(?:\s+Outline|\s+Template)?:\s*(.+)",
                             limpia, re.IGNORECASE)
                if m:
                    if pendiente:
                        mapping[m.group(1).strip()] = pendiente
                    pendiente = None
                elif not limpia.startswith("@"):
                    # cualquier otra línea corta el bloque de comentarios del escenario
                    pendiente = pendiente if limpia.startswith("Feature") else None
    except OSError:
        mapping = {}

    _cache[uri] = mapping
    return mapping


def id_escenario(tags):
    """Devuelve el tag que funciona como ID de escenario (ej. @G05-LOGIN-001)."""
    for t in tags:
        if t and ID_TAG_RE.match(t.replace("@", "@")):
            return t.lstrip("@")
    return None


def parse_results(path):
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    features = []
    totals = {"scenarios": 0, "passed": 0, "failed": 0, "pending": 0, "undefined": 0, "skipped": 0}
    trace = []  # (criterio, feature, escenario, status)

    for feat in raw:
        feat_name = feat.get("name", "(sin nombre)")
        feat_scenarios = []
        for el in feat.get("elements", []):
            if el.get("type") != "scenario":
                continue
            steps = el.get("steps", [])
            statuses = [s.get("result", {}).get("status", "skipped") for s in steps]
            if "failed" in statuses:
                status = "failed"
            elif "undefined" in statuses:
                status = "undefined"
            elif "pending" in statuses:
                status = "pending"
            elif all(s == "skipped" for s in statuses):
                status = "skipped"
            else:
                status = "passed"

            totals["scenarios"] += 1
            totals[status] = totals.get(status, 0) + 1

            failed_step = next((s for s in steps if s.get("result", {}).get("status") == "failed"), None)
            criterio = None
            for comment in el.get("comments", []) or []:
                m = re.search(r"criterio:\s*(.+)", comment.get("text", ""))
                if m:
                    criterio = m.group(1).strip()
            if not criterio:
                criterio = criterios_desde_feature(feat.get("uri")).get(el.get("name", ""))

            tags = [t.get("name") for t in el.get("tags", [])]
            escenario_id = id_escenario(tags)

            feat_scenarios.append({
                "name": el.get("name", "(sin nombre)"),
                "status": status,
                "tags": tags,
                "id": escenario_id,
                "criterio": criterio,
                "fail_step": failed_step.get("name") if failed_step else None,
                "fail_msg": (failed_step.get("result", {}).get("error_message", "") or "")[:400]
                            if failed_step else None,
            })
            trace.append((escenario_id or "—", criterio or "(sin criterio documentado)",
                          feat_name, el.get("name", ""), status))

        features.append({"name": feat_name, "scenarios": feat_scenarios})

    return features, totals, trace


# ─── Evidencia en disco ─────────────────────────────────────────────────────
# Los hooks BDD guardan cada evidencia como "<ID>-<PASSED|FAILED>-<timestamp>.<ext>":
# .png para los escenarios de interfaz, .json (última respuesta) para los de API.

EVIDENCIA_RE = re.compile(r"^(?P<id>.+?)-(?P<estado>PASSED|FAILED)-(?P<sello>.+)\.(?P<ext>png|jpg|jpeg|json)$")


def evidencias_por_id(directorio):
    """Mapea ID de escenario → lista de archivos de evidencia, del más reciente al más viejo."""
    mapping = {}
    if not directorio or not os.path.isdir(directorio):
        return mapping

    for nombre in sorted(os.listdir(directorio)):
        m = EVIDENCIA_RE.match(nombre)
        if not m:
            continue
        mapping.setdefault(m.group("id"), []).append({
            "path": os.path.join(directorio, nombre),
            "nombre": nombre,
            "estado": m.group("estado"),
            "ext": m.group("ext").lower(),
        })

    for archivos in mapping.values():
        archivos.sort(key=lambda a: a["nombre"], reverse=True)
    return mapping


def imagen_ajustada(path, ancho_max):
    """Devuelve un flowable Image escalado al ancho disponible, conservando la proporción."""
    ancho_px, alto_px = ImageReader(path).getSize()
    ancho = min(ancho_max, 150 * mm)
    alto = ancho * alto_px / float(ancho_px)
    alto_max = 165 * mm
    if alto > alto_max:
        ancho *= alto_max / alto
        alto = alto_max
    return Image(path, width=ancho, height=alto)


def resumen_json(path, limite=1400):
    """Texto compacto de una evidencia .json de API."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            datos = json.load(fh)
    except (OSError, ValueError):
        return None

    respuesta = datos.get("ultimaRespuesta", {})
    cuerpo = json.dumps(respuesta.get("body"), ensure_ascii=False, indent=2)
    if len(cuerpo) > limite:
        cuerpo = cuerpo[:limite] + "\n… (truncado)"
    return 'HTTP {}\n{}'.format(respuesta.get("status", "?"), cuerpo)


def veredicto(totals):
    if totals["failed"] > 0:
        return "CRITERIOS NO CUMPLIDOS", RED_FAIL, RED_BG
    if totals["undefined"] > 0 or totals["pending"] > 0:
        return "PARCIAL — HAY PASOS SIN IMPLEMENTAR", AMBER_WARN, AMBER_BG
    return "CRITERIOS CUMPLIDOS", GREEN_PASS, GREEN_BG


def build_pdf(output, features, totals, trace, args):
    st = styles()
    doc = SimpleDocTemplate(output, pagesize=A4,
                             topMargin=MARGIN, bottomMargin=MARGIN,
                             leftMargin=MARGIN, rightMargin=MARGIN)
    story = []

    # ── Portada ──
    cover = Table([[Paragraph("INFORME DE PRUEBAS BDD", st["title"])],
                    [Spacer(1, 4)],
                    [Paragraph(args.grupo or "Sin grupo especificado", st["subtitle"])]],
                   colWidths=[PAGE_W - 2 * MARGIN])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING", (0, 0), (-1, -1), 22),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 22),
    ]))
    story.append(cover)
    story.append(Spacer(1, 10 * mm))

    meta_rows = [
        ["Fecha", datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["Autor", args.author or "no proporcionado"],
        ["Repositorio", args.repo_url or "no proporcionado"],
        ["Escenarios", str(totals["scenarios"])],
    ]
    meta = Table(meta_rows, colWidths=[45 * mm, (PAGE_W - 2 * MARGIN - 45 * mm)])
    meta.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (-1, -1), GRAY_DARK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, GRAY_BORDER),
    ]))
    story.append(meta)
    story.append(Spacer(1, 8 * mm))

    # ── Resumen ──
    story.append(Paragraph("Resumen", st["h1"]))
    resumen_rows = [["Estado", "Cantidad"]]
    for key in ("passed", "failed", "undefined", "pending", "skipped"):
        if totals.get(key):
            resumen_rows.append([STATUS_ICON[key], str(totals[key])])
    resumen = Table(resumen_rows, colWidths=[60 * mm, 30 * mm])
    resumen.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_LIGHT),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("GRID", (0, 0), (-1, -1), 0.4, GRAY_BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(resumen)

    # ── Veredicto ──
    texto, color, bg = veredicto(totals)
    story.append(Spacer(1, 6 * mm))
    v = Table([[Paragraph(f"VEREDICTO: {texto}", ParagraphStyle(
        "v", fontName="Helvetica-Bold", fontSize=12, textColor=color, alignment=TA_CENTER))]],
        colWidths=[PAGE_W - 2 * MARGIN])
    v.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg),
                            ("TOPPADDING", (0, 0), (-1, -1), 10),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    story.append(v)

    # ── Matriz de trazabilidad ──
    story.append(PageBreak())
    story.append(Paragraph("Matriz de trazabilidad", st["h1"]))
    story.append(Paragraph(
        "ID → criterio de aceptación → escenario → resultado. El ID es el tag del escenario "
        "(ej. @G05-LOGIN-001) y da nombre a la evidencia; los criterios se toman de comentarios "
        '"# criterio: &lt;texto&gt;" sobre cada Scenario en el .feature.', st["small"]))
    story.append(Spacer(1, 3 * mm))
    trace_rows = [["ID", "Criterio", "Escenario", "Resultado"]]
    for escenario_id, criterio, feat_name, scen_name, status in trace:
        trace_rows.append([
            Paragraph(escenario_id, st["body"]),
            Paragraph(criterio, st["body"]),
            Paragraph(scen_name, st["body"]),
            Paragraph(STATUS_ICON.get(status, status), ParagraphStyle(
                "s", fontName="Helvetica-Bold", fontSize=9, textColor=STATUS_COLOR.get(status, GRAY_MID))),
        ])
    trace_table = Table(trace_rows, colWidths=[30 * mm, 58 * mm, 58 * mm, 18 * mm], repeatRows=1)
    trace_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_LIGHT),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, GRAY_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(trace_table)

    # ── Detalle por feature ──
    for feat in features:
        story.append(PageBreak())
        story.append(Paragraph(feat["name"], st["h1"]))
        for scen in feat["scenarios"]:
            color = STATUS_COLOR.get(scen["status"], GRAY_MID)
            block = [Paragraph(
                f'[{STATUS_ICON.get(scen["status"], scen["status"])}] {scen["name"]}',
                ParagraphStyle("sc", fontName="Helvetica-Bold", fontSize=10, textColor=color))]
            if scen["tags"]:
                block.append(Paragraph(" ".join(scen["tags"]), st["small"]))
            if scen["fail_step"]:
                block.append(Paragraph(f'Paso fallido: {scen["fail_step"]}', st["h2"]))
                block.append(Paragraph(scen["fail_msg"] or "", st["mono"]))
            story.append(KeepTogether(block))
            story.append(Spacer(1, 3 * mm))

    # ── Anexo: evidencia por escenario ──
    evidencias = evidencias_por_id(getattr(args, "evidence_dir", None))
    adjuntas = [(eid, nombre, status) for eid, _c, _f, nombre, status in trace if eid in evidencias]
    if adjuntas:
        ancho_util = PAGE_W - 2 * MARGIN
        story.append(PageBreak())
        story.append(Paragraph("Anexo — Evidencia por escenario", st["h1"]))
        story.append(Paragraph(
            "Cada escenario automatizado guarda su evidencia con el mismo ID que lleva como tag: "
            "captura de pantalla para los escenarios de interfaz, última respuesta HTTP para los "
            "de API. Se incluye el archivo más reciente de cada ID.", st["small"]))

        for escenario_id, scen_name, status in adjuntas:
            archivo = evidencias[escenario_id][0]
            color = STATUS_COLOR.get(status, GRAY_MID)
            bloque = [
                Paragraph(f"{escenario_id} — {scen_name}", ParagraphStyle(
                    "ev", fontName="Helvetica-Bold", fontSize=11, textColor=color,
                    spaceBefore=10, spaceAfter=2)),
                Paragraph(archivo["nombre"], st["small"]),
                Spacer(1, 2 * mm),
            ]

            if archivo["ext"] in ("png", "jpg", "jpeg"):
                try:
                    bloque.append(imagen_ajustada(archivo["path"], ancho_util))
                except Exception as exc:  # imagen corrupta o formato no soportado
                    bloque.append(Paragraph(f"No se pudo incrustar la imagen: {exc}", st["small"]))
            else:
                texto = resumen_json(archivo["path"])
                if texto:
                    # Preformatted conserva la indentación del JSON, que Paragraph colapsa.
                    bloque.append(Preformatted(texto, st["mono"]))
                else:
                    bloque.append(Paragraph("Evidencia no legible.", st["small"]))

            story.append(KeepTogether(bloque))
            story.append(Spacer(1, 4 * mm))

    doc.build(story)


def main():
    p = argparse.ArgumentParser(description="Genera INFORME_BDD_*.pdf desde el JSON de cucumber-js")
    p.add_argument("--results", required=True, help="Path al JSON de cucumber (format json:...)")
    p.add_argument("--output", default=None, help="Path del PDF de salida")
    p.add_argument("--grupo", default=None, help='Ej: "Grupo 3 — Pagos de Servicios"')
    p.add_argument("--author", default=None)
    p.add_argument("--repo-url", default=None)
    p.add_argument("--evidence-dir", default=None,
                   help="Carpeta con las evidencias <ID>-<PASSED|FAILED>-<sello>.<png|json>. "
                        "Por defecto, la carpeta del PDF de salida.")
    args = p.parse_args()

    if not os.path.exists(args.results):
        raise SystemExit(f"No se encontró {args.results}")

    output = args.output
    if not output:
        base = re.sub(r"[^A-Za-z0-9_]+", "_", (args.grupo or "BDD")).upper()
        output = f"INFORME_BDD_{base}.pdf"

    # Por defecto, la evidencia se busca junto al PDF generado.
    if not args.evidence_dir:
        args.evidence_dir = os.path.dirname(os.path.abspath(output))

    features, totals, trace = parse_results(args.results)
    build_pdf(output, features, totals, trace, args)
    print(f"Generado: {output}")
    print(f"Escenarios: {totals['scenarios']} — "
          f"passed={totals.get('passed',0)} failed={totals.get('failed',0)} "
          f"undefined={totals.get('undefined',0)} pending={totals.get('pending',0)}")


if __name__ == "__main__":
    main()
