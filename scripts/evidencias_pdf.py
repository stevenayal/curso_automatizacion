#!/usr/bin/env python3
"""
evidencias_pdf.py — Captura visual del sandbox + resultados BDD -> PDF de evidencias.

Flujo:
  1. Lanza Chromium via playwright-python.
  2. Selecciona el curso en el selector inicial del sandbox.
  3. Navega al login, completa credenciales y accede a los modulos.
  4. Toma screenshots en cada paso (siempre, no solo en fallo).
  5. Lee cucumber.json si existe para agregar tabla de resultados BDD.
  6. Genera PDF A4 con capturas embebidas + tabla BDD + feature files.

Dependencias:
  pip install playwright reportlab
  playwright install chromium
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image, PageBreak, Paragraph, Preformatted,
    SimpleDocTemplate, Spacer, Table, TableStyle,
)
from reportlab.platypus.flowables import HRFlowable

# ── Paleta ────────────────────────────────────────────────────────────────────
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
MARGIN = 16 * mm

# ── Credenciales de demo ──────────────────────────────────────────────────────
SANDBOX_EMAIL    = os.environ.get("SANDBOX_EMAIL",    "admin@aiquaa.com")
SANDBOX_PASSWORD = os.environ.get("SANDBOX_PASSWORD", "Admin1234!")

# Modulos a capturar despues del login
# Tupla: (ruta, titulo, nombre_enlace_nav)
# nombre_enlace_nav: si la URL directa da 404, se hace clic en el enlace del nav
POST_LOGIN_ROUTES = [
    ("/cuentas",          "Modulo Cuentas Bancarias",  None),
    ("/tarjetas",         "Modulo Tarjetas",            None),
    ("/prestamos",        "Modulo Prestamos",           "Préstamos"),
    ("/transferencias",   "Modulo Transferencias",      None),
    ("/ahorros",          "Modulo Ahorros",             "Ahorros"),
    ("/depositos",        "Modulo Depositos",           None),
    ("/clientes",         "Modulo Clientes",            None),
]


# ── Helpers PDF ───────────────────────────────────────────────────────────────
def esc(text: str) -> str:
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def para(text, style):
    return Paragraph(esc(str(text)), style)

def _dur_ms(ns: int) -> str:
    ms = ns // 1_000_000
    if ms >= 60_000:
        return f"{ms//60000}m {(ms%60000)//1000}s"
    return f"{ms/1000:.1f}s" if ms >= 1000 else f"{ms}ms"


# ── Captura de app ────────────────────────────────────────────────────────────
def capture_app(base_url: str, screenshots_dir: Path) -> list[dict]:
    """Navega el sandbox y guarda screenshots. Devuelve lista de capturas."""
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    captured: list[dict] = []
    idx = 0

    def snap(page: Page, title: str, slug: str = "") -> dict | None:
        nonlocal idx
        idx += 1
        safe = (slug or title)[:40].strip("/").replace("/", "-").replace(" ", "_")
        fname = f"{idx:02d}-{safe}.png"
        path = screenshots_dir / fname
        try:
            page.wait_for_load_state("networkidle", timeout=8000)
        except PWTimeout:
            pass
        try:
            page.screenshot(path=str(path), full_page=True)
            print(f"  [OK] {title} -> {fname}")
            return {"title": title, "path": path, "url": page.url}
        except Exception as exc:
            print(f"  [WARN] Captura '{title}': {exc}")
            return None

    def try_pass_course_selector(page: Page) -> None:
        """Detecta y supera el selector de curso inicial del sandbox."""
        try:
            # Esperar que cargue
            page.wait_for_load_state("domcontentloaded", timeout=5000)
            url = page.url
            # Si redireccionó al selector de curso
            if "/curso" in url or url.rstrip("/") == base_url.rstrip("/"):
                # Intentar seleccionar Curso 2 (Productos Bancarios = modulos BDD)
                for selector in [
                    "text=Curso 2",
                    "label:has-text('Curso 2')",
                    "input[type='radio'] + label",
                    "text=Curso 1",
                ]:
                    try:
                        page.click(selector, timeout=2000)
                        break
                    except Exception:
                        pass
                # Buscar boton Continuar
                for btn in ["button:has-text('Continuar')", "button[type='submit']"]:
                    try:
                        page.click(btn, timeout=2000)
                        page.wait_for_load_state("networkidle", timeout=6000)
                        print("  [OK] Selector de curso superado")
                        break
                    except Exception:
                        pass
        except Exception:
            pass

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            ignore_https_errors=True,
        )
        page = context.new_page()
        page.on("console", lambda _: None)

        # ── 1. Selector de curso (pantalla inicial) ───────────────────────────
        try:
            page.goto(base_url, timeout=15000, wait_until="domcontentloaded")
            r = snap(page, "Pantalla de seleccion de curso", "01-selector-curso")
            if r:
                captured.append(r)
        except Exception as exc:
            print(f"  [WARN] Pagina inicial: {exc}")

        # ── 2. Login: Curso 2 → email → Ingresar ─────────────────────────────
        try:
            # La app redirige siempre a /curso primero; ir directo al auth/login
            # y manejar el selector de curso si aparece
            login_url = f"{base_url.rstrip('/')}/auth/login"
            page.goto(login_url, timeout=15000, wait_until="domcontentloaded")

            # Esperar a que cargue algún input (radio o email)
            page.wait_for_selector(
                "input[type='radio'], input[type='email'], input[type='text']",
                timeout=10000,
            )

            # Si estamos en /curso, seleccionar Curso 2 y continuar
            if "/curso" in page.url:
                radios = page.locator("input[type='radio']")
                count = radios.count()
                if count >= 2:
                    radios.nth(1).check()           # segundo radio = Curso 2
                elif count == 1:
                    radios.nth(0).check()
                page.get_by_role("button", name="Continuar").click(timeout=4000)
                page.wait_for_load_state("networkidle", timeout=8000)
                print("  [OK] Curso 2 seleccionado, esperando formulario de login")

            # Ahora debería estar en el formulario de email
            page.wait_for_selector(
                "input[type='email'], input[type='text']",
                timeout=8000,
            )
            r = snap(page, "Pantalla de login - Email", "login-vacio")
            if r:
                captured.append(r)

            # Llenar email (.first es propiedad, sin paréntesis en playwright-python)
            email_input = page.locator("input[type='email'], input[type='text']").first
            email_input.fill(SANDBOX_EMAIL)
            page.wait_for_timeout(400)           # pequeña pausa para que React procese

            r = snap(page, "Login con email ingresado", "login-lleno")
            if r:
                captured.append(r)

            # Enviar
            page.get_by_role("button", name="Ingresar").click(timeout=5000)

            # Esperar confirmación de sesión (heading Bienvenido o navegación a módulo)
            try:
                page.wait_for_selector(
                    "h1, h2, [class*='welcome'], [class*='bienvenid']",
                    timeout=10000,
                )
            except PWTimeout:
                pass
            page.wait_for_load_state("networkidle", timeout=8000)
            print(f"  [OK] Post-login en: {page.url}")

            r = snap(page, "Bienvenida post-login (sesion establecida)", "post-login")
            if r:
                captured.append(r)

        except Exception as exc:
            print(f"  [WARN] Flujo de login: {exc}")

        # ── 3. Modulos post-login ─────────────────────────────────────────────
        dashboard_url = base_url.rstrip("/")

        for route, title, nav_name in POST_LOGIN_ROUTES:
            url = f"{dashboard_url}{route}"
            try:
                page.goto(url, timeout=12000, wait_until="domcontentloaded")

                # Sesion perdida — saltar
                if "/auth/login" in page.url or "/curso" in page.url:
                    print(f"  [WARN] '{route}' sesion perdida, saltando")
                    continue

                # Si la URL directa devuelve 404, intentar via enlace de nav
                try:
                    is_404 = (
                        page.locator("text=404").count() > 0
                        or page.locator("text=Not Found").count() > 0
                        or page.locator("text=not found").count() > 0
                    )
                except Exception:
                    is_404 = False

                if is_404 and nav_name:
                    print(f"  [INFO] '{route}' dio 404, intentando via nav '{nav_name}'")
                    try:
                        page.goto(dashboard_url, timeout=8000, wait_until="domcontentloaded")
                        page.get_by_role("link", name=nav_name).first.click(timeout=5000)
                        page.wait_for_load_state("networkidle", timeout=8000)
                        print(f"  [OK] Navegado via nav a: {page.url}")
                    except Exception as nav_exc:
                        print(f"  [WARN] Nav click '{nav_name}': {nav_exc}")

                r = snap(page, title, route)
                if r:
                    captured.append(r)
            except Exception as exc:
                print(f"  [WARN] '{route}': {exc}")

        browser.close()

    return captured


# ── Parseo BDD ────────────────────────────────────────────────────────────────
def _scenario_status(scenario: dict) -> str:
    statuses = [
        s.get("result", {}).get("status", "skipped")
        for s in scenario.get("steps", [])
        if not s.get("hidden")
    ]
    if "failed" in statuses:
        return "failed"
    if "undefined" in statuses or "pending" in statuses:
        return "pending"
    if "skipped" in statuses and "passed" not in statuses:
        return "skipped"
    return "passed"

def _dur_ns(scenario: dict) -> int:
    return sum(s.get("result", {}).get("duration", 0) for s in scenario.get("steps", []))

def load_bdd(path: Path) -> tuple[dict, list]:
    empty = {"Escenarios": 0, "Aprobados": 0, "Fallidos": 0, "Pendientes": 0}
    if not path.exists():
        return {**empty, "Escenarios": "Sin resultado (cucumber no ejecuto)"}, []
    try:
        features = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {**empty, "Escenarios": f"JSON no legible: {e}"}, []

    counts = {"passed": 0, "failed": 0, "pending": 0}
    for f in features:
        for s in f.get("elements", []):
            if s.get("type") != "scenario":
                continue
            st = _scenario_status(s)
            counts[st if st in counts else "pending"] += 1

    return {
        "Escenarios": sum(counts.values()),
        "Aprobados":  counts["passed"],
        "Fallidos":   counts["failed"],
        "Pendientes": counts["pending"],
    }, features


# ── Secciones PDF ─────────────────────────────────────────────────────────────
def _tbl_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",       (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, ROW_ALT]),
    ])


def section_bdd(story, summary, features, styles):
    story.append(para("Resultados BDD (Cucumber)", styles["Heading1"]))
    story.append(Spacer(1, 3*mm))

    has_fail = isinstance(summary.get("Fallidos"), int) and summary["Fallidos"] > 0
    bg = BG_FAIL if has_fail else BG_OK
    vc = RED if has_fail else GREEN

    rows = [[k, str(v)] for k, v in summary.items()]
    t = Table(rows, colWidths=[70*mm, 40*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("TEXTCOLOR",  (1, 0), (1, -1), vc),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("GRID",       (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 5*mm))

    if not features:
        return

    STATUS_COLOR = {"passed": GREEN, "failed": RED, "pending": AMBER, "skipped": GRAY}
    STATUS_BG    = {"failed": BG_FAIL, "pending": BG_WARN}

    for feature in features:
        scenarios = [s for s in feature.get("elements", []) if s.get("type") == "scenario"]
        if not scenarios:
            continue
        story.append(para(feature.get("name", "Feature"), styles["Heading2"]))
        rows = [["#", "Escenario", "Estado", "Duracion", "Pasos OK"]]
        extra = []
        for i, sc in enumerate(scenarios, 1):
            st = _scenario_status(sc)
            steps = [s for s in sc.get("steps", []) if not s.get("hidden")]
            ok = sum(1 for s in steps if s.get("result", {}).get("status") == "passed")
            rows.append([str(i), sc.get("name", ""), st.upper(), _dur_ms(_dur_ns(sc)), f"{ok}/{len(steps)}"])
            extra.append(("TEXTCOLOR",  (2, i), (2, i), STATUS_COLOR.get(st, GRAY)))
            extra.append(("FONTNAME",   (2, i), (2, i), "Helvetica-Bold"))
            if st in STATUS_BG:
                extra.append(("BACKGROUND", (0, i), (-1, i), STATUS_BG[st]))

        tbl = Table(rows, colWidths=[8*mm, 100*mm, 20*mm, 22*mm, 16*mm])
        base = _tbl_style()
        for cmd in extra:
            base.add(*cmd)
        tbl.setStyle(base)
        story.append(tbl)

        # Detalle de steps fallidos
        for sc in scenarios:
            failed_steps = [
                s for s in sc.get("steps", [])
                if s.get("result", {}).get("status") == "failed" and not s.get("hidden")
            ]
            if not failed_steps:
                continue
            story.append(Spacer(1, 2*mm))
            story.append(para(f"Fallos en: {sc.get('name', '')}", styles["Heading3"]))
            for step in failed_steps:
                label = f"{step.get('keyword','').strip()} {step.get('name','')}"
                story.append(para(f"Paso: {label}", styles["BodyText"]))
                err = step.get("result", {}).get("error_message", "")
                if err:
                    story.append(Preformatted(err[:400], styles["EvidenceCode"]))
            story.append(Spacer(1, 2*mm))

        story.append(Spacer(1, 4*mm))


def section_screenshots(story, captured: list[dict], styles):
    story.append(PageBreak())
    story.append(para("Evidencia visual — capturas del sandbox", styles["Heading1"]))
    story.append(Spacer(1, 2*mm))

    if not captured:
        story.append(para("No se capturaron pantallas del sandbox.", styles["BodyText"]))
        return

    story.append(para(f"Total capturas: {len(captured)}", styles["BodyText"]))
    story.append(Spacer(1, 3*mm))

    for item in captured:
        path: Path = item["path"]
        if not path.exists():
            continue
        story.append(para(item["title"], styles["Heading2"]))
        story.append(para(f"URL: {item['url']}", styles["BodyText"]))
        story.append(Spacer(1, 2*mm))
        try:
            img = Image(str(path), width=165*mm, height=100*mm, kind="proportional")
            story.append(img)
        except Exception as exc:
            story.append(para(f"No se pudo insertar la captura: {exc}", styles["BodyText"]))
        story.append(Spacer(1, 5*mm))


def section_pw_screenshots(story, test_results_dir: Path, styles):
    """Screenshots de Playwright Test (capturas de fallos en test-results/)."""
    images = []
    if test_results_dir.exists():
        for ext in ("*.png", "*.jpg", "*.jpeg"):
            images.extend(sorted(test_results_dir.rglob(ext)))

    if not images:
        return

    story.append(PageBreak())
    story.append(para("Evidencia visual — capturas de Playwright Test", styles["Heading1"]))
    story.append(para(f"Total: {len(images)}", styles["BodyText"]))
    story.append(Spacer(1, 3*mm))

    for img_path in images[:20]:
        story.append(para(img_path.name, styles["Heading2"]))
        try:
            img = Image(str(img_path), width=165*mm, height=100*mm, kind="proportional")
            story.append(img)
        except Exception as exc:
            story.append(para(f"No se pudo insertar: {exc}", styles["BodyText"]))
        story.append(Spacer(1, 4*mm))


def section_features(story, root: Path, styles):
    story.append(PageBreak())
    story.append(para("Codigo de las pruebas (feature files)", styles["Heading1"]))
    story.append(Spacer(1, 3*mm))

    files: set[Path] = set()
    for pattern in ("features/**/*.feature", "grupos/**/features/**/*.feature"):
        files.update(root.glob(pattern))
    files_sorted = sorted(f for f in files if f.is_file())

    if not files_sorted:
        story.append(para("No se encontraron archivos .feature.", styles["BodyText"]))
        return

    for f in files_sorted:
        try:
            rel = f.relative_to(root)
        except ValueError:
            rel = f.name
        content = f.read_text(encoding="utf-8", errors="replace")
        if len(content) > 8000:
            content = content[:8000] + "\n... (truncado)"
        story.append(para(str(rel), styles["Heading2"]))
        story.append(Preformatted(content, styles["EvidenceCode"]))
        story.append(Spacer(1, 4*mm))


# ── Builder ───────────────────────────────────────────────────────────────────
def build_pdf(output: Path, captured: list[dict], summary: dict, features: list,
              root: Path, test_results_dir: Path):
    styles = getSampleStyleSheet()
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
        title="Evidencias BDD + POM - Semana 7",
        author="CI/CD - evidencias_pdf.py",
    )
    story = []

    # ── Portada ───────────────────────────────────────────────────────────────
    story.append(para("INFORME DE EVIDENCIAS BDD + POM", styles["Title"]))
    story.append(Spacer(1, 4*mm))
    story.append(para("Capturas reales del sandbox + resultados Cucumber (Semana 7)", styles["Heading2"]))
    story.append(Spacer(1, 5*mm))

    meta = [
        ["Fecha UTC",   datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")],
        ["Repositorio", os.environ.get("GITHUB_REPOSITORY", "local")],
        ["Workflow",    os.environ.get("GITHUB_WORKFLOW",   "evidencias-pdf")],
        ["Run",         os.environ.get("GITHUB_RUN_ID",     "local")],
        ["Commit",      os.environ.get("GITHUB_SHA",        "local")[:12]],
        ["Actor",       os.environ.get("GITHUB_ACTOR",      "local")],
        ["Rama",        os.environ.get("GITHUB_REF_NAME",   "local")],
        ["Base URL",    os.environ.get("BASE_URL",          "https://aiquaa-sandbox-web.vercel.app")],
        ["Capturas",    str(len(captured))],
    ]
    mt = Table(meta, colWidths=[42*mm, 130*mm])
    mt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("TEXTCOLOR",  (0, 0), (0, -1), NAVY),
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("GRID",       (0, 0), (-1, -1), 0.25, BORDER),
        ("PADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(mt)
    story.append(Spacer(1, 6*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))

    # ── BDD ───────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 5*mm))
    section_bdd(story, summary, features, styles)

    # ── Capturas del app ──────────────────────────────────────────────────────
    section_screenshots(story, captured, styles)

    # ── Capturas de Playwright Test (fallos) ──────────────────────────────────
    section_pw_screenshots(story, test_results_dir, styles)

    # ── Feature files ─────────────────────────────────────────────────────────
    section_features(story, root, styles)

    doc.build(story)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url",         default=os.environ.get("BASE_URL", "https://aiquaa-sandbox-web.vercel.app"))
    parser.add_argument("--cucumber-results", default="results/cucumber.json")
    parser.add_argument("--screenshots-dir",  default="ci-evidence/screenshots")
    parser.add_argument("--test-results-dir", default="test-results")
    parser.add_argument("--output",           default="ci-evidence/INFORME_EVIDENCIAS.pdf")
    parser.add_argument("--skip-capture",     action="store_true")
    args = parser.parse_args()

    root             = Path.cwd()
    output           = root / args.output
    screenshots_dir  = root / args.screenshots_dir
    test_results_dir = root / args.test_results_dir
    cucumber_path    = root / args.cucumber_results

    output.parent.mkdir(parents=True, exist_ok=True)

    # 1. Capturar app
    captured: list[dict] = []
    if not args.skip_capture:
        print(f"Capturando sandbox: {args.base_url}")
        try:
            captured = capture_app(args.base_url, screenshots_dir)
            print(f"Capturas: {len(captured)}")
        except Exception as exc:
            print(f"[ERROR] Captura del app: {exc}", file=sys.stderr)
    else:
        if screenshots_dir.exists():
            for ext in ("*.png", "*.jpg", "*.jpeg"):
                for p in sorted(screenshots_dir.glob(ext)):
                    captured.append({"title": p.stem.replace("-", " ").title(), "path": p, "url": ""})

    # 2. Resultados BDD
    print(f"Leyendo BDD: {cucumber_path}")
    summary, features = load_bdd(cucumber_path)
    print(f"BDD: {summary}")

    # 3. PDF
    print(f"Generando PDF: {output}")
    build_pdf(output, captured, summary, features, root, test_results_dir)
    print(f"Informe generado: {output}")


if __name__ == "__main__":
    main()
