/* ═══════════════════════════════════════════════════════════════
   sector-bootstrap.js
   Wordt als ALLERLAATSTE script geladen (zie index.html). Verantwoordelijk voor:
   - sector.config.json laden
   - document.title, H1, subtitle, tagline injecteren
   - Theme CSS-vars in :root zetten (kleuren, fonts)
   - Google Fonts link injecteren
   - Categorie-tabs in header genereren
   - Globale window.SECTOR_CONFIG zetten voor alle andere modules
   - init() van app.js triggeren wanneer config klaar is
   ═══════════════════════════════════════════════════════════════ */

(async function bootstrap() {
  let cfg;
  try {
    const res = await fetch("sector.config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    cfg = await res.json();
  } catch (err) {
    document.body.innerHTML =
      '<div style="padding:40px;font-family:sans-serif;color:#c00">' +
      '<h2>❌ sector.config.json kon niet worden geladen</h2>' +
      '<p>' + (err.message || err) + '</p>' +
      '<p>Verifieer dat <code>sector.config.json</code> in dezelfde map staat als <code>index.html</code> en valid JSON bevat.</p>' +
      '</div>';
    return;
  }

  // 1. Globaal beschikbaar maken
  window.SECTOR_CONFIG = cfg;

  // 2. Afgeleide helpers
  cfg.categorie_prioriteit = (cfg.categorieen || []).map(c => c.id);
  cfg.categorie_kleur = Object.fromEntries(
    (cfg.categorieen || []).map(c => [c.id, c.kleur])
  );
  cfg.categorie_label = Object.fromEntries(
    (cfg.categorieen || []).map(c => [c.id, c.label])
  );

  // 3. Document title + favicon
  const titleText = `${cfg.sector_label} — ${cfg.scope_landen.join(" + ")}`;
  document.title = titleText;

  // 4. Google Fonts injecteren
  if (cfg.google_fonts_url) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cfg.google_fonts_url;
    document.head.appendChild(link);
  }

  // 5. CSS-vars in :root injecteren (theme + categorie-kleuren)
  applyThemeVars(cfg);

  // 6. Header + tabs renderen
  renderHeader(cfg);
  renderCategorieTabsBar(cfg);

  // 7. Filter-rij voor categorieën genereren
  renderCategorieFilter(cfg);

  // 8. App initialiseren (app.js exposeert globale init() — wordt door zijn eigen DOMContentLoaded-listener gestart óf hier expliciet)
  if (typeof window.startApp === "function") {
    window.startApp();
  } else {
    // Fallback: gewone init triggeren als die er is
    if (typeof init === "function") init();
  }
})();

/* ───────────────────────────────────────────────────────
   applyThemeVars — injecteer CSS-vars in :root
   ─────────────────────────────────────────────────────── */
function applyThemeVars(cfg) {
  const t = cfg.theme || {};
  const root = document.documentElement;

  // Theme tokens
  const tokens = {
    "--brand-primary":      t.primary,
    "--brand-primary-dark": t.primary_dark,
    "--brand-accent":       t.accent,
    "--brand-secondary":    t.secondary,
    "--brand-light":        t.light,
    "--brand-dark":         t.dark,
    "--color-surface":      t.surface,
    "--color-text":         t.text,
    "--color-text-muted":   t.text_muted,
    "--color-border":       t.border,
    "--color-fav":          t.status_fav,
    "--color-twijfel":      t.status_twijfel,
    "--color-niet":         t.status_niet,
    "--font-body":          t.font_body,
    "--font-mono":          t.font_mono,
    "--font-display":       t.font_display
  };
  for (const [k, v] of Object.entries(tokens)) {
    if (v != null) root.style.setProperty(k, v);
  }

  // Categorie-kleuren als CSS-vars (--cat-plaatser, --cat-verkoper, …)
  for (const cat of (cfg.categorieen || [])) {
    root.style.setProperty(`--cat-${cat.id}`, cat.kleur);
  }
}

/* ───────────────────────────────────────────────────────
   renderHeader — H1 + subtitle, sector-specifiek
   ─────────────────────────────────────────────────────── */
function renderHeader(cfg) {
  const h1 = document.querySelector("#header .header-left h1");
  if (!h1) return;
  const flag = (cfg.scope_landen || []).join(" + ");
  h1.innerHTML =
    `<img src="favicon.svg" alt="" class="brand-icon" style="height:24px;vertical-align:middle;margin-right:8px">` +
    `<span class="brand-title">${escHtml(cfg.sector_label)}</span>` +
    `<span class="brand-scope" style="opacity:.6;margin-left:8px;font-size:.85em">${escHtml(flag)}</span>`;
}

/* ───────────────────────────────────────────────────────
   renderCategorieTabsBar — voeg per categorie een tab toe
   in #header .header-center (na 'Kaart' + 'Analyse',
   vóór 'Favorieten')
   ─────────────────────────────────────────────────────── */
function renderCategorieTabsBar(cfg) {
  const bar = document.querySelector("#header .header-center");
  if (!bar) return;

  const insertBefore = bar.querySelector('[data-tab="favorieten"]');

  for (const cat of (cfg.categorieen || [])) {
    const btn = document.createElement("button");
    btn.className = "tab-btn tab-cat";
    btn.dataset.tab = `cat-${cat.id}`;
    btn.dataset.cat = cat.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.innerHTML =
      `<span class="cat-dot" style="background:${cat.kleur}"></span>` +
      `${escHtml(cat.label)} <span class="cat-count" id="cat-count-${cat.id}">0</span>`;
    bar.insertBefore(btn, insertBefore);
  }
}

/* ───────────────────────────────────────────────────────
   renderCategorieFilter — filter-checkboxes onder controls
   ─────────────────────────────────────────────────────── */
function renderCategorieFilter(cfg) {
  const row = document.getElementById("filter-categorie");
  if (!row) return;
  row.innerHTML = `<span class="filter-group-label">Categorieën</span>`;
  for (const cat of (cfg.categorieen || [])) {
    const btn = document.createElement("button");
    btn.className = "fb cat-fb on";
    btn.dataset.cat = cat.id;
    btn.style.setProperty("--btn-color", cat.kleur);
    btn.innerHTML = `<span class="cat-dot" style="background:${cat.kleur}"></span> ${escHtml(cat.label)}`;
    btn.addEventListener("click", () => {
      btn.classList.toggle("on");
      if (typeof window.applyFilters === "function") window.applyFilters();
    });
    row.appendChild(btn);
  }
}

/* ───────────────────────────────────────────────────────
   Helper — HTML escape
   ─────────────────────────────────────────────────────── */
function escHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ───────────────────────────────────────────────────────
   Globale utility: visuele categorie van een bedrijf
   (prioriteit-volgorde uit config)
   ─────────────────────────────────────────────────────── */
window.visueleCategorie = function (bedrijf) {
  const cfg = window.SECTOR_CONFIG;
  if (!cfg) return null;
  const cats = bedrijf.categorieen || (bedrijf.categorie ? [bedrijf.categorie] : []);
  for (const id of cfg.categorie_prioriteit) {
    if (cats.includes(id)) return id;
  }
  return cats[0] || null;
};

window.getMarkerKleur = function (bedrijf) {
  const cfg = window.SECTOR_CONFIG;
  const cat = window.visueleCategorie(bedrijf);
  return (cfg && cfg.categorie_kleur[cat]) || "#9E9E9E";
};
