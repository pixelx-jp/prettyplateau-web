#!/usr/bin/env bash
# Bake a curated set of live cities' buildings.parquet into the render-service
# build context, so the first render of each is instant (no runtime fetch).
#
# Source order: a sibling plateau-core checkout if present, else `prettyplateau
# fetch` from the public plateau-bridge index. Only buildings.parquet +
# manifest.json are copied — the heavy 3D Tiles / pmtiles / style are dropped.
#
# Usage:
#   scripts/bake-data.sh                 # default curated set
#   scripts/bake-data.sh shibuya minato  # specific slugs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/render-service/baked-data"
CORE="${PLATEAU_CORE:-${ROOT}/../plateau-core}"

# Curated default: small wards that render fast and look good.
DEFAULT_CITIES=(chiyoda chuo minato bunkyo taito shibuya shinjuku koto meguro kamakura)
CITIES=("${@:-${DEFAULT_CITIES[@]}}")
[ "$#" -gt 0 ] && CITIES=("$@") || CITIES=("${DEFAULT_CITIES[@]}")

mkdir -p "$DEST"
for slug in "${CITIES[@]}"; do
  out="${DEST}/out_${slug}"
  mkdir -p "$out"
  if [ -f "${CORE}/out_${slug}/buildings.parquet" ]; then
    echo "==> baking ${slug} from ${CORE}"
    cp "${CORE}/out_${slug}/buildings.parquet" "${out}/buildings.parquet"
    [ -f "${CORE}/out_${slug}/manifest.json" ] && cp "${CORE}/out_${slug}/manifest.json" "${out}/manifest.json" || true
  else
    echo "==> baking ${slug} via prettyplateau fetch"
    prettyplateau fetch "${slug}" --data-root "$DEST" || {
      echo "    fetch failed for ${slug}; skipping" >&2
      rmdir "$out" 2>/dev/null || true
    }
  fi
done

echo "Baked into ${DEST}:"
du -sh "${DEST}"/out_* 2>/dev/null || true
