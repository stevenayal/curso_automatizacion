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
from reportlab.platypus.flowables import HRFlowable

# ── Palette ────────────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#0D1B40")
GREEN  = colors.HexColor("#16803A")
RED    = colors.HexColor("#B42318")
AMBER  = colors.HexColor("#B54708")
GRAY   = colors.HexColor("#475467")
LIGHT  = colors.HexColor("#F2F4F7")
BORDER = colors.HexColor("#D0D5DD")
BG_OK  = colors.HexColor("#ECFDF3")
BG_FAIL= colors.HexColor("#FEF3F2")
BG_WARN= colors.HexColor("#FFFAEB")
ROW_ALT= colors.HexColor("#F9FAFB")

# ── Constants ──────────────────────────────────────────────────────────────────
MARGIN          = 16 * mm
MAX_LOG_HEAD    = 10   # first N lines of each log
MAX_LOG_TAIL    = 40   # last N lines of each log
MAX_SOURCE_CHARS= 12000
MAX_IMAGES      = 20
MAX_ERROR_CHARS = 300
PAGE_W          = A4[0] - 2 * MARGIN


# ── Helpers ────────────────────────────────────────────────────────────────────
def esc(text: str) -> str:
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def paragraph(text, style):
    return Paragraph(esc(text), style)


def _dur_ms(duration_ns: int) -> str:
    ms = duration_ns // 1_000_000
    if ms >= 60_000:
        return f"{ms // 60000}m {(ms % 60000) // 1000}s"
    if ms >= 1000:
        return f"{ms / 1000:.1f}s"
    return f"{ms}ms"


def _table_style(header_bg=NAVY, col_widths=None):
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 8),
        ("FONTSIZE",   (0, 1), (-1, -1), 7.5),
        ("GRID",       (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",    (0, 0), (-1, -1), 4),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
    ])


# ── Cucumber parsing ───────────────────────────────────────────────────────────
def _scenario_status(scenario: dict) -> str:
    statuses = [
        step.get("result", {}).get("status", "skipped")
        for step in scenario.get("steps", [])
        if not step.get("hidden")
    ]
    if "failed" in statuses:
        return "failed"
    if "undefined" in statuses or "pending" in statuses or "ambiguous" in statuses:
        return "pending"
    if "skipped" in statuses and "passed" not in statuses:
        return "skipped"
    return "passed"


def _scenario_duration_ns(scenario: dict) -> int:
    return sum(
        step.get("result", {}).get("duration", 0)
        for step in scenario.get("steps", [])
    )


def _failed_steps(scenario: dict) -> list[dict]:
    return [
        {
            "keyword": step.get("keyword", ""),
            "name": step.get("name", ""),
            "error": step.get("result", {}).get("error_message", ""),
        }
        for step in scenario.get("steps", [])
        if step.get("result", {}).get("status") == "failed"
        and not step.get("hidden")
    ]


def cucumber_summary(path: Path) -> dict:
    if not path.exists():
        return {"Escenarios": "Sin resultado JSON", "Aprobados": 0, "Fallidos": 0, "Pendientes": 0}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {"Escenarios": f"JSON no legible: {error}", "Aprobados": 0, "Fallidos": 0, "Pendientes": 0}

    counts = {"passed": 0, "failed": 0, "pending": 0}
    for feature in data:
        for scenario in feature.get("elements", []):
            if scenario.get("type") != "scenario":
                continue
            counts[_scenario_status(scenario) if _scenario_status(scenario) in counts else "pending"] += 1

    return {
        "Escenarios": sum(counts.values()),
        "Aprobados":  counts["passed"],
        "Fallidos":   counts["failed"],
        "Pendientes": counts["pending"],
    }


def cucumber_features(path: Path) -> list[dict]:
    """Return parsed features list or empty list on error."""
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []


# ── Source files ───────────────────────────────────────────────────────────────
def source_files(root: Path) -> list[Path]:
    patterns = (
        "tests/**/*.ts", "tests/**/*.js",
        "features/**/*.feature",
        "grupos/**/tests/**/*.ts", "grupos/**/tests/**/*.js",
        "grupos/**/features/**/*.feature",
        "playwright/pages/**/*.ts",
        "grupos/**/playwright/pages/**/*.ts",
    )
    files: set[Path] = set()
    for pattern in patterns:
        files.update(root.glob(pattern))
    return sorted((p for p in files if p.is_file()), key=lambda p: str(p).lower())


# ── CLASIF loader ──────────────────────────────────────────────────────────────
def load_clasif(root: Path) -> dict | None:
    """Return first CLASIF_*.json found under results/ or root."""
    for folder in (root / "results", root):
        for path in sorted(folder.glob("CLASIF_*.json")):
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                pass
    return None


# ── PDF sections ───────────────────────────────────────────────────────────────
def add_bdd_detail(story: list, features: list[dict], styles):
    """Add per-feature/scenario breakdown table."""
    story.append(PageBreak())
    story.append(paragraph("Detalle de escenarios BDD", styles["Heading1"]))
    story.append(Spacer(1, 3 * mm))

    if not features:
        story.append(paragraph("No hay datos de escenarios disponibles.", styles["BodyText"]))
        return

    STATUS_COLOR = {"passed": GREEN, "failed": RED, "pending": AMBER, "skipped": GRAY}
    STATUS_BG    = {"passed": BG_OK, "failed": BG_FAIL, "pending": BG_WARN, "skipped": LIGHT}

    for feature in features:
        scenarios = [s for s in feature.get("elements", []) if s.get("type") == "scenario"]
        if not scenarios:
            continue

        story.append(paragraph(feature.get("name", "Feature sin nombre"), styles["Heading2"]))

        rows = [["#", "Escenario", "Estado", "Duración", "Pasos"]]
        row_styles = []

        for idx, scenario in enumerate(scenarios, start=1):
            status   = _scenario_status(scenario)
            dur_ns   = _scenario_duration_ns(scenario)
            steps    = [s for s in scenario.get("steps", []) if not s.get("hidden")]
            n_steps  = len(steps)
            n_pass   = sum(1 for s in steps if s.get("result", {}).get("status") == "passed")

            row_idx = idx  # header is row 0
            row_styles.append(("TEXTCOLOR",  (2, row_idx), (2, row_idx), STATUS_COLOR.get(status, GRAY)))
            row_styles.append(("FONTNAME",   (2, row_idx), (2, row_idx), "Helvetica-Bold"))
            if status in ("failed", "pending"):
                row_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), STATUS_BG.get(status, LIGHT)))

            rows.append([
                str(idx),
                scenario.get("name", ""),
                status.upper(),
                _dur_ms(dur_ns),
                f"{n_pass}/{n_steps}",
            ])

        col_w = [8*mm, 100*mm, 20*mm, 22*mm, 16*mm]
        tbl = Table(rows, colWidths=col_w)
        base = _table_style()
        for rs in row_styles:
            base.add(*rs)
        tbl.setStyle(base)
        story.append(tbl)
        story.append(Spacer(1, 4 * mm))

        # Failed step details
        for scenario in scenarios:
            fails = _failed_steps(scenario)
            if not fails:
                continue
            story.append(paragraph(f"Fallos en: {scenario.get('name', '')}", styles["Heading3"]))
            for step in fails:
                label = f"{step['keyword'].strip()} {step['name']}"
                story.append(paragraph(f"Paso: {label}", styles["BodyText"]))
                if step["error"]:
                    excerpt = step["error"][:MAX_ERROR_CHARS]
                    if len(step["error"]) > MAX_ERROR_CHARS:
                        excerpt += "\n... (truncado)"
                    story.append(Preformatted(excerpt, styles["EvidenceCode"]))
                story.append(Spacer(1, 2 * mm))


def add_clasif_section(story: list, clasif: dict, styles):
    """Add failure classification summary from CLASIF_*.json."""
    story.append(PageBreak())
    story.append(paragraph("Clasificacion de fallos (AI Agents)", styles["Heading1"]))
    story.append(Spacer(1, 3 * mm))

    summary = clasif.get("summary", {})
    meta_rows = [
        ["Total fallos", str(summary.get("total", 0))],
        ["Candidatos Healer", str(summary.get("healerCandidates", 0))],
        ["Max intentos Healer", str(summary.get("maxHealAttempts", 2))],
    ]
    by_cat = summary.get("byCategory", {})
    for cat, count in by_cat.items():
        if count:
            meta_rows.append([cat, str(count)])

    meta_tbl = Table(meta_rows, colWidths=[60*mm, 40*mm])
    meta_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("TEXTCOLOR",  (0, 0), (0, -1), NAVY),
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("GRID",       (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",    (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 5 * mm))

    failures = clasif.get("failures", [])
    if not failures:
        return

    story.append(paragraph("Fallos clasificados", styles["Heading2"]))
    rows = [["Escenario", "Categoría", "Confianza", "Healer", "Error"]]
    for f in failures:
        rows.append([
            f.get("title", ""),
            f.get("category", ""),
            f.get("confidence", ""),
            "Si" if f.get("healerAllowed") else "No",
            (f.get("error", "") or "")[:80],
        ])

    col_w = [55*mm, 28*mm, 22*mm, 14*mm, 48*mm]
    tbl = Table(rows, colWidths=col_w)
    base = _table_style()

    HEALER_COL = 3
    for i, f in enumerate(failures, start=1):
        cat = f.get("category", "")
        if cat == "PRODUCT_BUG":
            base.add("TEXTCOLOR", (1, i), (1, i), RED)
        elif cat == "TEST_BUG":
            base.add("TEXTCOLOR", (1, i), (1, i), AMBER)
        if not f.get("healerAllowed"):
            base.add("TEXTCOLOR", (HEALER_COL, i), (HEALER_COL, i), GRAY)

    tbl.setStyle(base)
    story.append(tbl)
    story.append(Spacer(1, 4 * mm))


def add_log_evidence(story: list, evidence_dir: Path, styles):
    """Add CI log excerpts: first N + last N lines, error lines highlighted."""
    logs = sorted(evidence_dir.glob("*.log"))
    story.append(paragraph("Evidencias de cada paso CI", styles["Heading1"]))
    if not logs:
        story.append(paragraph("No se encontraron logs de CI.", styles["BodyText"]))
        return

    for log in logs:
        text  = log.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        total = len(lines)

        if total == 0:
            excerpt = "Sin salida registrada."
        elif total <= MAX_LOG_HEAD + MAX_LOG_TAIL:
            # File short enough to show in full
            excerpt = "\n".join(lines)
        else:
            head = lines[:MAX_LOG_HEAD]
            tail = lines[total - MAX_LOG_TAIL:]
            omitted = total - MAX_LOG_HEAD - MAX_LOG_TAIL
            excerpt = (
                "\n".join(head)
                + f"\n\n... ({omitted} lineas omitidas) ...\n\n"
                + "\n".join(tail)
            )

        story.append(paragraph(log.stem.replace("-", " ").title(), styles["Heading2"]))

        # Count errors/warnings
        n_err = sum(1 for l in lines if any(k in l.lower() for k in ("error", "fail", "exception")))
        if n_err:
            story.append(paragraph(f"Lineas con error/fail detectadas: {n_err}", styles["Warn"]))

        story.append(Preformatted(excerpt, styles["EvidenceCode"]))
        story.append(Spacer(1, 3 * mm))


def add_visual_evidence(story: list, root: Path, styles):
    """Add screenshots from test-results/ and ci-evidence/."""
    images: list[Path] = []
    for folder in (root / "test-results", root / "ci-evidence"):
        if folder.exists():
            images.extend(
                p for p in folder.rglob("*")
                if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
            )

    story.append(PageBreak())
    story.append(paragraph("Evidencia visual", styles["Heading1"]))
    if not images:
        story.append(paragraph(
            "No se generaron capturas. Playwright conserva capturas, videos y trazas cuando una prueba falla.",
            styles["BodyText"],
        ))
        return

    story.append(paragraph(f"Total capturas encontradas: {len(images)}  |  Mostrando: {min(len(images), MAX_IMAGES)}", styles["BodyText"]))
    story.append(Spacer(1, 3 * mm))

    for image_path in images[:MAX_IMAGES]:
        story.append(paragraph(str(image_path.relative_to(root)), styles["Heading2"]))
        try:
            img = Image(str(image_path), width=160 * mm, height=90 * mm, kind="proportional")
            story.append(img)
        except Exception as error:
            story.append(paragraph(f"No se pudo insertar la captura: {error}", styles["BodyText"]))
        story.append(Spacer(1, 3 * mm))


# ── Main builder ───────────────────────────────────────────────────────────────
def build_report(root: Path, output: Path, evidence_dir: Path, cucumber_results: str):
    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        "EvidenceCode", parent=styles["Code"],
        fontName="Courier", fontSize=6.5, leading=8, textColor=GRAY,
    ))
    styles.add(ParagraphStyle(
        "Warn", parent=styles["BodyText"],
        textColor=AMBER, fontName="Helvetica-Bold", fontSize=8,
    ))
    styles["Title"].textColor    = NAVY
    styles["Heading1"].textColor = NAVY
    styles["Heading2"].textColor = GRAY
    styles["Heading3"].fontSize  = 9
    styles["Heading3"].textColor = NAVY

    doc = SimpleDocTemplate(
        str(output), pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
        title="Informe de Evidencias BDD + POM",
        author="CI/CD GitHub Actions",
    )
    story = []

    # ── Cover ──────────────────────────────────────────────────────────────────
    story.append(paragraph("INFORME DE EVIDENCIAS BDD + POM", styles["Title"]))
    story.append(Spacer(1, 4 * mm))
    story.append(paragraph("Ejecucion automatizada con Cucumber y Playwright (Semana 7)", styles["Heading2"]))
    story.append(Spacer(1, 5 * mm))

    metadata = [
        ["Fecha UTC",    datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")],
        ["Repositorio",  os.environ.get("GITHUB_REPOSITORY", "ejecucion local")],
        ["Workflow",     os.environ.get("GITHUB_WORKFLOW", "BDD + POM CI")],
        ["Run",          os.environ.get("GITHUB_RUN_ID", "no disponible")],
        ["Commit",       os.environ.get("GITHUB_SHA", "no disponible")[:12]],
        ["Actor",        os.environ.get("GITHUB_ACTOR", "no disponible")],
        ["Rama",         os.environ.get("GITHUB_REF_NAME", "no disponible")],
    ]
    meta_tbl = Table(metadata, colWidths=[42*mm, 125*mm])
    meta_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("TEXTCOLOR",  (0, 0), (0, -1), NAVY),
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("GRID",       (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 6 * mm))

    # ── BDD summary ────────────────────────────────────────────────────────────
    cucumber_path = root / cucumber_results
    summary = cucumber_summary(cucumber_path)
    features = cucumber_features(cucumber_path)

    has_failures = isinstance(summary.get("Fallidos"), int) and summary["Fallidos"] > 0
    bg_color = BG_FAIL if has_failures else BG_OK
    val_color = RED if has_failures else GREEN

    story.append(paragraph("Resumen BDD", styles["Heading1"]))
    sum_rows = [[k, v] for k, v in summary.items()]
    sum_tbl = Table(sum_rows, colWidths=[70*mm, 30*mm])
    sum_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("TEXTCOLOR",  (1, 0), (1, -1), val_color),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("GRID",       (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(sum_tbl)
    story.append(Spacer(1, 4 * mm))

    # Durations quick stats
    if features:
        total_dur = sum(
            _scenario_duration_ns(s)
            for f in features
            for s in f.get("elements", [])
            if s.get("type") == "scenario"
        )
        story.append(paragraph(f"Duracion total estimada: {_dur_ms(total_dur)}  |  Features: {len(features)}", styles["BodyText"]))
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))

    # ── Detailed scenario tables ───────────────────────────────────────────────
    if features:
        add_bdd_detail(story, features, styles)

    # ── Failure classification ─────────────────────────────────────────────────
    clasif = load_clasif(root)
    if clasif:
        add_clasif_section(story, clasif, styles)

    # ── Log evidence ───────────────────────────────────────────────────────────
    story.append(PageBreak())
    add_log_evidence(story, evidence_dir, styles)

    # ── Visual evidence ────────────────────────────────────────────────────────
    add_visual_evidence(story, root, styles)

    # ── Source code ───────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(paragraph("Pruebas generadas", styles["Heading1"]))
    files = source_files(root)
    if not files:
        story.append(paragraph("No se encontraron archivos de pruebas o features.", styles["BodyText"]))
    for src in files:
        relative = src.relative_to(root)
        content  = src.read_text(encoding="utf-8", errors="replace")
        if len(content) > MAX_SOURCE_CHARS:
            content = content[:MAX_SOURCE_CHARS] + "\n... contenido truncado en el PDF; ver el artefacto para el archivo completo."
        story.append(paragraph(str(relative), styles["Heading2"]))
        story.append(Preformatted(content, styles["EvidenceCode"]))
        story.append(Spacer(1, 4 * mm))

    doc.build(story)


# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output",           default="ci-evidence/INFORME_SEMANA_7.pdf")
    parser.add_argument("--evidence-dir",     default="ci-evidence")
    parser.add_argument("--cucumber-results", default="results/cucumber-report.json")
    args = parser.parse_args()

    root = Path.cwd()
    output = root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    build_report(root, output, root / args.evidence_dir, args.cucumber_results)
    print(f"Informe generado: {output}")


if __name__ == "__main__":
    main()
