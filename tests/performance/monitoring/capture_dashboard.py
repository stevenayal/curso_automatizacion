#!/usr/bin/env python3
"""Capture a screenshot of a monitoring dashboard (Grafana, etc.) as PDF report evidence.

Invoked by .github/workflows/Y_AIQUAAECHO_jmeter.yml after the JMeter run.
Prints a single JSON object to stdout on success; on failure prints a JSON
error object to stderr and exits non-zero.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture a monitoring dashboard screenshot.")
    parser.add_argument("--url", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--wait-seconds", type=float, default=5.0)
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=900)
    parser.add_argument("--timeout-seconds", type=int, default=30)
    parser.add_argument("--full-page", action="store_true")
    parser.add_argument(
        "--ready-timeout-seconds",
        type=float,
        default=120.0,
        help="Max time to wait for the dashboard to finish booting and render its panels.",
    )
    parser.add_argument(
        "--theme",
        choices=("light", "dark", "none"),
        default="light",
        help="Dashboard theme to capture; light reads better on the white PDF page. "
        "'none' leaves the URL and the browser color scheme untouched.",
    )
    return parser.parse_args()


def with_theme(url: str, theme: str) -> str:
    """Sets Grafana's ?theme= query parameter, replacing any theme already in the URL."""
    if theme == "none":
        return url
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "theme"]
    query.append(("theme", theme))
    return urlunsplit(parts._replace(query=urlencode(query)))


def build_driver(width: int, height: int, timeout_seconds: int, theme: str):
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument(f"--window-size={width},{height}")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    # Dashboards that follow the system color scheme ignore ?theme=, so the
    # headless browser also reports the requested preference (0 dark, 1 light).
    if theme != "none":
        options.add_argument(
            "--blink-settings=preferredColorScheme={}".format(1 if theme == "light" else 0)
        )
    # Selenium >=4.6 resolves a matching chromedriver on its own (Selenium
    # Manager); no webdriver-manager or manual driver path is needed.
    driver = webdriver.Chrome(options=options)
    driver.set_page_load_timeout(timeout_seconds)
    return driver


# Splash text shown by a Grafana Cloud stack that is still booting. Free-tier
# stacks sleep when idle and can take a minute or more to wake, so a fixed wait
# captures the loading screen instead of the dashboard.
BOOTING_MARKERS = (
    "is loading",
    "instance is loading",
    "will be ready shortly",
)


def is_booting(driver) -> bool:
    try:
        text = driver.find_element("tag name", "body").text.lower()
    except Exception:  # noqa: BLE001 - page not ready yet; treat as still booting
        return True
    return any(marker in text for marker in BOOTING_MARKERS)


def wait_until_ready(driver, ready_timeout_seconds: float) -> float:
    """Blocks until the dashboard stops showing a boot splash. Returns seconds waited."""
    deadline = time.monotonic() + ready_timeout_seconds
    start = time.monotonic()
    while time.monotonic() < deadline:
        if not is_booting(driver):
            break
        time.sleep(2)
        driver.refresh()
    return time.monotonic() - start


# Grafana marks each panel with a data-testid and shows a loading bar inside it
# while its query is still running, so a screenshot taken before those clear
# catches empty panels even though the stack itself is already up.
# Panel containers exist long before their queries resolve, so "panels are on
# the page" is not enough: every panel inside the viewport must have drawn
# something (stat text, a chart canvas/svg or a table).
PANELS_RENDERED_JS = """
const loading = document.querySelectorAll('[data-testid="data-testid Panel loading bar"]');
const contents = [...document.querySelectorAll('[data-testid="data-testid panel content"]')]
  .filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; });
const drawn = (el) => el.innerText.trim().length > 0 || el.querySelector('canvas, svg, table') !== null;
return contents.length > 0 && loading.length === 0 && contents.every(drawn);
"""


def wait_for_panels(driver, timeout_seconds: float) -> bool:
    """Blocks until every panel has finished loading. Returns whether they did."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            if driver.execute_script(PANELS_RENDERED_JS):
                return True
        except Exception:  # noqa: BLE001 - page still settling; retry until the deadline
            pass
        time.sleep(1)
    return False


def capture(url: str, output: str, wait_seconds: float, width: int, height: int,
            timeout_seconds: int, full_page: bool, ready_timeout_seconds: float,
            theme: str = "light") -> dict:
    driver = build_driver(width, height, timeout_seconds, theme)
    try:
        driver.get(with_theme(url, theme))
        boot_seconds = wait_until_ready(driver, ready_timeout_seconds)
        still_booting = is_booting(driver)
        panels_rendered = wait_for_panels(driver, max(wait_seconds, 60.0))
        # Panel animations keep running for a moment after the queries resolve,
        # so settle before the screenshot even once everything reports ready.
        time.sleep(wait_seconds)
        os.makedirs(os.path.dirname(os.path.abspath(output)) or ".", exist_ok=True)
        captured_full_page = False
        if full_page and hasattr(driver, "save_full_page_screenshot_as_file"):
            driver.save_full_page_screenshot_as_file(output)
            captured_full_page = True
        else:
            driver.save_screenshot(output)
        size = driver.get_window_size()
        return {
            "path": os.path.abspath(output),
            "url": url,
            "capturedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
                "+00:00", "Z"
            ),
            "widthPx": size.get("width", width),
            "heightPx": size.get("height", height),
            "fullPage": captured_full_page,
            "bootWaitSeconds": round(boot_seconds, 1),
            "stillBooting": still_booting,
            "panelsRendered": panels_rendered,
        }
    finally:
        driver.quit()


def main() -> int:
    args = parse_args()
    try:
        result = capture(
            args.url,
            args.output,
            args.wait_seconds,
            args.width,
            args.height,
            args.timeout_seconds,
            args.full_page,
            args.ready_timeout_seconds,
            args.theme,
        )
    except Exception as error:  # noqa: BLE001 - surfaced as a structured error to the caller
        sys.stderr.write(json.dumps({"error": str(error)}) + "\n")
        return 1
    sys.stdout.write(json.dumps(result) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
