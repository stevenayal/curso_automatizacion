"""
playwright_report.py v1 — Reporte PDF ejecutivo para resultados de Playwright
Powered by skill playwright · aiquaa.com

Uso:
    python playwright_report.py --results results/playwright-results.json
    python playwright_report.py --results results/playwright-results.json \\
        --output INFORME_E2E_PORTAL.pdf \\
        --app-name "Portal de Clientes" \\
        --environment "QA" \\
        --app-version "v2.1.0" \\
        --repo-url "https://dev.azure.com/org/repo" \\
        --author "Juan Pérez — juan@empresa.com"
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
from reportlab.platypus import (
    HRFlowable, Image, KeepTogether, PageBreak, Paragraph,
    SimpleDocTemplate, Spacer, Table, TableStyle,
)

# ─── Paleta ───────────────────────────────────────────────────────────────────
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
BLUE_BG     = colors.HexColor("#EFF6FF")

PAGE_W, PAGE_H = A4
MARGIN   = 18 * mm
HEADER_H = 16 * mm
FOOTER_H = 14 * mm
ANSI_ESCAPE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")


# ─── Estilos ──────────────────────────────────────────────────────────────────
def build_styles():
    return {
        "title": ParagraphStyle("title",
            fontName="Helvetica-Bold", fontSize=22,
            textColor=GRAY_DARK, leading=28),
        "subtitle": ParagraphStyle("subtitle",
            fontName="Helvetica", fontSize=11,
            textColor=GRAY_MID, leading=16),
        "section": ParagraphStyle("section",
            fontName="Helvetica-Bold", fontSize=13,
            textColor=GRAY_DARK, leading=18, spaceBefore=10),
        "subsection": ParagraphStyle("subsection",
            fontName="Helvetica-Bold", fontSize=10,
            textColor=GRAY_MID, leading=14, spaceBefore=6),
        "body": ParagraphStyle("body",
            fontName="Helvetica", fontSize=9,
            textColor=GRAY_DARK, leading=13),
        "code": ParagraphStyle("code",
            fontName="Courier", fontSize=8,
            textColor=GRAY_DARK, leading=11,
            backColor=GRAY_LIGHT, leftIndent=6),
        "label": ParagraphStyle("label",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=GRAY_MID, leading=11, spaceAfter=2, spaceBefore=6),
        "stat_num": ParagraphStyle("stat_num",
            fontName="Helvetica-Bold", fontSize=20,
            textColor=GRAY_DARK, leading=24, alignment=TA_CENTER),
        "stat_label": ParagraphStyle("stat_label",
            fontName="Helvetica", fontSize=9,
            textColor=GRAY_MID, leading=12, alignment=TA_CENTER),
        "cover_meta_key": ParagraphStyle("cover_meta_key",
            fontName="Helvetica-Bold", fontSize=9,
            textColor=GRAY_MID, leading=14),
        "cover_meta_val": ParagraphStyle("cover_meta_val",
            fontName="Helvetica", fontSize=10,
            textColor=GRAY_DARK, leading=14),
        "verdict_pass": ParagraphStyle("verdict_pass",
            fontName="Helvetica-Bold", fontSize=14,
            textColor=GREEN_PASS, alignment=TA_CENTER, leading=20),
        "verdict_warn": ParagraphStyle("verdict_warn",
            fontName="Helvetica-Bold", fontSize=14,
            textColor=AMBER_WARN, alignment=TA_CENTER, leading=20),
        "verdict_fail": ParagraphStyle("verdict_fail",
            fontName="Helvetica-Bold", fontSize=14,
            textColor=RED_FAIL, alignment=TA_CENTER, leading=20),
        "test_pass": ParagraphStyle("test_pass",
            fontName="Helvetica", fontSize=9,
            textColor=GREEN_PASS, leading=13),
        "test_fail": ParagraphStyle("test_fail",
            fontName="Helvetica-Bold", fontSize=9,
            textColor=RED_FAIL, leading=13),
        "test_skip": ParagraphStyle("test_skip",
            fontName="Helvetica", fontSize=9,
            textColor=AMBER_WARN, leading=13),
        "error_msg": ParagraphStyle("error_msg",
            fontName="Courier", fontSize=8,
            textColor=RED_FAIL, leading=11,
            backColor=RED_BG, leftIndent=8),
    }


# ─── Canvas header/footer ─────────────────────────────────────────────────────
class ReportCanvas:
    def __init__(self, author=None, environment=None):
        self.author      = author
        self.environment = environment

    def __call__(self, canvas, doc):
        canvas.saveState()
        w, h = A4

        canvas.setStrokeColor(GRAY_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, h - HEADER_H, w - MARGIN, h - HEADER_H)
        canvas.line(MARGIN, FOOTER_H, w - MARGIN, FOOTER_H)

        if doc.page > 1 and self.environment:
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(GRAY_MID)
            canvas.drawString(MARGIN, h - HEADER_H + 4 * mm,
                              f"Ambiente: {self.environment}")

        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(NAVY)
        footer_left = (
            f"Automatización: {self.author}  |  Powered by skill playwright · aiquaa.com"
            if self.author else "Powered by skill playwright · https://aiquaa.com/"
        )
        canvas.drawString(MARGIN, FOOTER_H - 5 * mm, footer_left)
        canvas.setFillColor(GRAY_MID)
        canvas.drawRightString(w - MARGIN, FOOTER_H - 5 * mm, f"Pág. {doc.page}")
        canvas.restoreState()


# ─── Parser JSON de Playwright ────────────────────────────────────────────────
def parse_results(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    total = passed = failed = skipped = duration_ms = 0
    suites_detail = []
    all_failures   = []
    evidences      = []

    def visit_suites(suites):
        nonlocal total, passed, failed, skipped, duration_ms

        for suite in suites:
            visit_suites(suite.get("suites", []))
            if not suite.get("specs"):
                continue

            suite_name   = suite.get("title", "Sin nombre")
            s_pass = s_fail = s_skip = 0

            for spec in suite.get("specs", []):
                for result in spec.get("tests", [spec]):
                    status = result.get("status", result.get("outcome", "unknown"))
                    attempts = result.get("results", [])
                    duration_ms += result.get("duration", sum(a.get("duration", 0) for a in attempts))
                    total += 1

                    if status in ("passed", "expected"):
                        passed += 1
                        s_pass += 1
                        screenshots = [
                            attachment.get("path")
                            for attempt in attempts
                            for attachment in attempt.get("attachments", [])
                            if attachment.get("contentType") == "image/png"
                            and attachment.get("path")
                            and os.path.exists(attachment["path"])
                        ]
                        if screenshots:
                            evidences.append({
                                "suite": suite_name,
                                "title": result.get("title", spec.get("title", "?")),
                                "path": screenshots[-1],
                            })
                    elif status in ("failed", "unexpected"):
                        failed += 1
                        s_fail += 1
                        error_msg = ""
                        for attempt in attempts:
                            for err in attempt.get("errors", []):
                                error_msg = ANSI_ESCAPE.sub("", err.get("message", ""))[:300]
                                break
                        all_failures.append({
                            "suite": suite_name,
                            "title": result.get("title", spec.get("title", "?")),
                            "file":  spec.get("file", ""),
                            "line":  spec.get("line", ""),
                            "error": error_msg,
                        })
                    elif status in ("skipped", "pending"):
                        skipped += 1
                        s_skip += 1

            suites_detail.append({
                "name":    suite_name,
                "passed":  s_pass,
                "failed":  s_fail,
                "skipped": s_skip,
                "total":   s_pass + s_fail + s_skip,
            })

    visit_suites(data.get("suites", []))

    pass_rate = round(passed / total * 100, 1) if total > 0 else 0

    return {
        "total":        total,
        "passed":       passed,
        "failed":       failed,
        "skipped":      skipped,
        "pass_rate":    pass_rate,
        "duration_ms":  duration_ms,
        "duration_s":   round(duration_ms / 1000, 1),
        "suites":       suites_detail,
        "failures":     all_failures,
        "evidences":    evidences,
        "timestamp":    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


# ─── Veredicto ────────────────────────────────────────────────────────────────
def get_verdict(stats: dict):
    if stats["failed"] == 0:
        return "SUITE VERDE — TODOS LOS TESTS PASARON", "pass"
    elif stats["pass_rate"] >= 85:
        return "FALLOS MENORES — REVISAR ANTES DEL RELEASE", "warn"
    else:
        return "REGRESIÓN CRÍTICA — BLOQUEA EL RELEASE", "fail"


# ─── Portada ──────────────────────────────────────────────────────────────────
def build_cover(stats, styles, app_name, environment,
                app_version=None, repo_url=None, author=None):
    story = []
    w_content = PAGE_W - 2 * MARGIN

    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Informe Ejecutivo de Automatización E2E", styles["title"]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        f'<font color="#4A4A4A">{app_name}</font>', styles["subtitle"]))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_BORDER))
    story.append(Spacer(1, 6 * mm))

    # ── Estadísticas principales ──────────────────────────────────────────────
    stat_col = w_content / 4

    def stat_cell(num, label, col=GRAY_DARK):
        return [
            Paragraph(f'<font color="{col.hexval()}">{num}</font>', styles["stat_num"]),
            Paragraph(label, styles["stat_label"]),
        ]

    stat_table = Table(
        [[
            stat_cell(stats["total"],   "Tests totales"),
            stat_cell(stats["passed"],  "Pasaron", GREEN_PASS),
            stat_cell(stats["failed"],  "Fallaron",
                      RED_FAIL if stats["failed"] > 0 else GRAY_DARK),
            stat_cell(f'{stats["pass_rate"]}%', "Tasa de éxito",
                      GREEN_PASS if stats["pass_rate"] >= 95 else
                      AMBER_WARN if stats["pass_rate"] >= 85 else RED_FAIL),
        ]],
        colWidths=[stat_col] * 4,
        style=TableStyle([
            ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("BACKGROUND",    (0, 0), (-1, -1), GRAY_LIGHT),
            ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_BORDER),
            ("INNERGRID",     (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ])
    )
    story.append(stat_table)
    story.append(Spacer(1, 6 * mm))

    # ── Veredicto ─────────────────────────────────────────────────────────────
    verdict_text, verdict_type = get_verdict(stats)
    verdict_style = {
        "pass": styles["verdict_pass"],
        "warn": styles["verdict_warn"],
        "fail": styles["verdict_fail"],
    }[verdict_type]
    verdict_bg = {"pass": GREEN_BG, "warn": AMBER_BG, "fail": RED_BG}[verdict_type]

    verdict_table = Table(
        [[Paragraph(verdict_text, verdict_style)]],
        colWidths=[w_content],
        style=TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), verdict_bg),
            ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_BORDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(verdict_table)
    story.append(Spacer(1, 6 * mm))

    # ── Metadata ──────────────────────────────────────────────────────────────
    meta = [
        ["Fecha / hora",  stats["timestamp"]],
        ["Ambiente",      environment or "No especificado"],
        ["Duración total", f"{stats['duration_s']} seg"],
        ["Tests omitidos", str(stats["skipped"])],
    ]
    if app_version:
        meta.insert(2, ["Versión / release", app_version])
    if repo_url:
        meta.append(["Repositorio",
                      f'<font color="#0D1B40"><u>{repo_url}</u></font>'])

    meta_table = Table(
        [[Paragraph(r[0], styles["cover_meta_key"]),
          Paragraph(r[1], styles["cover_meta_val"])] for r in meta],
        colWidths=[42 * mm, w_content - 42 * mm],
        style=TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW",     (0, 0), (-1, -2), 0.3, GRAY_BORDER),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="100%", thickness=0.3, color=GRAY_BORDER))
    story.append(Spacer(1, 3 * mm))

    credit_lines = [
        'Powered by skill <font color="#0D1B40"><b>playwright</b></font>'
        ' · <font color="#0D1B40"><u>https://aiquaa.com/</u></font>'
    ]
    if author:
        credit_lines.append(
            f'Automatización realizada por: <font color="#0D1B40"><b>{author}</b></font>'
        )
    story.append(Paragraph("<br/>".join(credit_lines),
        ParagraphStyle("cover_credit", fontName="Helvetica", fontSize=9,
                       textColor=GRAY_MID, alignment=TA_CENTER, leading=14)))

    story.append(PageBreak())
    return story


# ─── Resumen por suite ────────────────────────────────────────────────────────
def build_suite_summary(stats, styles):
    story = []
    w_content = PAGE_W - 2 * MARGIN

    story.append(Paragraph("Resumen por Suite", styles["section"]))
    story.append(Spacer(1, 3 * mm))

    headers = ["Suite", "Total", "Pasaron", "Fallaron", "Omitidos", "Estado"]
    col_w = [w_content * 0.38] + [w_content * 0.10] * 4 + [w_content * 0.12]

    header_row = [Paragraph(f"<b>{h}</b>", ParagraphStyle(
        "th", fontName="Helvetica-Bold", fontSize=8,
        textColor=WHITE, alignment=TA_CENTER)) for h in headers]

    data = [header_row]
    for s in stats["suites"]:
        if s["failed"] > 0:
            estado = Paragraph('<font color="#DC2626"><b>FALLO</b></font>',
                ParagraphStyle("es", fontName="Helvetica-Bold", fontSize=8,
                               textColor=RED_FAIL, alignment=TA_CENTER))
        elif s["skipped"] == s["total"]:
            estado = Paragraph('<font color="#D97706">OMITIDO</font>',
                ParagraphStyle("ew", fontName="Helvetica", fontSize=8,
                               textColor=AMBER_WARN, alignment=TA_CENTER))
        else:
            estado = Paragraph('<font color="#16A34A">VERDE</font>',
                ParagraphStyle("ep", fontName="Helvetica-Bold", fontSize=8,
                               textColor=GREEN_PASS, alignment=TA_CENTER))

        row = [
            Paragraph(s["name"], ParagraphStyle(
                "td", fontName="Helvetica", fontSize=8, textColor=GRAY_DARK)),
            Paragraph(str(s["total"]),   ParagraphStyle("tdn", fontName="Helvetica",
                fontSize=8, textColor=GRAY_DARK, alignment=TA_CENTER)),
            Paragraph(str(s["passed"]),  ParagraphStyle("tdp", fontName="Helvetica",
                fontSize=8, textColor=GREEN_PASS, alignment=TA_CENTER)),
            Paragraph(str(s["failed"]),  ParagraphStyle("tdf", fontName="Helvetica-Bold",
                fontSize=8,
                textColor=RED_FAIL if s["failed"] > 0 else GRAY_DARK,
                alignment=TA_CENTER)),
            Paragraph(str(s["skipped"]), ParagraphStyle("tds", fontName="Helvetica",
                fontSize=8, textColor=AMBER_WARN, alignment=TA_CENTER)),
            estado,
        ]
        data.append(row)

    tbl = Table(data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_LIGHT]),
        ("BOX",            (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ("INNERGRID",      (0, 0), (-1, -1), 0.3, GRAY_BORDER),
        ("TOPPADDING",     (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 5),
        ("LEFTPADDING",    (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 6),
        ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tbl)
    return story


# ─── Detalle de fallos ────────────────────────────────────────────────────────
def build_failures(stats, styles):
    if not stats["failures"]:
        return []

    story = []
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Detalle de Fallos", styles["section"]))
    story.append(Spacer(1, 3 * mm))

    w_content = PAGE_W - 2 * MARGIN

    for i, f in enumerate(stats["failures"], 1):
        block = []
        header = Table(
            [[Paragraph(
                f'<font color="{RED_FAIL.hexval()}"><b>#{i} {f["title"]}</b></font>',
                ParagraphStyle("fh", fontName="Helvetica-Bold", fontSize=9,
                               textColor=RED_FAIL)
            )]],
            colWidths=[w_content],
            style=TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), RED_BG),
                ("BOX",           (0, 0), (-1, -1), 0.5, GRAY_BORDER),
                ("TOPPADDING",    (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ])
        )
        block.append(header)

        if f["suite"]:
            block.append(Paragraph(f'Suite: {f["suite"]}', styles["label"]))
        if f["file"]:
            loc = f'{f["file"]}:{f["line"]}' if f["line"] else f["file"]
            block.append(Paragraph(f'Archivo: {loc}', styles["body"]))

        if f["error"]:
            block.append(Paragraph("Error:", styles["label"]))
            safe = (f["error"]
                    .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
            block.append(Paragraph(safe, styles["error_msg"]))

        block.append(Spacer(1, 4 * mm))
        block.append(HRFlowable(width="100%", thickness=0.3, color=GRAY_BORDER))
        block.append(Spacer(1, 3 * mm))

        story.append(KeepTogether(block))

    return story


# ─── Evidencias de casos exitosos ────────────────────────────────────────────
def build_evidences(stats, styles):
    if not stats["evidences"]:
        return []

    story = [PageBreak(), Paragraph("Evidencias de Casos Exitosos", styles["section"])]
    story.append(Paragraph(
        "Capturas obtenidas al finalizar cada prueba aprobada.", styles["body"]
    ))
    story.append(Spacer(1, 4 * mm))
    w_content = PAGE_W - 2 * MARGIN

    for index, evidence in enumerate(stats["evidences"], 1):
        story.append(Paragraph(f'{index}. {evidence["title"]}', styles["subsection"]))
        story.append(Paragraph(f'Suite: {evidence["suite"]}', styles["body"]))
        screenshot = Image(evidence["path"])
        screenshot._restrictSize(w_content, 120 * mm)
        story.append(Spacer(1, 2 * mm))
        story.append(screenshot)
        if index < len(stats["evidences"]):
            story.append(PageBreak())

    return story


# ─── Entry point ──────────────────────────────────────────────────────────────
def generate_report(results_path, output_path, app_name="App",
                    environment=None, app_version=None,
                    repo_url=None, author=None):
    stats = parse_results(results_path)

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=HEADER_H + 6 * mm, bottomMargin=FOOTER_H + 8 * mm,
        title=f"Informe Ejecutivo E2E — {app_name}",
        author="aiquaa — https://aiquaa.com/",
    )

    styles  = build_styles()
    on_page = ReportCanvas(author=author, environment=environment)

    story  = build_cover(stats, styles, app_name, environment,
                         app_version=app_version, repo_url=repo_url, author=author)
    story += build_suite_summary(stats, styles)
    story += build_failures(stats, styles)
    story += build_evidences(stats, styles)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)

    verdict_text, _ = get_verdict(stats)
    print(f"Reporte : {output_path}")
    print(f"  Total  : {stats['total']} tests")
    print(f"  Passed : {stats['passed']} ({stats['pass_rate']}%)")
    print(f"  Failed : {stats['failed']}")
    print(f"  Skipped: {stats['skipped']}")
    print(f"  Duración: {stats['duration_s']}s")
    print(f"  Veredicto: {verdict_text}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Playwright PDF Report Ejecutivo — aiquaa.com")
    parser.add_argument("--results",     required=True, help="JSON de resultados Playwright")
    parser.add_argument("--output",      default=None,  help="Nombre del PDF de salida")
    parser.add_argument("--app-name",    default="App", help="Nombre de la aplicación")
    parser.add_argument("--environment", default=None,  help="Ambiente (QA, Staging, etc.)")
    parser.add_argument("--app-version", default=None,  help="Versión de la aplicación")
    parser.add_argument("--repo-url",    default=None,  help="URL del repositorio")
    parser.add_argument("--author",      default=None,  help="Autor de la automatización")
    args = parser.parse_args()

    output_path = args.output
    if not output_path:
        slug = re.sub(r"[^A-Z0-9]+", "_", args.app_name.upper()).strip("_")
        output_path = f"INFORME_E2E_{slug}.pdf"

    generate_report(
        results_path=args.results,
        output_path=output_path,
        app_name=args.app_name,
        environment=args.environment,
        app_version=args.app_version,
        repo_url=args.repo_url,
        author=args.author,
    )
