import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOptions, render, type Options, type RenderResult } from "./api";
import { GALLERY, galleryUrl } from "./gallery";

const LIB_REPO = "https://github.com/pixelx-jp/prettyplateau"; // the rendering library
const DATA_REPO = "https://github.com/pixelx-jp/plateau-bridge"; // the data pipeline
const WEB_REPO = "https://github.com/pixelx-jp/prettyplateau-web"; // this app
const YODO = "https://yodolabs.jp";

// Render-time estimate (s), calibrated to the Cloud Run service (CPU-bound,
// ~3-4x slower than a dev laptop): chiyoda 12.5k ≈ 45s, shibuya 42k ≈ 80s at
// ~1400px. Scales with building count and pixel width. Deliberately slightly
// pessimistic so the progress bar under-promises.
function estimateSeconds(nBuildings: number, width: number): number {
  const base = 30 + nBuildings / 650; // seconds at ~1400px
  return Math.round(base * (width / 1400));
}

export function App() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [city, setCity] = useState("shibuya");
  const [preset, setPreset] = useState("use_mosaic");
  const [theme, setTheme] = useState("default");
  const [format, setFormat] = useState("png");
  const [hiRes, setHiRes] = useState(false);

  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RenderResult | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchOptions().then(setOpts).catch((e) => setError(String(e)));
  }, []);

  const cityObj = useMemo(() => opts?.cities.find((c) => c.slug === city), [opts, city]);
  const presetObj = useMemo(() => opts?.presets.find((p) => p.id === preset), [opts, preset]);
  const isMp4Preset = presetObj?.kind === "mp4";
  const cityIsLive = cityObj?.live ?? true;
  const width = hiRes ? 3840 : (opts?.width.default ?? 1800);
  const canRender = !!opts && cityIsLive && !isMp4Preset && !busy;

  const eta = cityObj ? estimateSeconds(cityObj.n_buildings, width) : 0;

  async function onGenerate() {
    if (!canRender) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setElapsed(0);
    const start = Date.now();
    timerRef.current = window.setInterval(() => setElapsed((Date.now() - start) / 1000), 200);
    try {
      const r = await render({ city, preset, theme, format, width });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setBusy(false);
    }
  }

  if (error && !opts) {
    return (
      <div className="shell">
        <p className="error">Could not reach the render service: {error}</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="hero">
        <a className="brand" href={YODO} target="_blank" rel="noreferrer">
          <img src="/yodo-labs-logo.svg" alt="Yodo Labs" />
        </a>
        <div className="hero-text">
          <h1>prettyplateau</h1>
          <p className="tagline">
            Print-quality city visualizations from Japan's <a href="https://www.mlit.go.jp/plateau/">Project PLATEAU</a> open data —
            rendered live, in your browser.
          </p>
          <p className="links">
            <a href={LIB_REPO}>prettyplateau library ↗</a>
            <a href={WEB_REPO}>source ↗</a>
            <a href="https://pypi.org/project/prettyplateau/">PyPI ↗</a>
          </p>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Make your own</h2>

          <label>
            City
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <optgroup label="Render live">
                {opts?.cities.filter((c) => c.live).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name_en} {c.name_ja} · {c.n_buildings.toLocaleString()} bldg
                  </option>
                ))}
              </optgroup>
              <optgroup label="Too large — prerendered only">
                {opts?.cities.filter((c) => !c.live).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name_en} {c.name_ja} · {c.n_buildings.toLocaleString()} bldg
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label>
            Preset
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {opts?.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.kind === "mp4" ? "(animation)" : ""}
                </option>
              ))}
            </select>
          </label>
          {presetObj && <p className="hint">{presetObj.description}</p>}

          <label>
            Theme
            <div className="chips">
              {opts?.themes.map((t) => (
                <button
                  key={t}
                  className={t === theme ? "chip on" : "chip"}
                  onClick={() => setTheme(t)}
                  type="button"
                  disabled={presetObj ? !presetObj.supports_themes : false}
                >
                  {t}
                </button>
              ))}
            </div>
          </label>

          <div className="row">
            <label className="grow">
              Format
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {opts?.formats.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={hiRes} onChange={(e) => setHiRes(e.target.checked)} />
              4K (slower)
            </label>
          </div>
          {format === "svg" && <p className="hint">SVG can be large (tens of MB) for dense cities.</p>}

          {!cityIsLive && (
            <p className="warn">
              {cityObj?.name_en} has {cityObj?.n_buildings.toLocaleString()} buildings — too large to render live.
              Pick a smaller city, or see example renders in the gallery below.
            </p>
          )}
          {isMp4Preset && (
            <p className="warn">Animations aren't rendered on demand (each mp4 takes minutes). See the gallery.</p>
          )}

          <button className="generate" onClick={onGenerate} disabled={!canRender} type="button">
            {busy ? `Rendering… ${elapsed.toFixed(1)}s` : "Generate"}
          </button>
          {canRender && !busy && <p className="hint">~{eta}s expected · {width}px</p>}
          {error && <p className="error">{error}</p>}
        </section>

        <section className="stage">
          {busy && (
            <div className="placeholder">
              <div className="spinner" />
              <p>Rendering {cityObj?.name_en} · {preset}</p>
              <p className="hint">{elapsed.toFixed(1)}s / ~{eta}s</p>
            </div>
          )}
          {!busy && result && (
            <div className="result">
              {result.format === "pdf" ? (
                <div className="placeholder">
                  <p>PDF ready.</p>
                </div>
              ) : (
                <img src={result.url} alt={`${city} ${preset}`} />
              )}
              <div className="result-bar">
                <a className="download" href={result.url} download={`${city}_${preset}.${result.format}`}>
                  Download {result.format.toUpperCase()}
                </a>
                <span className="meta">
                  {result.cache === "HIT" ? "cached" : result.elapsedMs ? `${(result.elapsedMs / 1000).toFixed(1)}s` : ""}
                </span>
              </div>
              {result.warnings.length > 0 && (
                <ul className="warnings">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!busy && !result && (
            <div className="placeholder">
              <p>Pick a city and preset, then hit Generate.</p>
            </div>
          )}
        </section>
      </main>

      <section className="gallery">
        <h2>Animation</h2>
        <figure className="showcase">
          <video controls loop muted playsInline preload="metadata" poster="">
            <source src="/showcase/fukuoka_survivor_timeline.mp4" type="video/mp4" />
          </video>
          <figcaption>
            <strong>Fukuoka · Survivor Timeline</strong>
            <span>
              Buildings revealed by year built. Animation presets (mp4) are prerendered — each takes minutes — so
              they're shown here rather than generated live.
            </span>
          </figcaption>
        </figure>

        <h2>Gallery</h2>
        <div className="gallery-grid">
          {GALLERY.map((g) => (
            <figure key={g.file}>
              <img loading="lazy" src={galleryUrl(g.file)} alt={g.title} />
              <figcaption>
                <strong>{g.title}</strong>
                <span>{g.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-cols">
          <div className="footer-col">
            <h3>Open source</h3>
            <a href={LIB_REPO}>prettyplateau — rendering library</a>
            <a href={DATA_REPO}>plateau-bridge — building data pipeline</a>
            <a href={WEB_REPO}>prettyplateau-web — this app</a>
          </div>
          <div className="footer-col">
            <h3>Data &amp; licence</h3>
            <span>Renders carry © Project PLATEAU / MLIT (CC BY 4.0), embedded in the image and metadata — never removable.</span>
            <span>Code: MIT · Data: CC BY 4.0</span>
          </div>
          <div className="footer-col footer-brand">
            <a href={YODO} target="_blank" rel="noreferrer">
              <img src="/yodo-labs-logo.svg" alt="Yodo Labs" />
            </a>
            <span>Yodo Labs · PixelX Inc.</span>
            <span>ピクセルエックス株式会社 · 東京</span>
            <a href={YODO}>yodolabs.jp</a>
            <a href="mailto:pan@yodolabs.jp">pan@yodolabs.jp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
