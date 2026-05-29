/* ═══════════════════════════════════════════════════════════════
   categorie-tabs.js
   Genereert per categorie uit sector.config.json een eigen tab-view.
   Elke tab toont bedrijven die in die categorie zitten.

   Vereist:
   - window.SECTOR_CONFIG (gezet door sector-bootstrap.js)
   - window.bedrijven (gezet door app.js wanneer data geladen is)
   - escHtml, fmtK helpers uit config.js
   ═══════════════════════════════════════════════════════════════ */

(function () {
  // Wacht tot bootstrap config heeft gezet
  function ready() {
    if (!window.SECTOR_CONFIG) return setTimeout(ready, 50);
    buildCategorieViews();
  }
  ready();

  function buildCategorieViews() {
    const cfg = window.SECTOR_CONFIG;
    const container = document.getElementById("cat-views");
    if (!container) return;

    container.innerHTML = "";

    for (const cat of cfg.categorieen || []) {
      const view = document.createElement("div");
      view.id = `cat-${cat.id}-view`;
      view.className = "cat-view hidden";

      view.innerHTML = `
        <div class="cat-view-header">
          <h2>
            <span class="cat-dot" style="background:${cat.kleur}"></span>
            ${escapeHtml(cat.label)}
          </h2>
          <span class="cat-subtitle" id="cat-${cat.id}-subtitle">0 bedrijven</span>
        </div>

        <div class="analyse-toolbar">
          <div class="analyse-search-wrap">
            <input type="text" class="cat-search" data-cat="${cat.id}" placeholder="Zoek in ${escapeHtml(cat.label.toLowerCase())} (naam, adres, BTW…)" autocomplete="off"/>
          </div>
          <div class="analyse-actions">
            <button class="analyse-btn cat-export" data-cat="${cat.id}">📥 Exporteer CSV</button>
          </div>
        </div>

        <div class="analyse-table-wrap">
          <table class="analyse-table">
            <thead>
              <tr>
                <th>Status</th>
                <th data-sort="naam">Naam</th>
                <th data-sort="land">Land</th>
                <th data-sort="provincie">Provincie</th>
                <th data-sort="cw_omzet">Omzet</th>
                <th data-sort="cw_brutomarge">Brutomarge</th>
                <th data-sort="bizzy_ebitda">EBITDA</th>
                <th data-sort="cw_winst">Winst</th>
                <th data-sort="cw_fte">FTE</th>
                <th data-sort="adres">Adres</th>
                <th data-sort="btw">BTW/KvK</th>
                <th data-sort="website">Website</th>
                <th data-sort="bron">Bron</th>
              </tr>
            </thead>
            <tbody id="cat-${cat.id}-tbody"></tbody>
          </table>
        </div>
      `;
      container.appendChild(view);
    }

    // Hook search-events
    container.addEventListener("input", e => {
      if (e.target.classList.contains("cat-search")) {
        const id = e.target.dataset.cat;
        renderCategorieRows(id, e.target.value);
      }
    });
    container.addEventListener("click", e => {
      if (e.target.classList.contains("cat-export")) {
        const id = e.target.dataset.cat;
        exportCategorieCSV(id);
      }
    });
  }

  // Exporteer functie globaal zodat tabs.js kan triggeren bij tab-switch
  window.renderCategorieRows = function (catId, zoekterm = "") {
    const cfg = window.SECTOR_CONFIG;
    if (!cfg || !window.bedrijven) return;

    const bedrijven = window.bedrijven.filter(b => {
      const cats = b.categorieen || (b.categorie ? [b.categorie] : []);
      return cats.includes(catId);
    });

    const filtered = filterZoek(bedrijven, zoekterm);
    const tbody = document.getElementById(`cat-${catId}-tbody`);
    if (!tbody) return;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="13" class="cat-empty">Geen bedrijven in deze categorie (nog).</td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(b => renderRow(b, catId)).join("");
    }

    const subtitle = document.getElementById(`cat-${catId}-subtitle`);
    if (subtitle) subtitle.textContent = `${filtered.length} van ${bedrijven.length} bedrijven`;

    const countBadge = document.getElementById(`cat-count-${catId}`);
    if (countBadge) countBadge.textContent = bedrijven.length;
  };

  function filterZoek(arr, q) {
    if (!q) return arr;
    const lq = q.toLowerCase().trim();
    return arr.filter(b =>
      (b.naam || "").toLowerCase().includes(lq) ||
      (b.adres || "").toLowerCase().includes(lq) ||
      (b.btw || "").toLowerCase().includes(lq) ||
      (b.website || "").toLowerCase().includes(lq) ||
      (b.kvk || "").toLowerCase().includes(lq)
    );
  }

  function renderRow(b, catId) {
    const fav = (window.favorites && window.favorites.has(b.naam)) ? "★" : "";
    const orange = (window.markedOrange && window.markedOrange.has(b.naam)) ? "●" : "";
    const red = (window.markedRed && window.markedRed.has(b.naam)) ? "✗" : "";
    const status = fav + orange + red || "—";
    const fmt = (v) => (window.fmtK && typeof v === "number") ? window.fmtK(v) : (v == null ? "—" : v);
    return `
      <tr>
        <td>${status}</td>
        <td><strong>${escapeHtml(b.naam || "")}</strong></td>
        <td>${escapeHtml(b.land || "")}</td>
        <td>${escapeHtml(b.provincie || "")}</td>
        <td>${fmt(b.cw_omzet)}</td>
        <td>${fmt(b.cw_brutomarge)}</td>
        <td>${fmt(b.bizzy_ebitda)}</td>
        <td>${fmt(b.cw_winst)}</td>
        <td>${fmt(b.cw_fte)}</td>
        <td>${escapeHtml(b.adres || "")}</td>
        <td><code>${escapeHtml(b.btw || b.kvk || "")}</code></td>
        <td>${b.website ? `<a href="https://${b.website}" target="_blank" rel="noopener">${escapeHtml(b.website)}</a>` : "—"}</td>
        <td>${(b.bron || []).join(", ")}</td>
      </tr>
    `;
  }

  function exportCategorieCSV(catId) {
    const cfg = window.SECTOR_CONFIG;
    if (!cfg || !window.bedrijven) return;
    const cat = cfg.categorieen.find(c => c.id === catId);
    const rows = window.bedrijven.filter(b => {
      const cats = b.categorieen || (b.categorie ? [b.categorie] : []);
      return cats.includes(catId);
    });
    const headers = ["naam", "land", "provincie", "primaire_categorie", "categorieen", "adres", "btw", "kvk", "website", "cw_omzet", "cw_brutomarge", "cw_winst", "cw_fte", "bizzy_ebitda", "bron"];
    const csv = [headers.join(",")];
    for (const b of rows) {
      const cell = (k) => {
        const v = b[k];
        if (Array.isArray(v)) return `"${v.join("|").replace(/"/g, '""')}"`;
        if (v == null) return "";
        if (typeof v === "string" && (v.includes(",") || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
        return v;
      };
      csv.push(headers.map(cell).join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.sector_id}-${catId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
