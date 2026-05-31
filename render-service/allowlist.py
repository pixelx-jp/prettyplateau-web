"""White-lists and hard caps for the public render endpoint.

Everything a user can ask for is constrained here — there is no free-form
input that reaches ``prettyplateau.render`` unchecked. Cities are split into
``live`` (rendered on demand) and ``prerender`` (too large to render live;
served from cache only — see PLAN.md §11-B/§11-E for the measured memory
reasoning: ~1GB base + ~26KB/building, so >150k buildings blows past an 8GiB
instance).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class City:
    slug: str
    name_en: str
    name_ja: str
    n_buildings: int
    live: bool  # True = render on demand; False = cache/prerender only


# Building counts from the public plateau-bridge index.json (29 cities).
# live = n_buildings < 150_000 (fits an 8GiB Cloud Run instance with headroom).
CITIES: tuple[City, ...] = (
    City("chiyoda", "Chiyoda", "千代田区", 12541, True),
    City("chuo", "Chuo", "中央区", 16884, True),
    City("minato", "Minato", "港区", 32131, True),
    City("bunkyo", "Bunkyo", "文京区", 39542, True),
    City("taito", "Taito", "台東区", 41435, True),
    City("shibuya", "Shibuya", "渋谷区", 41829, True),
    City("arakawa", "Arakawa", "荒川区", 44403, True),
    City("sumida", "Sumida", "墨田区", 52945, True),
    City("meguro", "Meguro", "目黒区", 55365, True),
    City("shinjuku", "Shinjuku", "新宿区", 57474, True),
    City("toshima", "Toshima", "豊島区", 57788, True),
    City("koto", "Koto", "江東区", 65401, True),
    City("shinagawa", "Shinagawa", "品川区", 68126, True),
    City("kamakura", "Kamakura", "鎌倉市", 69111, True),
    City("nakano", "Nakano", "中野区", 73015, True),
    City("kita", "Kita", "北区", 73316, True),
    City("itabashi", "Itabashi", "板橋区", 106769, True),
    City("katsushika", "Katsushika", "葛飾区", 118543, True),
    City("suginami", "Suginami", "杉並区", 143453, True),
    City("edogawa", "Edogawa", "江戸川区", 145332, True),
    # Too large to render live — served from prerendered cache only.
    City("ota", "Ota", "大田区", 156650, False),
    City("adachi", "Adachi", "足立区", 167100, False),
    City("nerima", "Nerima", "練馬区", 176987, False),
    City("setagaya", "Setagaya", "世田谷区", 204691, False),
    City("fukuoka", "Fukuoka", "福岡市", 355388, False),
    City("osaka", "Osaka", "大阪市", 615513, False),
    City("sapporo", "Sapporo", "札幌市", 646431, False),
    City("nagoya", "Nagoya", "名古屋市", 736866, False),
    City("yokohama", "Yokohama", "横浜市", 882831, False),
)

CITY_BY_SLUG: dict[str, City] = {c.slug: c for c in CITIES}
LIVE_CITY_SLUGS: frozenset[str] = frozenset(c.slug for c in CITIES if c.live)

# Themes shipped by prettyplateau (style/theme.py). Hard-coded as the public
# surface; the renderer falls back to `default` for anything unknown anyway.
THEMES: tuple[str, ...] = (
    "default",
    "print",
    "sakura",
    "summer_matsuri",
    "snow",
    "neon_night",
)

# Formats a user may request for a *live* render. mp4 is intentionally excluded
# from live rendering (see PLAN.md §11-B) — animation presets are prerendered.
LIVE_FORMATS: frozenset[str] = frozenset({"png", "svg", "pdf"})

# Render size caps. On-screen default is modest (server-side matplotlib on
# Cloud Run is CPU-bound — see App.tsx estimate); 4K is opt-in for download.
DEFAULT_WIDTH = 1400
MIN_WIDTH = 600
MAX_WIDTH = 4096
