/* ═══════════════════════════════════════════════════════════════
   filters.js — universele filters voor land / provincie / categorie / status.
   Genereert UI dynamisch uit window.SECTOR_CONFIG.
   ═══════════════════════════════════════════════════════════════ */

let activeLanden       = new Set();
let activeRegios       = new Set();
let activeCategorieen  = new Set();
let activeStatus       = new Set();   // "favoriet" | "twijfel" | "niet"

function buildFilters() {
  const cfg = window.SECTOR_CONFIG;
  if (!cfg) return;

  // Reset-button
  const btnAll = document.getElementById("btn-all");
  if (btnAll) {
    btnAll.onclick = () => {
      activeLanden = new Set(cfg.scope_landen);
      activeRegios = new Set(Object.values(cfg.provincies || {}).flat().map(p => p.id));
      activeCategorieen = new Set(cfg.categorieen.map(c => c.id));
      activeStatus.clear();
      syncFilterButtons();
      render();
      updateCounter();
    };
  }

  // ─── Land-rij ───
  const landRow = document.getElementById("filter-land");
  if (landRow) {
    landRow.innerHTML = "";
    addLabel(landRow, "Land");
    for (const land of cfg.scope_landen || []) {
      const label = LAND_LABELS[land] || land;
      const col   = LAND_KLEUR[land] || "#37474F";
      makeFilterBtn(landRow, label, land, col, "land");
    }
  }

  // ─── Provincie-rij — per land gegroepeerd ───
  const regioRow = document.getElementById("filter-regio");
  if (regioRow) {
    regioRow.innerHTML = "";
    addLabel(regioRow, "Provincie");
    for (const land of cfg.scope_landen || []) {
      for (const prov of (cfg.provincies?.[land] || [])) {
        makeFilterBtn(regioRow, prov.label, prov.id, prov.kleur, "regio");
      }
    }
  }

  // ─── Categorie-rij ───
  const catRow = document.getElementById("filter-categorie");
  if (catRow) {
    catRow.innerHTML = "";
    addLabel(catRow, "Categorie");
    for (const cat of cfg.categorieen || []) {
      makeFilterBtn(catRow, cat.label, cat.id, cat.kleur, "categorie");
    }
  }

  // ─── Status-rij ───
  const statusRow = document.getElementById("filter-status");
  if (statusRow) {
    statusRow.innerHTML = "";
    addLabel(statusRow, "Status");
    const status_fav     = cfg.theme?.status_fav     || "#FFC107";
    const status_twijfel = cfg.theme?.status_twijfel || "#FB8C00";
    const status_niet    = cfg.theme?.status_niet    || "#E53935";
    makeFilterBtn(statusRow, "★ Favorieten", "favoriet", status_fav,     "status");
    makeFilterBtn(statusRow, "● Twijfel",    "twijfel",  status_twijfel, "status");
    makeFilterBtn(statusRow, "✗ Niet",       "niet",     status_niet,    "status");
  }

  // Globaal exposeren voor sector-bootstrap
  window.applyFilters = () => { render(); updateCounter(); };
}

function addLabel(container, text) {
  const el = document.createElement("span");
  el.className = "filter-group-label";
  el.textContent = text;
  container.appendChild(el);
}

function makeFilterBtn(container, label, id, col, type) {
  const b = document.createElement("button");
  b.className = "fb";
  b.dataset.filterId = id;
  b.dataset.filterCol = col;
  b.dataset.filterType = type;
  b.textContent = label;
  b.onclick = () => {
    const set = pickSet(type);
    if (set.has(id)) set.delete(id); else set.add(id);
    syncFilterButtons();
    render();
    updateCounter();
  };
  container.appendChild(b);
}

function pickSet(type) {
  switch (type) {
    case "land":      return activeLanden;
    case "regio":     return activeRegios;
    case "categorie": return activeCategorieen;
    case "status":    return activeStatus;
    default:          return new Set();
  }
}

function syncFilterButtons() {
  document.querySelectorAll(".fb[data-filter-id]").forEach(btn => {
    const t = btn.dataset.filterType;
    const set = pickSet(t);
    const active = set.has(btn.dataset.filterId);
    btn.classList.toggle("on", active);
    const col = btn.dataset.filterCol;
    btn.style.cssText = active
      ? `background:${col};color:#fff;border-color:${col}`
      : "";
  });
}

/**
 * Bedrijven die zichtbaar moeten zijn op kaart, gegeven de actieve filters.
 */
function getVisibleCompanies() {
  return bedrijven.filter(bedrijfMatchesFilters);
}

function bedrijfMatchesFilters(c) {
  if (activeLanden.size && c.land && !activeLanden.has(c.land)) return false;
  if (activeRegios.size && c.provincie && !activeRegios.has(c.provincie)) return false;
  if (activeCategorieen.size) {
    const cats = c.categorieen || (c.categorie ? [c.categorie] : []);
    if (!cats.some(id => activeCategorieen.has(id))) return false;
  }
  if (activeStatus.size) {
    const isFav   = window.favorites?.has(c.naam);
    const isOr    = window.markedOrange?.has(c.naam);
    const isRed   = window.markedRed?.has(c.naam);
    const matches =
      (activeStatus.has("favoriet") && isFav) ||
      (activeStatus.has("twijfel")  && isOr)  ||
      (activeStatus.has("niet")     && isRed);
    if (!matches) return false;
  }
  return true;
}

/**
 * Bouw de legenda op (categorieën met prioriteit + status).
 */
function buildLegend() {
  const el = document.getElementById("legend-content");
  if (!el) return;
  const cfg = window.SECTOR_CONFIG;
  el.innerHTML = "";

  // Categorieën met prioriteit-indicator
  const catSection = document.createElement("div");
  catSection.className = "legend-cat-section";
  catSection.innerHTML = `<div class="legend-cat-title">Categorieën (prioriteit op kaart)</div>`;
  (cfg?.categorieen || []).forEach((cat, idx) => {
    const row = document.createElement("div");
    row.className = "legend-cat-row";
    row.innerHTML = `
      <span class="cat-dot" style="background:${cat.kleur}"></span>
      <span>${escHtml(cat.label)}</span>
      <span class="cat-prio">#${idx + 1}</span>
    `;
    catSection.appendChild(row);
  });
  el.appendChild(catSection);

  // Grootte
  const szSection = document.createElement("div");
  szSection.className = "legend-cat-section";
  szSection.innerHTML = `<div class="legend-cat-title">Grootte</div>`;
  const groottes = cfg?.groottes || [
    { id: "Groot", radius: 13 },
    { id: "Middelgroot", radius: 10 },
    { id: "Klein", radius: 7 },
    { id: "Micro", radius: 5 },
  ];
  for (const g of groottes) {
    const row = document.createElement("div");
    row.className = "legend-cat-row";
    row.innerHTML = `
      <svg width="${g.radius * 2 + 4}" height="${g.radius * 2 + 4}"><circle cx="${g.radius + 2}" cy="${g.radius + 2}" r="${g.radius}" fill="#888" opacity=".75"/></svg>
      <span>${escHtml(GROOTTE_LONG[g.id] || g.id)}</span>
    `;
    szSection.appendChild(row);
  }
  el.appendChild(szSection);

  // Status
  const statusSection = document.createElement("div");
  statusSection.className = "legend-cat-section";
  statusSection.innerHTML = `<div class="legend-cat-title">Status</div>`;
  statusSection.innerHTML += `
    <div class="legend-cat-row"><span class="cat-dot" style="border:2.5px solid var(--color-fav);background:transparent"></span><span>Favoriet</span></div>
    <div class="legend-cat-row"><span class="cat-dot" style="border:2.5px solid var(--color-twijfel);background:transparent"></span><span>Twijfel</span></div>
    <div class="legend-cat-row"><span class="cat-dot" style="border:2.5px solid var(--color-niet);background:transparent"></span><span>Niet interessant</span></div>
  `;
  el.appendChild(statusSection);

  // Mobiel toggle
  const toggle = document.getElementById("legend-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      el.classList.toggle("collapsed");
      toggle.textContent = el.classList.contains("collapsed")
        ? "▸ Legenda tonen"
        : "▾ Legenda verbergen";
    });
  }
}

function updateCounter() {
  const el = document.getElementById("counter-num");
  if (el) el.textContent = getVisibleCompanies().length;
}

// Expose
window.activeLanden      = activeLanden;
window.activeRegios      = activeRegios;
window.activeCategorieen = activeCategorieen;
window.activeStatus      = activeStatus;
window.syncFilterButtons = syncFilterButtons;
window.getVisibleCompanies = getVisibleCompanies;
