#!/usr/bin/env bash
# Warm the render cache for the most likely first-view combinations so visitors
# get an instant cache HIT instead of a cold ~60-90s render. Idempotent: once a
# combo is cached (in GCS) it survives deploys, so re-runs are fast HITs.
#
# Usage: scripts/prewarm.sh <render-service-base-url>
set -uo pipefail

BASE="${1:?usage: prewarm.sh <render-service-base-url>}"
WIDTH="${WIDTH:-1400}"

# Curated: the default landing selection first, then a few popular combos.
COMBOS=(
  "shibuya use_mosaic default png"
  "shibuya height_topo default png"
  "minato height_topo default png"
  "shinjuku use_mosaic default png"
  "chiyoda use_mosaic default png"
  "koto flood_depth default png"
)

for c in "${COMBOS[@]}"; do
  read -r city preset theme fmt <<<"$c"
  t0=$SECONDS
  code=$(curl -s -m 600 -o /dev/null -w "%{http_code}" -X POST "$BASE/api/render" \
    -H 'Content-Type: application/json' \
    -d "{\"city\":\"$city\",\"preset\":\"$preset\",\"theme\":\"$theme\",\"format\":\"$fmt\",\"width\":$WIDTH}")
  echo "warm ${city}/${preset}/${theme}.${fmt} -> HTTP ${code} ($((SECONDS - t0))s)"
done
echo "prewarm done"
