"""Resolve a ``data_root`` for a city so ``prettyplateau.render`` can find its
``buildings.parquet``.

Two sources, checked in order (PLAN.md §4 / §11-E):
  1. ``DATA_ROOT`` — baked into the image at build time (the curated live cities).
     Instant, no network.
  2. ``FETCH_ROOT`` — a writable dir where we download bundles on first use for
     any live city not baked in. Uses prettyplateau's own sha256-verified
     ``fetch_city`` against the public plateau-bridge index.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

log = logging.getLogger("render-service.data")

# Baked, read-mostly. In dev, point this at the sibling plateau-core checkout.
DATA_ROOT = Path(os.environ.get("DATA_ROOT", "../plateau-core")).expanduser()
# Writable scratch for on-demand fetches (Cloud Run's filesystem is writable
# but ephemeral; that's fine — it's a per-instance cache).
FETCH_ROOT = Path(os.environ.get("FETCH_ROOT", "/tmp/ppdata")).expanduser()
# Allow downloading non-baked cities from the public index. Disable to pin the
# service to exactly the baked set (no outbound network at request time).
ALLOW_FETCH = os.environ.get("ALLOW_FETCH", "1") not in ("0", "false", "False", "")


def _has_city(root: Path, slug: str) -> bool:
    return (root / f"out_{slug}" / "buildings.parquet").is_file()


def resolve_data_root(slug: str) -> str:
    """Return a data_root directory that contains ``out_<slug>/buildings.parquet``.

    Raises FileNotFoundError if the city cannot be located and fetching is
    disabled or fails.
    """
    if _has_city(DATA_ROOT, slug):
        return str(DATA_ROOT)
    if _has_city(FETCH_ROOT, slug):
        return str(FETCH_ROOT)
    if not ALLOW_FETCH:
        raise FileNotFoundError(
            f"city {slug!r} is not baked into the image and fetching is disabled"
        )

    from prettyplateau.data.fetch import FetchError, fetch_city

    FETCH_ROOT.mkdir(parents=True, exist_ok=True)
    log.info("fetching bundle for %s into %s", slug, FETCH_ROOT)
    try:
        fetch_city(slug, dest_root=FETCH_ROOT)
    except FetchError as exc:
        raise FileNotFoundError(f"could not fetch city {slug!r}: {exc}") from exc
    if not _has_city(FETCH_ROOT, slug):
        raise FileNotFoundError(f"fetch completed but {slug!r} parquet still missing")
    return str(FETCH_ROOT)
