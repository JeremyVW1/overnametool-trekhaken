/* ═══════════════════════════════════════════════════════════════
   analyse.js — sector-agnostische analyse-tab.
   - Top-50 overnamekandidaten uit data/top50.json
   - Filters (land/provincie/categorie/grootte) + tabel met sortering
   - Scoring-weights uit window.SECTOR_CONFIG.scoring
   ═══════════════════════════════════════════════════════════════ */

let analyseSortKey       = "score";
let analyseSortAsc       = false;
let analyseSearchTerm    = "";
let analyseActiveLanden  = new Set();
let analyseActiveRegios  = new Set();
let analyseActiveCats    = new Set();

function initAnalyse() {
  const cfg = window.SECTOR_CONFIG;
  if (!cfg) return;

  // Land-checkboxes
  buildCheckboxes(
    document.getElementById("analyse-land-checks"),
    (cfg.scope_landen || []).map(l => ({ id: l, label: LAND_LABELS[l] || l, kleur: LAND_KLEUR[l] || "#37474F" })),
    analyseActiveLanden
  );

  // Provincie-checkboxes (alle provincies BE+NL)
  const allProvs = Object.values(cfg.provincies || {}).flat();
  buildCheckboxes(document.getElementById("analyse-regio-checks"), allProvs, analyseActiveRegios);

  // Categorie-checkboxes
  buildCheckboxes(document.getElementById("analyse-categorie-checks"), cfg.categorieen || [], analyseActiveCats);

  document.getElementById("analyse-grootte")?.addEventListener("change", renderAnalyse);
  document.getElementById("analyse-btw-only")?.addEventListener("change", renderAnalyse);
  document.getElementById("analyse-financials-only")?.addEventListener("change", renderAnalyse);
  document.getElementById("analyse-export")?.addEventListener("click", exportAnalyseCSV);

  const search = document.getElementById("analyse-search");
  if (search) {
    let t;
    search.addEventListener("input", e => {
      clearTimeout(t);
      t = setTimeout(() => {
        analyseSearchTerm = e.target.value.trim().toLowerCase();
        renderAnalyse();
      }, 200);
    });
  }
}

function buildCheckboxes(container, items, activeSet) {
  if (!container) return;
  container.innerHTML = "";
  for (const c of items) {
    const label = document.createElement("label");
    label.className = "analyse-act-label checked";
    label.style.borderColor = c.kleur || "#37474F";
    label.style.color = c.kleur || "#37474F";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = c.id;
    cb.checked = true;
    cb.addEventListener("change", () => {
      if (cb.checked) activeSet.add(c.id); else activeSet.delete(c.id);
      label.classList.toggle("checked", cb.checked);
      renderAnalyse();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + c.label));
    container.appendChild(label);
    activeSet.add(c.id);
  }
}

function renderAnalyse() {
  renderTopOvernameTabel();
  renderAnalyseTabel();
}

/* ─── Top-50 sectie ─── */
function renderTopOvernameTabel() {
  const el = document.getElementById("top15-section");
  if (!el) return;
  if (!Array.isArray(top50) || !top50.length) {
    el.innerHTML = `<div class="top15-empty" style="padding:16px;color:var(--color-text-muted)">Top-50 wordt opgebouwd na scoring (Sprint 9).</div>`;
    return;
  }

  let html = `
    <div class="top15-header">
      <h2>Top ${top50.length} Overnamekandidaten</h2>
      <p class="top15-subtitle">Automatische rangschikking op basis van: EBITDA sweet spot, brutomarge per FTE, teamgrootte, winstgevendheid en digitaliseringspotentieel.</p>
    </div>
    <div class="top15-table-wrap">
      <table class="analyse-table top15-table">
        <thead>
          <tr>
            <th>#</th><th>★</th><th>Naam</th><th>Land</th><th>Provincie</th><th>Categorie</th>
            <th>Brutomarge</th><th>EBITDA</th><th>Winst</th><th>FTE</th>
            <th>BTW/KvK</th><th>Website</th><th>Score</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const c of top50) {
    const b = bedrijven.find(x => x.naam === c.naam) || c;
    html += `
      <tr>
        <td class="top15-rang">${c.rang || ""}</td>
        <td>${typeof buildStatusHtml === "function" ? buildStatusHtml(b.naam) : ""}</td>
        <td><strong>${escHtml(c.naam)}</strong></td>
        <td>${escHtml(b.land || "")}</td>
        <td>${escHtml(provLabel(b))}</td>
        <td>${escHtml(catLabel(b))}</td>
        <td class="td-num">${fmtK(b.cw_brutomarge)}</td>
        <td class="td-num">${fmtK(b.bizzy_ebitda || c.est_ebitda)}</td>
        <td class="td-num">${fmtK(b.cw_winst)}</td>
        <td class="td-num">${b.cw_fte ?? c.fte ?? "—"}</td>
        <td>${btwLinkHtml(b)}</td>
        <td>${webLinkHtml(b)}</td>
        <td class="td-num"><strong>${c.score ?? "—"}</strong></td>
      </tr>
    `;
  }
  html += "</tbody></table></div>";
  el.innerHTML = html;
}

/* ─── Hoofd-tabel ─── */
function renderAnalyseTabel() {
  const tbody = document.getElementById("analyse-tbody");
  if (!tbody) return;
  const rows = getAnalyseFiltered();
  const sorted = sortRows(rows, analyseSortKey, analyseSortAsc);

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="14" class="cat-empty">Geen bedrijven matchen huidige filters.</td></tr>`;
  } else {
    tbody.innerHTML = sorted.map(b => `
      <tr>
        <td>${typeof buildStatusHtml === "function" ? buildStatusHtml(b.naam) : ""}</td>
        <td><strong>${escHtml(b.naam)}</strong></td>
        <td>${escHtml(b.land || "")}</td>
        <td>${escHtml(provLabel(b))}</td>
        <td>${escHtml(catLabel(b))}</td>
        <td>${escHtml(GROOTTE_SHORT[b.grootte] || "")}</td>
        <td class="td-num">${fmtK(b.cw_omzet)}</td>
        <td class="td-num">${fmtK(b.cw_brutomarge)}</td>
        <td class="td-num">${fmtK(b.bizzy_ebitda)}</td>
        <td class="td-num">${fmtK(b.cw_winst)}</td>
        <td class="td-num">${b.cw_fte ?? "—"}</td>
        <td>${escHtml(b.adres || "")}</td>
        <td>${btwLinkHtml(b)}</td>
        <td>${webLinkHtml(b)}</td>
      </tr>
    `).join("");
  }

  renderStats(rows);
  attachSortHandlers();
}

function renderStats(rows) {
  const el = document.getElementById("analyse-stats");
  if (!el) return;
  const totalEbitda = rows.reduce((s, b) => s + (b.bizzy_ebitda || 0), 0);
  const totalOmzet  = rows.reduce((s, b) => s + (b.cw_omzet || 0), 0);
  const totalFte    = rows.reduce((s, b) => s + (b.cw_fte || 0), 0);
  el.innerHTML = `
    <div class="stat-block"><b>${rows.length}</b> bedrijven</div>
    <div class="stat-block">Totale omzet: <b>${fmtK(totalOmzet)}</b></div>
    <div class="stat-block">Totale EBITDA: <b>${fmtK(totalEbitda)}</b></div>
    <div class="stat-block">Totale FTE: <b>${totalFte || "—"}</b></div>
  `;
}

function getAnalyseFiltered() {
  const grootte = document.getElementById("analyse-grootte")?.value || "";
  const btwOnly = document.getElementById("analyse-btw-only")?.checked;
  const finOnly = document.getElementById("analyse-financials-only")?.checked;

  return bedrijven.filter(b => {
    if (analyseActiveLanden.size && b.land && !analyseActiveLanden.has(b.land)) return false;
    if (analyseActiveRegios.size && b.provincie && !analyseActiveRegios.has(b.provincie)) return false;
    if (analyseActiveCats.size) {
      const cats = b.categorieen || (b.categorie ? [b.categorie] : []);
      if (!cats.some(c => analyseActiveCats.has(c))) return false;
    }
    if (grootte && b.grootte !== grootte) return false;
    if (btwOnly && !b.btw && !b.kvk) return false;
    if (finOnly && b.cw_omzet == null && b.bizzy_ebitda == null) return false;
    if (analyseSearchTerm) {
      const hay = `${b.naam} ${b.adres || ""} ${b.btw || ""} ${b.kvk || ""} ${b.website || ""}`.toLowerCase();
      if (!hay.includes(analyseSearchTerm)) return false;
    }
    return true;
  });
}

function sortRows(rows, key, asc) {
  const dir = asc ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function attachSortHandlers() {
  document.querySelectorAll("#analyse-table thead th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";
    th.onclick = () => {
      const k = th.dataset.sort;
      if (analyseSortKey === k) {
        analyseSortAsc = !analyseSortAsc;
      } else {
        analyseSortKey = k;
        analyseSortAsc = true;
      }
      renderAnalyseTabel();
    };
  });
}

function exportAnalyseCSV() {
  const cfg = window.SECTOR_CONFIG;
  const rows = getAnalyseFiltered();
  const headers = ["naam", "land", "provincie", "primaire_categorie", "categorieen", "grootte", "adres", "btw", "kvk", "website", "cw_omzet", "cw_brutomarge", "cw_winst", "cw_fte", "bizzy_ebitda", "bron"];
  const csv = [headers.join(",")];
  for (const b of rows) {
    csv.push(headers.map(h => csvCell(b[h])).join(","));
  }
  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cfg.sector_id}-analyse-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v) {
  if (Array.isArray(v)) return `"${v.join("|").replace(/"/g, '""')}"`;
  if (v == null) return "";
  if (typeof v === "string" && (v.includes(",") || v.includes('"') || v.includes("\n"))) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return String(v);
}

/* ─── Scoring (gebruikt door classify/Top-50 in Sprint 9) ─── */
function berekenScore(b) {
  const cfg = window.SECTOR_CONFIG;
  if (!cfg?.scoring) return 0;
  const w = cfg.scoring.weights || {};
  const [ebMin, ebMax] = cfg.scoring.ebitda_sweet_spot || [150000, 750000];
  const maxFte = cfg.scoring.max_fte || 15;
  const minMargin = cfg.scoring.min_brutomarge_per_fte || 100000;

  const ebitda = b.bizzy_ebitda || 0;
  const inSweetSpot = ebitda >= ebMin && ebitda <= ebMax;
  const ebitdaScore = inSweetSpot ? (w.ebitda || 0) : Math.max(0, (w.ebitda || 0) * 0.4);

  const marginPerFte = (b.cw_brutomarge && b.cw_fte) ? b.cw_brutomarge / b.cw_fte : 0;
  const marginScore = marginPerFte >= minMargin ? (w.brutomarge_per_fte || 0) : (w.brutomarge_per_fte || 0) * (marginPerFte / minMargin);

  const fte = b.cw_fte || 99;
  const fteScore = fte <= maxFte ? (w.fte_grootte || 0) : (w.fte_grootte || 0) * (maxFte / fte);

  const winstScore = (b.cw_winst != null && b.cw_winst > 0) ? (w.winstgevendheid || 0) : 0;

  const digitalScore = (b.webshop === "Nee" || !b.webshop) ? (w.digitaliseringspotentieel || 0) : (w.digitaliseringspotentieel || 0) * 0.3;

  return Math.round(ebitdaScore + marginScore + fteScore + winstScore + digitalScore);
}

window.berekenScore = berekenScore;

/* ─── Favorieten / Twijfel render ─── */
function renderFavorieten() {
  renderStatusList("favorieten", "fav-tbody", "fav-empty", window.favorites);
}
function renderTwijfel() {
  renderStatusList("twijfel", "twijfel-tbody", "twijfel-empty", window.markedOrange);
}
function renderStatusList(kind, tbodyId, emptyId, set) {
  const tbody = document.getElementById(tbodyId);
  const empty = document.getElementById(emptyId);
  if (!tbody) return;
  const items = bedrijven.filter(b => set?.has(b.naam));
  if (empty) empty.style.display = items.length ? "none" : "";
  tbody.innerHTML = items.map(b => `
    <tr>
      <td>${typeof buildStatusHtml === "function" ? buildStatusHtml(b.naam) : ""}</td>
      <td><strong>${escHtml(b.naam)}</strong></td>
      <td>${escHtml(b.land || "")}</td>
      <td>${escHtml(provLabel(b))}</td>
      <td>${escHtml(catLabel(b))}</td>
      <td class="td-num">${fmtK(b.cw_brutomarge)}</td>
      <td class="td-num">${fmtK(b.bizzy_ebitda)}</td>
      <td class="td-num">${b.cw_fte ?? "—"}</td>
      <td>${escHtml(b.adres || "")}</td>
      <td>${btwLinkHtml(b)}</td>
      <td>${webLinkHtml(b)}</td>
      <td>${escHtml(b.webshop || "—")}</td>
      <td>${escHtml(b.beoordeling || "")}</td>
      <td>${escHtml((window.favNotes || {})[b.naam] || "")}</td>
      <td>${escHtml((window.favNotesVincent || {})[b.naam] || "")}</td>
    </tr>
  `).join("");
}

function exportFavCSV()      { exportStatusCSV("favorieten", window.favorites); }
function exportTwijfelCSV()  { exportStatusCSV("twijfel",   window.markedOrange); }

function exportStatusCSV(kind, set) {
  const cfg = window.SECTOR_CONFIG;
  const rows = bedrijven.filter(b => set?.has(b.naam));
  const headers = ["naam", "land", "provincie", "primaire_categorie", "categorieen", "adres", "btw", "kvk", "website", "cw_omzet", "cw_brutomarge", "cw_winst", "cw_fte", "bizzy_ebitda"];
  const csv = [headers.join(",")];
  for (const b of rows) csv.push(headers.map(h => csvCell(b[h])).join(","));
  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cfg.sector_id}-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

window.initAnalyse = initAnalyse;
window.renderAnalyse = renderAnalyse;
window.renderFavorieten = renderFavorieten;
window.renderTwijfel = renderTwijfel;
window.exportFavCSV = exportFavCSV;
window.exportTwijfelCSV = exportTwijfelCSV;
