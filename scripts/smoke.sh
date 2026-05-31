#!/usr/bin/env bash
# End-to-end smoke test for the render-service. Boots uvicorn against the
# sibling plateau-core data, exercises every endpoint + the guardrails, and
# tears down. Exit 0 = all green.
#
# Usage: scripts/smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${SMOKE_PORT:-8131}"
BASE="http://127.0.0.1:${PORT}"
VENV="${ROOT}/.venv/bin"
SVC="${ROOT}/render-service"
DATA="${PLATEAU_CORE:-${ROOT}/../plateau-core}"
TMP="$(mktemp -d)"
PID=""

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗ %s\033[0m\n" "$1"; echo "--- service log ---"; tail -25 "${TMP}/uv.log" 2>/dev/null; cleanup; exit 1; }
cleanup() { [ -n "$PID" ] && kill "$PID" 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT

echo "== booting render-service on :${PORT} (data=${DATA}) =="
( cd "$SVC" && DATA_ROOT="$DATA" LOCAL_CACHE_DIR="${TMP}/cache" ALLOW_FETCH=0 \
    "${VENV}/python" -m uvicorn app:app --host 127.0.0.1 --port "$PORT" --log-level warning \
    >"${TMP}/uv.log" 2>&1 ) &
PID=$!

for _ in $(seq 1 30); do
  curl -sf "${BASE}/api/healthz" >/dev/null 2>&1 && break
  sleep 0.5
done
curl -sf "${BASE}/api/healthz" >/dev/null || fail "service did not become healthy (see ${TMP}/uv.log)"
pass "healthz"

echo "== checks =="

# 1. options shape
n_cities=$(curl -sf "${BASE}/api/options" | "${VENV}/python" -c "import sys,json;print(len(json.load(sys.stdin)['cities']))")
[ "$n_cities" = "29" ] && pass "options lists 29 cities" || fail "expected 29 cities, got ${n_cities}"

# 2. live render (MISS) → valid PNG with attribution
code=$(curl -s -D "${TMP}/h.txt" -o "${TMP}/r.png" -w "%{http_code}" -X POST "${BASE}/api/render" \
  -H 'Content-Type: application/json' \
  -d '{"city":"chiyoda","preset":"use_mosaic","format":"png","width":1000}')
[ "$code" = "200" ] || fail "render returned ${code}"
grep -qi "^x-cache: MISS" "${TMP}/h.txt" || fail "expected cache MISS on first render"
"${VENV}/python" -c "import sys; sys.exit(0 if open('${TMP}/r.png','rb').read(8)==b'\x89PNG\r\n\x1a\n' else 1)" \
  || fail "render output is not a valid PNG"
# LC_ALL=C: the © byte (0xA9) in the attribution value is not valid UTF-8, which
# trips regex `.` matching under a UTF-8 locale.
LC_ALL=C grep -qi "^x-attribution:" "${TMP}/h.txt" && LC_ALL=C grep -qi "PLATEAU" "${TMP}/h.txt" \
  || fail "attribution header missing"
pass "live render → valid PNG + attribution"

# 3. same request again → cache HIT
code2=$(curl -s -D "${TMP}/h2.txt" -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/render" \
  -H 'Content-Type: application/json' \
  -d '{"city":"chiyoda","preset":"use_mosaic","format":"png","width":1000}')
grep -qi "^x-cache: HIT" "${TMP}/h2.txt" || fail "expected cache HIT on repeat"
pass "repeat render → cache HIT"

# 4. PDF format
code=$(curl -s -o "${TMP}/r.pdf" -w "%{http_code}" -X POST "${BASE}/api/render" \
  -H 'Content-Type: application/json' -d '{"city":"chiyoda","preset":"use_mosaic","format":"pdf","width":900}')
[ "$code" = "200" ] && head -c4 "${TMP}/r.pdf" | grep -q "%PDF" && pass "PDF render" || fail "PDF render failed (${code})"

# 5. guardrails: big city → 422, mp4 → 422, bad preset → 404
g1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/render" -H 'Content-Type: application/json' -d '{"city":"osaka","preset":"use_mosaic"}')
[ "$g1" = "422" ] && pass "oversized city rejected (422)" || fail "expected 422 for osaka, got ${g1}"
g2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/render" -H 'Content-Type: application/json' -d '{"city":"chiyoda","preset":"survivor_timeline","format":"mp4"}')
[ "$g2" = "422" ] && pass "live mp4 rejected (422)" || fail "expected 422 for mp4, got ${g2}"
g3=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/api/render" -H 'Content-Type: application/json' -d '{"city":"chiyoda","preset":"nope"}')
[ "$g3" = "404" ] && pass "unknown preset rejected (404)" || fail "expected 404 for bad preset, got ${g3}"

printf "\n\033[32mAll smoke checks passed.\033[0m\n"
