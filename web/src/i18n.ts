// Bilingual UI strings (EN / 日本語). Japanese is written to read naturally,
// not as a literal translation of the English.

export type Lang = "en" | "ja";

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ja") return saved;
  } catch {
    /* ignore */
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ja")
    ? "ja"
    : "en";
}

export interface Strings {
  tagline: string;
  libLink: string;
  sourceLink: string;
  makeYourOwn: string;
  city: string;
  preset: string;
  theme: string;
  format: string;
  hiRes: string;
  generate: string;
  rendering: (s: string) => string;
  eta: (sec: number, w: number) => string;
  liveGroup: string;
  prerenderGroup: string;
  bldg: (n: number) => string;
  svgHint: string;
  tooLarge: (name: string, n: number) => string;
  mp4Warn: string;
  placeholder: string;
  renderingOf: (city: string, preset: string) => string;
  progress: (cur: string, eta: number) => string;
  download: (fmt: string) => string;
  cached: string;
  elapsed: (s: string) => string;
  pdfReady: string;
  animationHeading: string;
  showcaseTitle: string;
  showcaseCaption: string;
  galleryHeading: string;
  unreachable: (e: string) => string;
  footOpenSource: string;
  footLibrary: string;
  footData: string;
  footThisApp: string;
  footDataLicence: string;
  footAttribution: string;
  footLicences: string;
  presetName: (id: string, fallback: string) => string;
  presetDesc: (id: string, fallback: string) => string;
  themeLabel: (id: string) => string;
}

const PRESET_JA: Record<string, [string, string]> = {
  use_mosaic: ["用途モザイク", "建物を用途別に色分け。ほぼすべての都市で。"],
  height_topo: ["高さトポ", "建物の高さを地形のように段彩で表現。"],
  flood_depth: ["洪水浸水深", "河川洪水の浸水深を建物ごとに表示（データなしはグレー）。"],
  risk_choropleth: ["リスク階級図", "木造 × 1981年以前 × 浸水の重なり。"],
  wood_survivor: ["木造サバイバー", "現存する木造建築を浮かび上がらせる。"],
  age_rainbow: ["築年レインボー", "建築年で色分け。不明な建物はグレーのまま。"],
  hazard_confluence: ["災害重複", "複数のハザードが重なる範囲。"],
  density_hex: ["密度ヘックス", "建物の重心を 250m ヘックス格子で集計。"],
  zoning_mosaic: ["用途地域モザイク", "用途地域の区分を色分け。"],
  survivor_timeline: ["サバイバー・タイムライン", "築年順に建物が現れるアニメーション。"],
};

const THEME_JA: Record<string, string> = {
  default: "デフォルト",
  print: "印刷",
  sakura: "桜",
  summer_matsuri: "夏祭り",
  snow: "雪",
  neon_night: "ネオンナイト",
};

export const STRINGS: Record<Lang, Strings> = {
  en: {
    tagline: "Print-quality city visualizations from Japan's Project PLATEAU open data — rendered live, in your browser.",
    libLink: "prettyplateau library ↗",
    sourceLink: "source ↗",
    makeYourOwn: "Make your own",
    city: "City",
    preset: "Preset",
    theme: "Theme",
    format: "Format",
    hiRes: "4K (slower)",
    generate: "Generate",
    rendering: (s) => `Rendering… ${s}s`,
    eta: (sec, w) => `~${sec}s expected · ${w}px`,
    liveGroup: "Render live",
    prerenderGroup: "Too large — examples only",
    bldg: (n) => `${n.toLocaleString()} bldg`,
    svgHint: "SVG can be large (tens of MB) for dense cities.",
    tooLarge: (name, n) =>
      `${name} has ${n.toLocaleString()} buildings — too large to render live. Pick a smaller city, or see example renders in the gallery below.`,
    mp4Warn: "Animations aren't rendered on demand (each mp4 takes minutes). See the gallery.",
    placeholder: "Pick a city and preset, then hit Generate.",
    renderingOf: (city, preset) => `Rendering ${city} · ${preset}`,
    progress: (cur, eta) => `${cur}s / ~${eta}s`,
    download: (fmt) => `Download ${fmt}`,
    cached: "cached",
    elapsed: (s) => `${s}s`,
    pdfReady: "PDF ready.",
    animationHeading: "Animation",
    showcaseTitle: "Fukuoka · Survivor Timeline",
    showcaseCaption:
      "Buildings revealed by year built. Animation presets (mp4) are prerendered — each takes minutes — so they're shown here rather than generated live.",
    galleryHeading: "Gallery",
    unreachable: (e) => `Could not reach the render service: ${e}`,
    footOpenSource: "Open source",
    footLibrary: "prettyplateau — rendering library",
    footData: "plateau-bridge — building data pipeline",
    footThisApp: "prettyplateau-web — this app",
    footDataLicence: "Data & licence",
    footAttribution:
      "Renders carry © Project PLATEAU / MLIT (CC BY 4.0), embedded in the image and metadata — never removable.",
    footLicences: "Code: MIT · Data: CC BY 4.0",
    presetName: (_id, fallback) => fallback,
    presetDesc: (_id, fallback) => fallback,
    themeLabel: (id) => id,
  },
  ja: {
    tagline: "Project PLATEAU のオープンデータから、印刷品質の都市ビジュアライゼーションをブラウザでその場に生成。",
    libLink: "prettyplateau ライブラリ ↗",
    sourceLink: "ソース ↗",
    makeYourOwn: "自分で作る",
    city: "都市",
    preset: "プリセット",
    theme: "テーマ",
    format: "形式",
    hiRes: "4K（遅め）",
    generate: "生成する",
    rendering: (s) => `生成中… ${s}秒`,
    eta: (sec, w) => `目安 約${sec}秒 · ${w}px`,
    liveGroup: "ライブ生成",
    prerenderGroup: "大きすぎ — 作例のみ",
    bldg: (n) => `${n.toLocaleString()}棟`,
    svgHint: "SVG は建物が密集した都市では数十MBになることがあります。",
    tooLarge: (name, n) =>
      `${name}は${n.toLocaleString()}棟あり、ライブ生成には大きすぎます。小さい都市を選ぶか、下のギャラリーの作例をご覧ください。`,
    mp4Warn: "アニメーションはその場では生成しません（mp4 は1本あたり数分かかります）。ギャラリーをご覧ください。",
    placeholder: "都市とプリセットを選んで「生成する」を押してください。",
    renderingOf: (city, preset) => `${city} · ${preset} を生成中`,
    progress: (cur, eta) => `${cur}秒 / 約${eta}秒`,
    download: (fmt) => `${fmt} をダウンロード`,
    cached: "キャッシュ済み",
    elapsed: (s) => `${s}秒`,
    pdfReady: "PDF を生成しました。",
    animationHeading: "アニメーション",
    showcaseTitle: "福岡 · サバイバー・タイムライン",
    showcaseCaption:
      "建物を築年順に出現させたもの。アニメーション（mp4）は1本あたり数分かかるため、その場生成ではなく事前生成した作例を掲載しています。",
    galleryHeading: "ギャラリー",
    unreachable: (e) => `レンダリングサービスに接続できませんでした: ${e}`,
    footOpenSource: "オープンソース",
    footLibrary: "prettyplateau — レンダリングライブラリ",
    footData: "plateau-bridge — 建物データのパイプライン",
    footThisApp: "prettyplateau-web — このアプリ",
    footDataLicence: "データとライセンス",
    footAttribution:
      "生成物には © Project PLATEAU / MLIT（CC BY 4.0）が画像とメタデータに埋め込まれます（削除不可）。",
    footLicences: "コード: MIT · データ: CC BY 4.0",
    presetName: (id, fallback) => PRESET_JA[id]?.[0] ?? fallback,
    presetDesc: (id, fallback) => PRESET_JA[id]?.[1] ?? fallback,
    themeLabel: (id) => THEME_JA[id] ?? id,
  },
};
