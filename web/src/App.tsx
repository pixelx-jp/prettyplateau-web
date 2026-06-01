import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOptions, render, type Options, type RenderResult } from "./api";
import { GALLERY, galleryUrl, caption } from "./gallery";
import { STRINGS, detectLang, type Lang } from "./i18n";

const LIB_REPO = "https://github.com/pixelx-jp/prettyplateau"; // the rendering library
const DATA_REPO = "https://github.com/pixelx-jp/plateau-bridge"; // the data pipeline
const WEB_REPO = "https://github.com/pixelx-jp/prettyplateau-web"; // this app
const YODO = "https://yodolabs.jp";

// Render-time estimate (s), calibrated to the Cloud Run service (CPU-bound,
// ~3-4x slower than a dev laptop): chiyoda 12.5k ≈ 45s, shibuya 42k ≈ 80s at
// ~1400px. Deliberately slightly pessimistic so the progress bar under-promises.
function estimateSeconds(nBuildings: number, width: number): number {
  const base = 30 + nBuildings / 650;
  return Math.round(base * (width / 1400));
}

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang());
  const s = STRINGS[lang];

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

  // Free the previous render's object URL when a new result replaces it (or on
  // unmount). Without this, each generate leaks its blob — tens of MB for an
  // SVG — and memory growth makes the whole page sluggish over a session.
  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  function switchLang(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem("lang", next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
  }

  const cityObj = useMemo(() => opts?.cities.find((c) => c.slug === city), [opts, city]);
  const presetObj = useMemo(() => opts?.presets.find((p) => p.id === preset), [opts, preset]);
  const isMp4Preset = presetObj?.kind === "mp4";
  const cityIsLive = cityObj?.live ?? true;
  const width = hiRes ? 3840 : opts?.width.default ?? 1400;
  const canRender = !!opts && cityIsLive && !isMp4Preset && !busy;
  const eta = cityObj ? estimateSeconds(cityObj.n_buildings, width) : 0;
  const cityName = (c: { name_en: string; name_ja: string }) => (lang === "ja" ? c.name_ja : c.name_en);

  // Detect file-sharing support (iOS/Android): lets us open the native share
  // sheet so the user can tap "Save Image"/"Save Video" → straight to Photos.
  const canShareFiles = typeof navigator !== "undefined" && typeof navigator.canShare === "function";

  async function onSave(r: RenderResult) {
    const fname = `${city}_${preset}.${r.format}`;
    const file = new File([r.blob], fname, { type: r.blob.type || "application/octet-stream" });
    if (canShareFiles && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fname });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return; // user cancelled
      }
    }
    // Desktop / unsupported: plain download.
    const a = document.createElement("a");
    a.href = r.url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

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
        <p className="error">{s.unreachable(error)}</p>
      </div>
    );
  }

  const langToggle = (
    <div className="langtoggle" role="group" aria-label="language">
      <button className={lang === "en" ? "on" : ""} onClick={() => switchLang("en")} type="button">EN</button>
      <button className={lang === "ja" ? "on" : ""} onClick={() => switchLang("ja")} type="button">日本語</button>
    </div>
  );

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-text">
          <h1>prettyplateau</h1>
          <p className="tagline">{s.tagline}</p>
          <p className="os-note">
            {lang === "ja" ? (
              <>
                オープンソースです。<a href={LIB_REPO}>prettyplateau</a> が画像を生成する
                レンダリングライブラリ本体で、このサイトはそれをブラウザから使うデモ。
                <a href={WEB_REPO}>prettyplateau-web</a> はそのサイト自体のソースコードです。
              </>
            ) : (
              <>
                Open source. <a href={LIB_REPO}>prettyplateau</a> is the rendering library
                that makes the images; this site is a browser demo of it, and{" "}
                <a href={WEB_REPO}>prettyplateau-web</a> is the site's own source.
              </>
            )}
          </p>
        </div>
        {langToggle}
      </header>

      <main className="grid">
        <section className="panel">
          <h2>{s.makeYourOwn}</h2>

          <label>
            {s.city}
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <optgroup label={s.liveGroup}>
                {opts?.cities.filter((c) => c.live).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {cityName(c)} · {s.bldg(c.n_buildings)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={s.prerenderGroup}>
                {opts?.cities.filter((c) => !c.live).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {cityName(c)} · {s.bldg(c.n_buildings)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label>
            {s.preset}
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {opts?.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {s.presetName(p.id, p.name)} {p.kind === "mp4" ? "🎬" : ""}
                </option>
              ))}
            </select>
          </label>
          {presetObj && <p className="hint">{s.presetDesc(presetObj.id, presetObj.description)}</p>}

          <label>
            {s.theme}
            <div className="chips">
              {opts?.themes.map((t) => (
                <button
                  key={t}
                  className={t === theme ? "chip on" : "chip"}
                  onClick={() => setTheme(t)}
                  type="button"
                  disabled={presetObj ? !presetObj.supports_themes : false}
                >
                  {s.themeLabel(t)}
                </button>
              ))}
            </div>
          </label>

          <div className="row">
            <label className="grow">
              {s.format}
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
              {s.hiRes}
            </label>
          </div>
          {format === "svg" && <p className="hint">{s.svgHint}</p>}

          {!cityIsLive && cityObj && <p className="warn">{s.tooLarge(cityName(cityObj), cityObj.n_buildings)}</p>}
          {isMp4Preset && <p className="warn">{s.mp4Warn}</p>}

          <button className="generate" onClick={onGenerate} disabled={!canRender} type="button">
            {busy ? s.rendering(elapsed.toFixed(1)) : s.generate}
          </button>
          {canRender && !busy && <p className="hint">{s.eta(eta, width)}</p>}
          {error && <p className="error">{error}</p>}
        </section>

        <section className="stage">
          {busy && (
            <div className="placeholder">
              <div className="spinner" />
              <p>{s.renderingOf(cityObj ? cityName(cityObj) : city, s.presetName(preset, presetObj?.name ?? preset))}</p>
              <p className="hint">{s.progress(elapsed.toFixed(1), eta)}</p>
            </div>
          )}
          {!busy && result && (
            <div className="result">
              {result.format === "png" ? (
                // Only raster previews go inline. A dense-city SVG is tens of
                // MB of vector paths; an <img> of it makes the browser
                // re-rasterize on every reflow (e.g. toggling a theme chip),
                // so SVG/PDF show a download card instead.
                <img src={result.url} alt={`${city} ${preset}`} />
              ) : (
                <div className="placeholder">
                  <p>{result.format === "svg" ? s.svgReady : s.pdfReady}</p>
                </div>
              )}
              <div className="result-bar">
                <button className="download" type="button" onClick={() => onSave(result)}>
                  {canShareFiles ? s.save : s.download(result.format.toUpperCase())}
                </button>
                <span className="meta">
                  {result.cache === "HIT" ? s.cached : result.elapsedMs ? s.elapsed((result.elapsedMs / 1000).toFixed(1)) : ""}
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
              <p>{s.placeholder}</p>
            </div>
          )}
        </section>
      </main>

      <section className="gallery">
        <h2>{s.animationHeading}</h2>
        <figure className="showcase">
          <video controls loop muted playsInline preload="metadata">
            <source src="/showcase/fukuoka_survivor_timeline.mp4" type="video/mp4" />
          </video>
          <figcaption>
            <strong>{s.showcaseTitle}</strong>
            <span>{s.showcaseCaption}</span>
          </figcaption>
        </figure>

        <h2>{s.galleryHeading}</h2>
        <div className="gallery-grid">
          {GALLERY.map((g) => (
            <figure key={g.file}>
              <img loading="lazy" decoding="async" src={galleryUrl(g.file)} alt={g.title} />
              <figcaption>
                <strong>{g.title}</strong>
                <span>{caption(g, lang)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-cols">
          <div className="footer-col">
            <h3>{s.footOpenSource}</h3>
            <a href={LIB_REPO}>{s.footLibrary}</a>
            <a href={DATA_REPO}>{s.footData}</a>
            <a href={WEB_REPO}>{s.footThisApp}</a>
          </div>
          <div className="footer-col">
            <h3>{s.footDataLicence}</h3>
            <span>{s.footAttribution}</span>
            <span>{s.footLicences}</span>
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
