// API client for the render-service. In dev, requests go to /api (Vite proxies
// to the local uvicorn). In production set VITE_API_BASE to the render-service
// origin (its Cloud Run URL / custom domain).
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export interface City {
  slug: string;
  name_en: string;
  name_ja: string;
  n_buildings: number;
  live: boolean;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  default_format: string;
  kind: "static" | "mp4";
  supports_themes: boolean;
}

export interface Options {
  cities: City[];
  presets: Preset[];
  themes: string[];
  formats: string[];
  width: { default: number; min: number; max: number };
}

export interface RenderParams {
  city: string;
  preset: string;
  theme: string;
  format: string;
  width: number;
}

export interface RenderResult {
  url: string; // object URL for the rendered blob
  blob: Blob;
  format: string;
  cache: string;
  elapsedMs: number | null;
  attribution: string;
  warnings: string[];
}

export async function fetchOptions(): Promise<Options> {
  const res = await fetch(`${API_BASE}/api/options`);
  if (!res.ok) throw new Error(`options failed: ${res.status}`);
  return res.json();
}

export async function render(params: RenderParams): Promise<RenderResult> {
  const res = await fetch(`${API_BASE}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const j = await res.json();
      if (j.detail) detail = j.detail;
    } catch {
      /* non-JSON error */
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const warnings = (res.headers.get("X-Warnings") ?? "")
    .split(" | ")
    .map((w) => w.trim())
    .filter(Boolean);
  return {
    url: URL.createObjectURL(blob),
    blob,
    format: params.format,
    cache: res.headers.get("X-Cache") ?? "",
    elapsedMs: res.headers.get("X-Elapsed-Ms") ? Number(res.headers.get("X-Elapsed-Ms")) : null,
    attribution: res.headers.get("X-Attribution") ?? "© Project PLATEAU / MLIT (CC BY 4.0)",
    warnings,
  };
}
