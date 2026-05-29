/* ═══════════════════════════════════════════════════════════════
   app.js — Entry point. Wordt aangeroepen door sector-bootstrap.js
   nadat sector.config.json geladen is en branding toegepast.
   ═══════════════════════════════════════════════════════════════ */

let bedrijven   = [];
let top50       = [];
const bedrijvenMap = new Map();

/**
 * Door sector-bootstrap.js aangeroepen.
 */
window.startApp = async function startApp() {
  const cfg = window.SECTOR_CONFIG;
  if (!cfg) {
    showFatal("sector.config.json niet beschikbaar — bootstrap mislukt.");
    return;
  }

  try {
    await loadAllData(cfg);
  } catch (e) {
    showFatal("Data laden mislukt: " + (e?.message || e));
    return;
  }

  // Indices vullen
  bedrijven.forEach(c => {
    if (c?.naam) bedrijvenMap.set(c.naam, c);
  });

  // Provincie + land + categorie helpers vullen uit config
  fillLookupTables(cfg);

  await loadFavorites();

  initMap();
  createAllMarkers();
  buildFilters();
  buildLegend();
  initSearch();
  initAnalyse();
  initEdit();
  initTabs();

  // Default: alle landen + provincies + categorieën AAN
  if (window.activeLanden) cfg.scope_landen.forEach(l => activeLanden.add(l));
  if (window.activeRegios) Object.values(cfg.provincies || {}).flat().forEach(p => activeRegios.add(p.id));
  if (window.activeCategorieen) cfg.categorieen.forEach(c => activeCategorieen.add(c.id));

  syncFilterButtons();
  render();
  updateCounter();
  renderAllCategorieTabCounts();

  document.getElementById("fav-export")?.addEventListener("click", exportFavCSV);
  document.getElementById("twijfel-export")?.addEventListener("click", exportTwijfelCSV);

  // Event delegation voor popup-knoppen
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".leaflet-popup")) return;
    const btn = e.target.closest(".star-btn, .orange-btn, .red-btn");
    if (!btn) return;
    e.stopPropagation();
    e.preventDefault();
    const naam = btn.dataset.naam;
    const c = bedrijvenMap.get(naam);
    if (!c) return;
    if (btn.classList.contains("star-btn")) toggleFavorite(c);
    else if (btn.classList.contains("orange-btn")) toggleOrange(c);
    else if (btn.classList.contains("red-btn")) toggleRed(c);
    refreshMarkerIcon(naam);
    const entry = allMarkers.get(naam);
    if (entry && entry.marker.isPopupOpen()) {
      entry.marker.setPopupContent(buildPopup(c));
    }
  });

  if (typeof startAutoSync === "function") startAutoSync();

  window.addEventListener("offline", () =>
    showToast("Je bent offline. Wijzigingen worden lokaal opgeslagen.", "warning", 5000)
  );
  window.addEventListener("online", () => {
    showToast("Weer online!", "success", 3000);
    if (typeof _autoSync === "function") _autoSync();
  });

  document.getElementById("loading-overlay")?.remove();
};

/* ─── Data loading: alle cfg.data_files samenvoegen tot 1 bedrijven-array ─── */
async function loadAllData(cfg) {
  const files = (cfg.data_files || []).map(f => `data/${f}`);
  files.push("data/top50.json");

  const results = await Promise.allSettled(files.map(f => fetch(f, { cache: "no-store" })));

  const all = [];
  for (let i = 0; i < cfg.data_files.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value.ok) {
      try {
        const arr = await r.value.json();
        if (Array.isArray(arr)) {
          all.push(...arr);
        }
      } catch (e) {
        // Bestand bestaat maar bevat geen valid JSON — sla over
      }
    }
  }

  const topRes = results[results.length - 1];
  if (topRes.status === "fulfilled" && topRes.value.ok) {
    try { top50 = await topRes.value.json(); } catch { top50 = []; }
  }

  // Dedup op (BTW || KvK || naam+land)
  const seen = new Map();
  for (const c of all) {
    const key = (c.btw || c.kvk || `${c.naam}|${c.land || ""}`).trim();
    if (!key) continue;
    if (seen.has(key)) {
      const existing = seen.get(key);
      mergeBedrijf(existing, c);
    } else {
      seen.set(key, normaliseerBedrijf(c));
    }
  }
  bedrijven = Array.from(seen.values());
  window.bedrijven = bedrijven;
}

/**
 * Normaliseer een bedrijf: zorg dat categorieen[] en primaire_categorie gezet zijn.
 */
function normaliseerBedrijf(c) {
  const cats = Array.isArray(c.categorieen) && c.categorieen.length
    ? c.categorieen
    : (c.categorie ? [c.categorie] : []);
  const prio = (window.SECTOR_CONFIG?.categorie_prioriteit || []);
  const primaire = prio.find(p => cats.includes(p)) || cats[0] || null;
  return {
    ...c,
    categorieen: cats,
    primaire_categorie: primaire
  };
}

/**
 * Voeg bron-arrays en niet-null velden van een duplicaat samen.
 */
function mergeBedrijf(target, src) {
  if (Array.isArray(src.bron)) {
    target.bron = Array.from(new Set([...(target.bron || []), ...src.bron]));
  }
  if (Array.isArray(src.categorieen)) {
    target.categorieen = Array.from(new Set([...(target.categorieen || []), ...src.categorieen]));
  }
  const prio = window.SECTOR_CONFIG?.categorie_prioriteit || [];
  target.primaire_categorie = prio.find(p => target.categorieen.includes(p)) || target.primaire_categorie;

  for (const k of Object.keys(src)) {
    if (k === "bron" || k === "categorieen" || k === "primaire_categorie") continue;
    if ((target[k] == null || target[k] === "") && src[k] != null && src[k] !== "") {
      target[k] = src[k];
    }
  }
}

function fillLookupTables(cfg) {
  // Categorieën
  for (const cat of cfg.categorieen || []) {
    CAT_LABEL[cat.id] = cat.label;
    CAT_KLEUR[cat.id] = cat.kleur;
  }
  // Landen
  const landLabels = { BE: "België", NL: "Nederland", FR: "Frankrijk", DE: "Duitsland", LU: "Luxemburg" };
  for (const land of cfg.scope_landen || []) {
    LAND_LABELS[land] = landLabels[land] || land;
    LAND_KLEUR[land]  = land === "BE" ? "#FAE100" : "#FF6900";
  }
  // Provincies
  for (const land of Object.keys(cfg.provincies || {})) {
    for (const prov of cfg.provincies[land] || []) {
      PROV_LABELS[prov.id] = prov.label;
      PROV_KLEUR[prov.id]  = prov.kleur;
    }
  }
  // Groottes override
  if (Array.isArray(cfg.groottes)) {
    for (const g of cfg.groottes) {
      if (g.radius != null) GROOTTE_RADIUS[g.id] = g.radius;
    }
  }
}

function renderAllCategorieTabCounts() {
  const cfg = window.SECTOR_CONFIG;
  if (!cfg) return;
  for (const cat of cfg.categorieen) {
    const inCat = bedrijven.filter(b => (b.categorieen || []).includes(cat.id)).length;
    const badge = document.getElementById(`cat-count-${cat.id}`);
    if (badge) badge.textContent = inCat;
  }
}

function initTabs() {
  const cfg = window.SECTOR_CONFIG;
  const kaartEls = [
    document.getElementById("controls"),
    document.getElementById("map"),
    document.getElementById("legend"),
  ].filter(Boolean);

  const catTabIds = (cfg?.categorieen || []).map(c => `cat-${c.id}`);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      const tab = btn.dataset.tab;

      kaartEls.forEach(el => el.classList.toggle("hidden", tab !== "kaart"));
      document.getElementById("analyse-view")?.classList.toggle("hidden", tab !== "analyse");
      document.getElementById("favorieten-view")?.classList.toggle("hidden", tab !== "favorieten");
      document.getElementById("twijfel-view")?.classList.toggle("hidden", tab !== "twijfel");
      document.getElementById("bewerk-view")?.classList.toggle("hidden", tab !== "bewerk");

      // Per categorie-tab
      for (const catTabId of catTabIds) {
        const view = document.getElementById(`${catTabId}-view`);
        if (view) view.classList.toggle("hidden", tab !== catTabId);
      }

      if (tab === "kaart") setTimeout(() => map.invalidateSize(), 100);
      else if (tab === "analyse") renderAnalyse();
      else if (tab === "favorieten") renderFavorieten();
      else if (tab === "twijfel") renderTwijfel();
      else if (tab === "bewerk") renderEdit();
      else if (tab && tab.startsWith("cat-")) {
        const catId = btn.dataset.cat;
        if (catId && typeof window.renderCategorieRows === "function") {
          window.renderCategorieRows(catId);
        }
      }
    });
  });
}

function showFatal(msg) {
  const safe = escHtml(msg);
  document.body.innerHTML =
    `<div style="padding:40px;font-family:sans-serif;color:#c62828">
       <h2>❌ Fout bij laden</h2>
       <p>${safe}</p>
     </div>`;
}
