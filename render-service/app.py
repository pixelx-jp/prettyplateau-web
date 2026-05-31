"""prettyplateau-web render service — a thin FastAPI wrapper around
``prettyplateau.render``.

Endpoints:
  GET  /healthz       liveness
  GET  /api/options   white-listed cities / presets / themes / formats
  POST /api/render    render one artifact (cache-first), return the bytes

All user input is constrained by allowlist.py; nothing free-form reaches the
renderer. See PLAN.md for the full design.
"""

from __future__ import annotations

import asyncio
import logging
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

import allowlist as al
from cache import CACHE, cache_key
from data import resolve_data_root

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("render-service")

app = FastAPI(title="prettyplateau-web render service", version="0.1.0")

# CORS: the static frontend is served from a different origin in production
# (PLAN.md §11-C). Lock to the configured origins; default permissive only for
# local dev convenience.
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# matplotlib is not safe to drive concurrently and a render is CPU-bound; we
# serialize renders (Cloud Run also runs concurrency=1) and offload the blocking
# work off the event loop.
_RENDER_LOCK = asyncio.Semaphore(1)

# Abuse / cost guard (PLAN.md §8, as revised): instead of weak per-IP counting
# (useless behind serverless scale-to-zero), cap concurrent *render* work and
# return 429 when busy. One render runs while at most (MAX_INFLIGHT-1) wait; the
# rest are rejected so a single client can't pile up expensive work. The hard
# cost ceiling is Cloud Run --max-instances. Cache hits bypass this entirely.
MAX_INFLIGHT = int(os.environ.get("MAX_INFLIGHT", "2"))
_inflight = 0

_CONTENT_TYPE = {
    "png": "image/png",
    "svg": "image/svg+xml",
    "pdf": "application/pdf",
    "mp4": "video/mp4",
}


# Note: served under /api because Cloud Run's Google Front End intercepts the
# bare /healthz path (returns its own 404 before the request reaches us).
@app.get("/api/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/options")
def options() -> JSONResponse:
    from prettyplateau import list_presets
    from prettyplateau.style.theme import list_themes

    presets = []
    for p in list_presets():
        kind = "mp4" if (p.default_format == "mp4" or "animation" in p.modes) else "static"
        presets.append(
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "default_format": p.default_format,
                "kind": kind,
                "supports_themes": p.supports_themes,
            }
        )

    available_themes = {t.id for t in list_themes()}
    themes = [t for t in al.THEMES if t in available_themes]

    cities = [
        {
            "slug": c.slug,
            "name_en": c.name_en,
            "name_ja": c.name_ja,
            "n_buildings": c.n_buildings,
            "live": c.live,
        }
        for c in al.CITIES
    ]

    return JSONResponse(
        {
            "cities": cities,
            "presets": presets,
            "themes": themes,
            "formats": sorted(al.LIVE_FORMATS),
            "width": {
                "default": al.DEFAULT_WIDTH,
                "min": al.MIN_WIDTH,
                "max": al.MAX_WIDTH,
            },
        }
    )


class RenderBody(BaseModel):
    city: str
    preset: str
    theme: str = "default"
    format: str = "png"
    width: int = Field(default=al.DEFAULT_WIDTH)


def _validate(body: RenderBody) -> tuple[al.City, str, str, str, int]:
    city = al.CITY_BY_SLUG.get(body.city)
    if city is None:
        raise HTTPException(404, f"unknown city {body.city!r}")
    if not city.live:
        raise HTTPException(
            422,
            f"{city.name_en} ({city.n_buildings:,} buildings) is too large to render "
            f"live — see the gallery for example renders of larger cities.",
        )

    fmt = body.format.lower()
    if fmt not in al.LIVE_FORMATS:
        raise HTTPException(
            422,
            f"{fmt!r} is not available for live render; animations are not rendered "
            f"on demand (each mp4 takes minutes).",
        )

    theme = body.theme if body.theme in al.THEMES else "default"

    valid_presets = {p.id for p in _preset_ids()}
    if body.preset not in valid_presets:
        raise HTTPException(404, f"unknown preset {body.preset!r}")

    width = max(al.MIN_WIDTH, min(al.MAX_WIDTH, int(body.width)))
    return city, body.preset, theme, fmt, width


def _preset_ids():
    from prettyplateau import list_presets

    return list_presets()


def _do_render(city_slug: str, preset: str, theme: str, fmt: str, width: int) -> tuple[bytes, dict]:
    """Blocking render. Returns (bytes, meta). Runs in a thread."""
    from prettyplateau import render
    from prettyplateau.core.errors import DataFieldMissingError, PrettyPlateauError

    data_root = resolve_data_root(city_slug)
    with tempfile.TemporaryDirectory() as tmp:
        out_path = Path(tmp) / f"{city_slug}.{fmt}"
        try:
            result = render(
                city=city_slug,
                preset=preset,
                out=str(out_path),
                theme=theme,
                format=fmt,  # type: ignore[arg-type]  # validated ∈ LIVE_FORMATS
                width=width,
                overwrite=True,
                data_root=data_root,
            )
        except DataFieldMissingError as exc:
            raise HTTPException(
                422,
                f"preset {preset!r} needs data field that {city_slug!r} lacks: {exc}",
            ) from exc
        except PrettyPlateauError as exc:
            raise HTTPException(422, f"render failed: {exc}") from exc
        data = out_path.read_bytes()
    meta = {
        "elapsed_ms": result.elapsed_ms,
        "attribution": result.attribution,
        "warnings": list(result.warnings),
        "width": result.width,
        "height": result.height,
        "dataset_id": result.dataset_id,
    }
    return data, meta


def _ascii_safe(value: str) -> str:
    """HTTP header values are latin-1; drop anything outside it so a stray
    non-latin-1 char (e.g. a Japanese dataset_id) can't 500 the response.
    Attribution is also baked into the artifact itself, so this is lossless
    where it matters."""
    return value.encode("latin-1", "ignore").decode("latin-1")


def _response(data: bytes, fmt: str, city_slug: str, preset: str, meta: dict, cached: bool) -> Response:
    headers = {
        "Content-Disposition": f'inline; filename="{city_slug}_{preset}.{fmt}"',
        "X-Cache": "HIT" if cached else "MISS",
        "X-Attribution": _ascii_safe(meta.get("attribution", "")),
    }
    if meta.get("elapsed_ms") is not None:
        headers["X-Elapsed-Ms"] = str(meta["elapsed_ms"])
    if meta.get("warnings"):
        headers["X-Warnings"] = _ascii_safe(" | ".join(meta["warnings"]))[:900]
    return Response(content=data, media_type=_CONTENT_TYPE.get(fmt, "application/octet-stream"), headers=headers)


@app.post("/api/render")
async def render_endpoint(body: RenderBody) -> Response:
    city, preset, theme, fmt, width = _validate(body)
    key = cache_key(city=city.slug, preset=preset, theme=theme, fmt=fmt, width=width)

    cached = await asyncio.to_thread(CACHE.get, key, fmt)
    if cached is not None:
        log.info("cache HIT %s/%s/%s.%s", city.slug, preset, theme, fmt)
        return _response(cached, fmt, city.slug, preset, {"attribution": ""}, cached=True)

    global _inflight
    if _inflight >= MAX_INFLIGHT:  # atomic w.r.t. the line below (no await between)
        raise HTTPException(429, "render service is busy; please retry in a moment")
    _inflight += 1
    try:
        async with _RENDER_LOCK:
            # re-check: another request may have filled the cache while we waited
            cached = await asyncio.to_thread(CACHE.get, key, fmt)
            if cached is not None:
                return _response(cached, fmt, city.slug, preset, {"attribution": ""}, cached=True)

            log.info("render %s/%s/%s.%s w=%d", city.slug, preset, theme, fmt, width)
            data, meta = await asyncio.to_thread(_do_render, city.slug, preset, theme, fmt, width)
            await asyncio.to_thread(
                CACHE.put, key, fmt, data, _CONTENT_TYPE.get(fmt, "application/octet-stream")
            )
            return _response(data, fmt, city.slug, preset, meta, cached=False)
    finally:
        _inflight -= 1
