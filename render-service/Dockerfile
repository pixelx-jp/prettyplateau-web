# Pure pip-wheel image: no system GDAL / cairo / ffmpeg (PLAN.md §11-A).
# - SVG/PDF use matplotlib's native backends.
# - mp4 uses imageio-ffmpeg's bundled static ffmpeg.
# - parquet is read via pyarrow + shapely.wkb (no GDAL); plateau_bridge is NOT
#   installed, so the admin-geojson code path that would need GDAL stays off.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_ROOT=/data \
    FETCH_ROOT=/tmp/ppdata \
    LOCAL_CACHE_DIR=/tmp/ppcache

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py allowlist.py cache.py data.py bake.py ./

# Optional local pre-bake (scripts/bake-data.sh writes here); usually just .gitkeep.
COPY baked-data/ /data/

# Bake curated small cities at build time so their first render is instant (no
# runtime fetch). Pulled from the public plateau-bridge index, then stripped to
# just buildings.parquet + manifest.json to keep the image lean. Other live
# cities still fetch on first use at runtime (ALLOW_FETCH=1).
ARG BAKE_CITIES="chiyoda chuo minato bunkyo taito shibuya shinjuku koto meguro kamakura"
ENV BAKE_CITIES=${BAKE_CITIES}
RUN python bake.py \
 && find /data -type f ! -name 'buildings.parquet' ! -name 'manifest.json' -delete \
 && find /data -mindepth 1 -type d -empty -delete \
 && rm -rf /root/.cache/prettyplateau \
 && echo "baked data size:" && du -sh /data

# Cloud Run injects $PORT (default 8080). One worker: renders are serialized and
# memory-heavy, and Cloud Run scales by instances, not in-process workers.
ENV PORT=8080
CMD exec uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1
