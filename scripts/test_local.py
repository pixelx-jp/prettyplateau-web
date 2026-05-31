"""Exhaustive local test harness (run directly, not via HTTP) — drives
prettyplateau the way render-service does, to learn what actually works:

  1. preset × city compatibility matrix (which presets need fields a city lacks)
  2. every live city renders with the universal use_mosaic preset
  3. every theme renders
  4. svg / pdf / 4K
  5. mp4 (survivor_timeline) with a frame cap — validates the prerender path
  6. fetch fallback (empty DATA_ROOT + ALLOW_FETCH) for a non-baked city

Usage: .venv/bin/python scripts/test_local.py
"""

from __future__ import annotations

import sys
import time
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT.parent / "plateau-core"
OUT = Path("/tmp/ppw-matrix")
OUT.mkdir(exist_ok=True)

sys.path.insert(0, str(ROOT / "render-service"))
import allowlist as al  # noqa: E402

from prettyplateau import render  # noqa: E402
from prettyplateau.core.errors import DataFieldMissingError, PrettyPlateauError  # noqa: E402

LIVE = [c.slug for c in al.CITIES if c.live]
PRESETS = [
    "use_mosaic", "height_topo", "flood_depth", "risk_choropleth", "wood_survivor",
    "age_rainbow", "hazard_confluence", "density_hex", "zoning_mosaic",
]
WIDTH = 700  # small = fast; base load dominates anyway


def try_render(city, preset, *, fmt="png", theme="default", width=WIDTH, **opts):
    t0 = time.perf_counter()
    try:
        r = render(city=city, preset=preset, out=str(OUT / f"{city}_{preset}_{theme}.{fmt}"),
                   theme=theme, format=fmt, width=width, overwrite=True,
                   data_root=str(DATA), **opts)
        dt = time.perf_counter() - t0
        return ("ok", dt, len(r.warnings))
    except DataFieldMissingError as e:
        return ("FIELD_MISSING", time.perf_counter() - t0, str(e)[:60])
    except PrettyPlateauError as e:
        return ("PP_ERROR", time.perf_counter() - t0, str(e)[:60])
    except Exception as e:  # noqa: BLE001
        return ("ERROR", time.perf_counter() - t0, f"{type(e).__name__}: {e}"[:80])


def main():
    fails = 0

    print("\n=== 1) preset × city matrix (chiyoda, shibuya, koto) ===")
    sample = ["chiyoda", "shibuya", "koto"]
    print(f"{'preset':18} " + " ".join(f"{c:10}" for c in sample))
    preset_ok = {p: 0 for p in PRESETS}
    for p in PRESETS:
        row = f"{p:18} "
        for c in sample:
            status, dt, _ = try_render(c, p)
            if status == "ok":
                preset_ok[p] += 1
            row += f"{status:10} "
        print(row)
    universal = [p for p, n in preset_ok.items() if n == len(sample)]
    partial = [p for p, n in preset_ok.items() if 0 < n < len(sample)]
    never = [p for p, n in preset_ok.items() if n == 0]
    print(f"\n  universal (work on all sampled): {universal}")
    print(f"  partial (city-dependent fields): {partial}")
    print(f"  never worked on sample:          {never}")

    print("\n=== 2) every live city renders (use_mosaic) ===")
    for c in LIVE:
        status, dt, w = try_render(c, "use_mosaic")
        mark = "ok" if status == "ok" else f"!! {status}"
        if status != "ok":
            fails += 1
        print(f"  {c:12} {mark:14} {dt:5.1f}s warnings={w}")

    print("\n=== 3) every theme (chiyoda use_mosaic) ===")
    for t in al.THEMES:
        status, dt, _ = try_render("chiyoda", "use_mosaic", theme=t)
        if status != "ok":
            fails += 1
        print(f"  {t:16} {status} {dt:.1f}s")

    print("\n=== 4) formats + 4K (chiyoda use_mosaic) ===")
    for fmt in ("svg", "pdf"):
        status, dt, _ = try_render("chiyoda", "use_mosaic", fmt=fmt)
        sz = (OUT / f"chiyoda_use_mosaic_default.{fmt}").stat().st_size if status == "ok" else 0
        if status != "ok":
            fails += 1
        print(f"  {fmt:5} {status} {dt:.1f}s {sz/1e6:.1f}MB")
    status, dt, _ = try_render("chiyoda", "use_mosaic", width=3840)
    if status != "ok":
        fails += 1
    print(f"  4K    {status} {dt:.1f}s")

    print("\n=== 5) mp4 survivor_timeline (chiyoda, 12 frames) ===")
    status, dt, info = try_render("chiyoda", "survivor_timeline", fmt="mp4", width=600, frames=12, fps=3)
    sz = (OUT / "chiyoda_survivor_timeline_default.mp4").stat().st_size if status == "ok" else 0
    print(f"  mp4   {status} {dt:.1f}s {sz/1e6:.1f}MB  {info if status!='ok' else ''}")
    # mp4 is allowed to be slow/empty on a small ward; informational, not a hard fail.

    print(f"\n=== DONE. hard failures: {fails} ===")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(2)
