// Curated showcase images, hot-linked from the prettyplateau repo's gallery so
// we don't vendor binaries here. These are the instant-browse "static" layer;
// the interactive renderer is the "make your own" layer.
const RAW = "https://raw.githubusercontent.com/pixelx-jp/prettyplateau/main/gallery";

export interface GalleryItem {
  file: string;
  title: string;
  caption: string;
}

export const GALLERY: GalleryItem[] = [
  { file: "shibuya_use_mosaic.png", title: "Shibuya · Use Mosaic", caption: "Every building coloured by usage." },
  { file: "minato_height_topo.png", title: "Minato · Height Topo", caption: "Skyline as a topographic ramp by height." },
  { file: "koto_flood_depth.png", title: "Kōtō · Flood Depth", caption: "River-flood exposure; grey = no survey data." },
  { file: "shinjuku_density_hex.png", title: "Shinjuku · Density Hex", caption: "Station density on a 250 m hex lattice." },
  { file: "fukuoka_age_rainbow.png", title: "Fukuoka · Age Rainbow", caption: "Coloured by year built; unknowns stay grey." },
  { file: "edogawa_risk_choropleth.png", title: "Edogawa · Risk Choropleth", caption: "Wood × pre-1981 × flood intersection." },
  { file: "kamakura_wood_survivor.png", title: "Kamakura · Wood Survivor", caption: "Surviving wooden structures." },
  { file: "shibuya_zoning_mosaic.png", title: "Shibuya · Zoning Mosaic", caption: "用途地域 zoning categories." },
  // Large cities — too big to render live (served as examples here).
  { file: "osaka_use_mosaic.png", title: "Osaka · Use Mosaic", caption: "615k buildings — too large to render live." },
  { file: "sapporo_age_rainbow.png", title: "Sapporo · Age Rainbow", caption: "646k buildings, coloured by year built." },
  { file: "nagoya_height_topo.png", title: "Nagoya · Height Topo", caption: "737k buildings as a height ramp." },
  { file: "yokohama_density_hex.png", title: "Yokohama · Density Hex", caption: "883k buildings on a hex lattice." },
];

export const galleryUrl = (file: string) => `${RAW}/${file}`;
