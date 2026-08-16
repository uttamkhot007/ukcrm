#!/usr/bin/env python3
"""Theme visual regression harness (screenshot diffs).

Renders the deterministic specimen sheet at /__theme for every
mode x mood x brand combination, then:

  1. compares each screenshot pixel-by-pixel with the committed baseline in
     tests/visual/baselines/ and fails when the difference exceeds a threshold,
  2. runs a dark-token leak detector on every LIGHT screenshot: if a meaningful
     share of pixels is dark, a dark token has leaked back into light mode.

Usage:
    python3 scripts/theme-visual-regression.py                # verify
    python3 scripts/theme-visual-regression.py --update       # refresh baselines
    python3 scripts/theme-visual-regression.py --url http://localhost:8080

Requires the dev server to be running (npm run dev) plus Playwright + Pillow.
Diffs for failing cases are written to tests/visual/diffs/.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BASELINE_DIR = ROOT / "tests" / "visual" / "baselines"
OUTPUT_DIR = ROOT / "tests" / "visual" / "actual"
DIFF_DIR = ROOT / "tests" / "visual" / "diffs"

MOODS = ["default", "ocean", "forest", "sunset", "midnight", "cyber"]
BRANDS = ["emerald", "blue", "purple", "orange"]
MODES = ["light", "dark"]

VIEWPORT = {"width": 1280, "height": 1800}

# A pixel counts as "different" when any channel moves more than this much.
PIXEL_TOLERANCE = 12
# Share of differing pixels that fails the case (anti-aliasing noise headroom).
MAX_DIFF_RATIO = 0.005
# Luminance below which a light-mode pixel is considered a dark-token leak.
DARK_LUMINANCE = 90
# Light mode may legitimately contain dark text/icons; beyond this it is a leak.
MAX_DARK_PIXEL_RATIO = 0.12


def case_name(mode: str, mood: str, brand: str) -> str:
    return f"{mode}--{mood}--{brand}.png"


def luminance_ratio_below(image: Image.Image, threshold: int) -> float:
    grayscale = image.convert("L")
    histogram = grayscale.histogram()
    dark = sum(histogram[:threshold])
    total = sum(histogram) or 1
    return dark / total


def compare(actual_path: Path, baseline_path: Path, diff_path: Path) -> tuple[bool, float]:
    actual = Image.open(actual_path).convert("RGB")
    baseline = Image.open(baseline_path).convert("RGB")
    if actual.size != baseline.size:
        return False, 1.0

    diff = ImageChops.difference(actual, baseline).convert("L")
    mask = diff.point(lambda value: 255 if value > PIXEL_TOLERANCE else 0)
    changed = sum(mask.histogram()[1:])
    ratio = changed / (actual.size[0] * actual.size[1])

    if ratio > MAX_DIFF_RATIO:
        diff_path.parent.mkdir(parents=True, exist_ok=True)
        Image.merge("RGB", (mask, Image.new("L", mask.size, 0), mask)).save(diff_path)
        return False, ratio
    return True, ratio


async def capture_all(base_url: str) -> list[tuple[str, Path]]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    captured: list[tuple[str, Path]] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=1,
            reduced_motion="reduce",
        )
        page = await context.new_page()

        for mode in MODES:
            for mood in MOODS:
                for brand in BRANDS:
                    url = f"{base_url}/__theme?mode={mode}&mood={mood}&brand={brand}"
                    await page.goto(url, wait_until="domcontentloaded")
                    await page.wait_for_selector('[data-testid="theme-gallery"]')
                    await page.wait_for_function(
                        "document.documentElement.getAttribute('data-theme-gallery') === 'ready'"
                    )
                    # Let fonts and chart layout settle; no animations are active.
                    await page.evaluate("document.fonts ? document.fonts.ready : null")
                    await page.wait_for_timeout(250)

                    name = case_name(mode, mood, brand)
                    out = OUTPUT_DIR / name
                    await page.screenshot(path=str(out))
                    captured.append((name, out))

        await browser.close()

    return captured


def verify(captured: list[tuple[str, Path]], update: bool) -> int:
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []

    for name, actual_path in captured:
        baseline_path = BASELINE_DIR / name

        if update or not baseline_path.exists():
            Image.open(actual_path).save(baseline_path)
            action = "updated" if update else "created"
            print(f"  baseline {action}: {name}")
        else:
            ok, ratio = compare(actual_path, baseline_path, DIFF_DIR / name)
            status = "ok" if ok else "DIFF"
            print(f"  {status:4}  {name}  ({ratio * 100:.3f}% changed)")
            if not ok:
                failures.append(f"{name}: {ratio * 100:.3f}% of pixels changed vs baseline")

        if name.startswith("light--"):
            dark_ratio = luminance_ratio_below(
                Image.open(actual_path).convert("RGB"), DARK_LUMINANCE
            )
            if dark_ratio > MAX_DARK_PIXEL_RATIO:
                failures.append(
                    f"{name}: dark-token leak — {dark_ratio * 100:.1f}% of pixels are dark "
                    f"(limit {MAX_DARK_PIXEL_RATIO * 100:.0f}%)"
                )
            print(f"        light-mode dark pixels: {dark_ratio * 100:.1f}%")

    if failures:
        print("\nTheme visual regression FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        print(f"\nDiff images: {DIFF_DIR}")
        print("If the change is intentional, re-run with --update and review the baselines.")
        return 1

    print("\nTheme visual regression passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:8080", help="Base URL of the app")
    parser.add_argument("--update", action="store_true", help="Rewrite baselines")
    args = parser.parse_args()

    print(f"Capturing {len(MODES) * len(MOODS) * len(BRANDS)} theme specimens from {args.url} ...")
    captured = asyncio.run(capture_all(args.url.rstrip("/")))
    return verify(captured, args.update)


if __name__ == "__main__":
    sys.exit(main())
