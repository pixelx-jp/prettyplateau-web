// Curated showcase images, hot-linked from the prettyplateau repo's gallery so
// we don't vendor binaries here. These are the instant-browse "static" layer;
// the interactive renderer is the "make your own" layer.
import type { Lang } from "./i18n";

const RAW = "https://raw.githubusercontent.com/pixelx-jp/prettyplateau/main/gallery";

export interface GalleryItem {
  file: string;
  title: string;
  caption: { en: string; ja: string };
}

export const GALLERY: GalleryItem[] = [
  { file: "shibuya_use_mosaic.png", title: "Shibuya 渋谷区 · Use Mosaic", caption: { en: "Every building coloured by usage.", ja: "建物を用途別に色分け。" } },
  { file: "minato_height_topo.png", title: "Minato 港区 · Height Topo", caption: { en: "Skyline as a topographic ramp by height.", ja: "高さを地形のように段彩表示。" } },
  { file: "koto_flood_depth.png", title: "Kōtō 江東区 · Flood Depth", caption: { en: "River-flood exposure; grey = no survey data.", ja: "河川洪水の浸水深。グレーはデータなし。" } },
  { file: "shinjuku_density_hex.png", title: "Shinjuku 新宿区 · Density Hex", caption: { en: "Station density on a 250 m hex lattice.", ja: "250m ヘックス格子で密度を集計。" } },
  { file: "fukuoka_age_rainbow.png", title: "Fukuoka 福岡市 · Age Rainbow", caption: { en: "Coloured by year built; unknowns stay grey.", ja: "築年で色分け。不明はグレーのまま。" } },
  { file: "edogawa_risk_choropleth.png", title: "Edogawa 江戸川区 · Risk Choropleth", caption: { en: "Wood × pre-1981 × flood intersection.", ja: "木造 × 1981年以前 × 浸水の重なり。" } },
  { file: "kamakura_wood_survivor.png", title: "Kamakura 鎌倉市 · Wood Survivor", caption: { en: "Surviving wooden structures.", ja: "現存する木造建築。" } },
  { file: "shibuya_zoning_mosaic.png", title: "Shibuya 渋谷区 · Zoning Mosaic", caption: { en: "用途地域 zoning categories.", ja: "用途地域の区分。" } },
  // Large cities — too big to render live (shown as examples).
  { file: "osaka_use_mosaic.png", title: "Osaka 大阪市 · Use Mosaic", caption: { en: "615k buildings — too large to render live.", ja: "61万棟 — ライブ生成には大きすぎ。" } },
  { file: "sapporo_age_rainbow.png", title: "Sapporo 札幌市 · Age Rainbow", caption: { en: "646k buildings, coloured by year built.", ja: "65万棟を築年で色分け。" } },
  { file: "nagoya_height_topo.png", title: "Nagoya 名古屋市 · Height Topo", caption: { en: "737k buildings as a height ramp.", ja: "74万棟を高さで段彩。" } },
  { file: "yokohama_density_hex.png", title: "Yokohama 横浜市 · Density Hex", caption: { en: "883k buildings on a hex lattice.", ja: "88万棟をヘックス格子で。" } },
];

export const galleryUrl = (file: string) => `${RAW}/${file}`;
export const caption = (item: GalleryItem, lang: Lang) => item.caption[lang];
