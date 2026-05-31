# Third-party notices

`prettyplateau-web` is © 2026 Yodo Labs (PixelX Inc. / ピクセルエックス株式会社),
MIT-licensed (see [`LICENSE`](./LICENSE)). It is the hosted live demo for the
[`prettyplateau`](https://github.com/pixelx-jp/prettyplateau) library. This file
documents the third-party obligations involved.

## PLATEAU data

`prettyplateau-web` does **not** redistribute PLATEAU data in this repository.
At runtime the render service reads `buildings.parquet` files published by
[plateau-bridge](https://github.com/pixelx-jp/plateau-bridge) (sibling project),
which derive from the public PLATEAU dataset.

> © Project PLATEAU / MLIT — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Every artifact this service generates (PNG / SVG / PDF / mp4) carries that
attribution **embedded in the image and its file metadata** — it cannot be
disabled. The prerendered showcase media checked into `web/public/showcase/`
carry the same embedded attribution.

## Rendering & fonts

All rendering is performed by [`prettyplateau`](https://github.com/pixelx-jp/prettyplateau)
(MIT). The fonts embedded in generated artifacts (Noto Sans CJK JP, Inter — both
SIL Open Font License 1.1) are bundled and documented by `prettyplateau`; see its
`NOTICE.md`.

## Runtime dependencies

- **render-service** (Python): FastAPI, Uvicorn, `prettyplateau[animation]`
  (matplotlib, geopandas, shapely, pyarrow, pandas, numpy, pillow, imageio-ffmpeg),
  google-cloud-storage. See `render-service/requirements.txt`.
- **web** (TypeScript): React, Vite. See `web/package.json`.

Each retains its own upstream license (MIT / BSD / Apache-2.0 / PSF as
applicable).
