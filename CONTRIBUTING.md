# Contributing to prettyplateau-web

Thanks for your interest! `prettyplateau-web` is the hosted live demo for
[`prettyplateau`](https://github.com/pixelx-jp/prettyplateau) — a thin
FastAPI render service plus a Vite/React frontend. Bug reports, fixes, and
small features are welcome.

## Project layout

- `render-service/` — FastAPI wrapper around `prettyplateau.render`
  (`app.py`, `allowlist.py`, `data.py`, `cache.py`).
- `web/` — Vite + React frontend.
- `scripts/smoke.sh` — end-to-end smoke test of the render service.
- `.github/workflows/deploy.yml` — Cloud Run deploy (gated by the
  `CLOUDRUN_DEPLOY_ENABLED` repo variable; forks never deploy).

## Local development

```bash
# render-service
python3 -m venv .venv
.venv/bin/pip install -e "../prettyplateau[animation]" fastapi "uvicorn[standard]"
cd render-service && DATA_ROOT=../../plateau-core ../.venv/bin/python -m uvicorn app:app --port 8100

# web (separate shell)
cd web && npm install && npm run dev   # proxies /api to :8100
```

Run the smoke test before opening a PR:

```bash
bash scripts/smoke.sh
```

## Invariants to respect

- **Attribution is never disabled.** Every generated artifact carries
  © Project PLATEAU / MLIT (CC BY 4.0) — it is embedded by `prettyplateau`
  itself. Don't add a flag, crop, or path that hides it.
- **All user input stays white-listed** (`render-service/allowlist.py`). No
  free-form value should reach the renderer.
- **No secrets in the repo.** Deploy auth uses Workload Identity Federation;
  GCP/project identifiers live in repo variables/secrets, not in source.

## Pull requests

1. Keep changes focused; match the surrounding style.
2. `npm run build` (web) and `bash scripts/smoke.sh` (service) should pass.
3. Describe what you changed and why.

By contributing you agree your contributions are licensed under the MIT
License (see [`LICENSE`](./LICENSE)).

Questions / partnerships: [pan@yodolabs.jp](mailto:pan@yodolabs.jp)
