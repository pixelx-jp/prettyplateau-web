"""Build-time helper: fetch curated cities' parquet into /data so their first
render is instant (no runtime download). Run inside the Docker build; reads the
space-separated city slugs from the BAKE_CITIES env var.
"""

from __future__ import annotations

import os
import pathlib

from prettyplateau.data.fetch import fetch_city

root = pathlib.Path("/data")
for slug in os.environ.get("BAKE_CITIES", "").split():
    print(f"baking {slug}", flush=True)
    fetch_city(slug, dest_root=root)
