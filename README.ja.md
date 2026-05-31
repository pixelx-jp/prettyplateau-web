<h1 align="center">prettyplateau-web</h1>

<p align="center">
  <strong>印刷品質の <a href="https://www.mlit.go.jp/plateau/">Project PLATEAU</a> 都市マップをブラウザで生成。</strong><br/>
  ライブラリ <a href="https://github.com/pixelx-jp/prettyplateau"><code>prettyplateau</code></a> の公式ライブデモです。
</p>

<p align="center">
  <a href="https://github.com/pixelx-jp/prettyplateau-web/actions/workflows/deploy.yml"><img src="https://github.com/pixelx-jp/prettyplateau-web/actions/workflows/deploy.yml/badge.svg" alt="Deploy" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.mlit.go.jp/plateau/"><img src="https://img.shields.io/badge/Data-CC%20BY%204.0-orange.svg" alt="Data: CC BY 4.0" /></a>
</p>

<p align="center">
  <a href="https://prettyplateau.plateau.yodolabs.jp"><strong>🌐 ライブデモ →</strong></a>
  &nbsp;·&nbsp;
  <a href="./README.md">English README →</a>
</p>

---

都市・プリセット・テーマ・形式を選ぶだけで、印刷品質の都市マップ（PNG / SVG / PDF /
mp4）をブラウザで生成・ダウンロードできます。これは
[`prettyplateau`](https://github.com/pixelx-jp/prettyplateau) レンダリングライブラリ
のブラウザ版ライブデモです。

Yodo Labs の PLATEAU オープンソース群の一部です:
[`prettyplateau`](https://github.com/pixelx-jp/prettyplateau)（このデモが動かすレンダラ）
· [`plateau-bridge`](https://github.com/pixelx-jp/plateau-bridge)（読み込む建物データの
パイプライン）· [`plateau-risk-lens`](https://github.com/pixelx-jp/plateau-risk-lens)
（別の姉妹プロジェクト — 2D 災害リスク解説）。

## アーキテクチャ

```
web (静的, Vite+React)  ──POST /api/render──►  render-service (FastAPI, Python)
  Cloud Run nginx                               Cloud Run, min-instances=0
                                                prettyplateau[animation]
                                                       │
                                    データ: 公開 plateau-bridge（29都市）
                                    キャッシュ: GCS（任意）/ ローカル
```

- **render-service** は `prettyplateau.render` の薄いラッパーです。入力はすべて
  ホワイトリスト化（`render-service/allowlist.py`）され、キャッシュ優先のため同じ
  組み合わせの再生成は計算ゼロです。
- **ライブ生成と事前生成**: 建物 15 万未満の都市はオンデマンド生成。より大きな都市と
  mp4 アニメーションはギャラリーの作例として表示します（サーバー側 matplotlib は
  メモリ・CPU を要し、大都市は数分かかるため）。

## エンドポイント

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/healthz` | 死活監視（Cloud Run の GFE が裸の `/healthz` を横取りするため `/api` 配下） |
| GET | `/api/options` | ホワイトリスト化された都市 / プリセット / テーマ / 形式 |
| POST | `/api/render` | 1 件のレンダリング（キャッシュ優先）、バイト列を返す |

## ローカル開発

```bash
# render-service
python3 -m venv .venv
.venv/bin/pip install -e "../prettyplateau[animation]" fastapi "uvicorn[standard]"
cd render-service && DATA_ROOT=../../plateau-core ../.venv/bin/python -m uvicorn app:app --port 8100

# web（別シェル）
cd web && npm install && npm run dev   # /api を :8100 にプロキシ
```

エンドツーエンドのスモークテスト:

```bash
bash scripts/smoke.sh
```

## デプロイ（Cloud Run）

GCP プロジェクト上の 2 サービス（render-service / web）を GitHub Actions
（`.github/workflows/deploy.yml`、Workload Identity Federation 認証）でデプロイ
します。`CLOUDRUN_DEPLOY_ENABLED` リポジトリ変数でゲートされ、フォークでは
デプロイされません。

## ライセンス

- コード: MIT（[`LICENSE`](./LICENSE)）
- 生成物には © Project PLATEAU / MLIT（CC BY 4.0）が画像とファイルメタデータに
  埋め込まれます（無効化不可）。
- サードパーティ通知: [`NOTICE.md`](./NOTICE.md)

---

<div align="center">
Built by <a href="https://yodolabs.jp"><strong>Yodo Labs</strong></a> · PixelX Inc.（ピクセルエックス株式会社）· 東京
<br/>
お問い合わせ / 協業: <a href="mailto:pan@yodolabs.jp">pan@yodolabs.jp</a>
</div>
