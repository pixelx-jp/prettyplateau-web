"""Rendered-artifact cache.

Key = sha256 of the render parameters. A hit means we never re-run matplotlib,
so popular city×preset×theme×format combinations cost zero compute on repeat
(PLAN.md §8). Two backends, chosen by env:

  - GCS (``GCS_CACHE_BUCKET`` set) — survives scale-to-zero / new instances.
  - Local dir (default) — for development and as a fallback.

We serve the bytes back through the service rather than handing out signed
URLs: simpler, uniform across both backends, and fine at the demo's low
traffic.
"""

from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path

log = logging.getLogger("render-service.cache")

_BUCKET = os.environ.get("GCS_CACHE_BUCKET", "").strip()
_PREFIX = os.environ.get("GCS_CACHE_PREFIX", "cache").strip("/")
_LOCAL_DIR = Path(os.environ.get("LOCAL_CACHE_DIR", "/tmp/ppcache")).expanduser()


def cache_key(*, city: str, preset: str, theme: str, fmt: str, width: int) -> str:
    raw = f"v1|{city}|{preset}|{theme}|{fmt}|{width}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _object_name(key: str, fmt: str) -> str:
    return f"{_PREFIX}/{key}.{fmt}"


class _GcsCache:
    def __init__(self, bucket_name: str):
        from google.cloud import storage  # imported lazily so dev needs no GCS

        self._client = storage.Client()
        self._bucket = self._client.bucket(bucket_name)
        log.info("cache backend = GCS bucket %s", bucket_name)

    def get(self, key: str, fmt: str) -> bytes | None:
        blob = self._bucket.blob(_object_name(key, fmt))
        if not blob.exists():
            return None
        return blob.download_as_bytes()

    def put(self, key: str, fmt: str, data: bytes, content_type: str) -> None:
        blob = self._bucket.blob(_object_name(key, fmt))
        blob.upload_from_string(data, content_type=content_type)


class _LocalCache:
    def __init__(self, root: Path):
        self._root = root
        self._root.mkdir(parents=True, exist_ok=True)
        log.info("cache backend = local dir %s", root)

    def _path(self, key: str, fmt: str) -> Path:
        return self._root / f"{key}.{fmt}"

    def get(self, key: str, fmt: str) -> bytes | None:
        p = self._path(key, fmt)
        return p.read_bytes() if p.is_file() else None

    def put(self, key: str, fmt: str, data: bytes, content_type: str) -> None:
        self._path(key, fmt).write_bytes(data)


def _make_cache():
    if _BUCKET:
        try:
            return _GcsCache(_BUCKET)
        except Exception as exc:  # noqa: BLE001 — fall back rather than crash boot
            log.warning("GCS cache init failed (%s); falling back to local dir", exc)
    return _LocalCache(_LOCAL_DIR)


CACHE = _make_cache()
