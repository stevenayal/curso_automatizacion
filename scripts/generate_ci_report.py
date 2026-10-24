#!/usr/bin/env python3
"""Genera un PDF de evidencias para la ejecucion BDD + Playwright del CI."""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#0D1B40")
GREEN = colors.HexColor("#16803A")
RED = colors.HexColor("#B42318")
GRAY = colors.HexColor("#475467")
LIGHT = colors.HexColor("#F2F4F7")
MARGIN = 16 * mm
MAX_LOG_LINES = 35
MAX_SOURCE_CHARS = 12000


def paragraph(text, style):
    return Paragraph(str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), style)


def cucumber_summary(path):
    if not path.exists():
        return {"Escenarios": "Sin resultado JSON", "Aprobados": 0, "Fallidos": 0, "Pendientes": 0}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {"Escenarios": f"JSON no legible: {error}", "Aprobados": 0, "Fallidos": 0, "Pendientes": 0}

    counts = {"passed": 0, "failed": 0, "pending": 0, "undefined": 0, "skipped": 0}
    for feature in data:
        for scenario in feature.get("elements", []):
            if scenario.get("type") != "scenario":
                continue
            statuses = [step.get("result", {}).get("status", "skipped") for step in scenario.get("steps", [])]
            status = "failed" if "failed" in statuses else "undefined" if "undefined" in statuses else "pending" if "pending" in statuses else "passed"
            counts[status] += 1

    return {
        "Escenarios": sum(counts.values()),
        "Aprobados": counts["passed"],
        "Fallidos": counts["failed"],
        "Pendientes": counts["pending"] + counts["undefined"] + counts["skipped"],
    }


def source_files(root):
    patterns = ("tests/**/*.ts", "tests/**/*.js", "features/**/*.feature", "grupos/**/tests/**/*.ts", "grupos/**/tests/**/*.js", "grupos/**/features/**/*.feature", "playwright/pages/**/*.ts", "grupos/**/playwright/pages/**/*.ts")
    files = set()
    for pattern in patterns:
        files.update(root.glob(pattern))
    return sorted((path for path in files if path.is_file()), key=lambda path: str(path).lower())


def add_log_evidence(story, evidence_dir, styles):
    logs = sorted(evidence_dir.glob("*.log"))
    story.append(paragraph("Evidencias de cada paso", styles["Heading1"]))
    if not logs:
        story.append(paragraph("No se encontraron logs de CI.", styles["BodyText"]))
        return

    for log in logs:
        text = log.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        excerpt = "\n".join(lines[-MAX_LOG_LINES:]) or "Sin salida registrada."
        story.append(paragraph(log.stem.replace("-", " ").title(), styles["Heading2"]))
        story.append(Preformatted(excerpt, styles["EvidenceCode"]))
        story.append(Spacer(1, 3 * mm))


def add_visual_evidence(story, root, styles):
    images = []
    for folder in (root / "test-results", root / "ci-evidence"):
        if folder.exists():
            images.extend(path for path in folder.rglob("*") if path.suffix.lower() in {".png", ".jpg", ".jpeg"})

    story.append(PageBreak())
    story.append(paragraph("Evidencia visual", styles["Heading1"]))
    if not images:
        story.append(paragraph("No se generaron capturas. Playwright conserva capturas, videos y trazas cuando una prueba falla.", styles["BodyText"]))
        return

    for image_path in images[:12]:
        story.append(paragraph(str(image_path.relative_to(root)), styles["Heading2"]))
        try:
            image = Image(str(image_path), width=160 * mm, height=90 * mm, kind="proportional")
            story.append(image)
        except Exception as error:
            story.append(paragraph(f"No se pudo insertar la captura: {error}", styles["BodyText"]))
        story.append(Spacer(1, 3 * mm))


def build_report(root, output, evidence_dir, cucumber_results):
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("EvidenceCode", parent=styles["Code"], fontName="Courier", fontSize=6.5, leading=8, textColor=GRAY))
    styles["Title"].textColor = NAVY
    styles["Heading1"].textColor = NAVY

    document = SimpleDocTemplate(str(output), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN)
    story = []
    story.append(paragraph("INFORME DE EVIDENCIAS BDD + POM", styles["Title"]))
    story.append(Spacer(1, 5 * mm))
    story.append(paragraph("Semana 7 | Ejecucion automatizada con Cucumber y Playwright", styles["Heading2"]))

    metadata = [
        ["Fecha UTC", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")],
        ["Repositorio", os.environ.get("GITHUB_REPOSITORY", "ejecucion local")],
        ["Workflow", os.environ.get("GITHUB_WORKFLOW", "BDD + POM CI")],
        ["Run", os.environ.get("GITHUB_RUN_ID", "no disponible")],
        ["Commit", os.environ.get("GITHUB_SHA", "no disponible")[:12]],
    ]
    table = Table(metadata, colWidths=[42 * mm, 125 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D0D5DD")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    story.append(Spacer(1, 6 * mm))

    summary = cucumber_summary(root / cucumber_results)
    story.append(paragraph("Resultado BDD", styles["Heading1"]))
    summary_table = Table([[key, value] for key, value in summary.items()], colWidths=[70 * mm, 30 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ECFDF3") if not summary["Fallidos"] else colors.HexColor("#FEF3F2")),
        ("TEXTCOLOR", (1, 0), (1, -1), GREEN if not summary["Fallidos"] else RED),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D0D5DD")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 6 * mm))
    add_log_evidence(story, evidence_dir, styles)
    add_visual_evidence(story, root, styles)

    story.append(PageBreak())
    story.append(paragraph("Pruebas generadas", styles["Heading1"]))
    files = source_files(root)
    if not files:
        story.append(paragraph("No se encontraron archivos de pruebas o features.", styles["BodyText"]))
    for source in files:
        relative = source.relative_to(root)
        content = source.read_text(encoding="utf-8", errors="replace")
        if len(content) > MAX_SOURCE_CHARS:
            content = content[:MAX_SOURCE_CHARS] + "\n... contenido truncado en el PDF; ver el artefacto para el archivo completo."
        story.append(paragraph(str(relative), styles["Heading2"]))
        story.append(Preformatted(content, styles["EvidenceCode"]))
        story.append(Spacer(1, 4 * mm))

    document.build(story)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="ci-evidence/INFORME_SEMANA_7.pdf")
    parser.add_argument("--evidence-dir", default="ci-evidence")
    parser.add_argument("--cucumber-results", default="results/cucumber-report.json")
    args = parser.parse_args()
    root = Path.cwd()
    output = root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    build_report(root, output, root / args.evidence_dir, args.cucumber_results)
    print(f"Informe generado: {output}")


if __name__ == "__main__":
    main()
