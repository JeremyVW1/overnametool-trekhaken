/* ═══════════════════════════════════════════════════════════════
   categorie-tabs.js
   Genereert per categorie uit sector.config.json een eigen tab-view
   met sorteerbare kolommen + per-kolom filters (dropdowns voor land/
   provincie/grootte + zoek voor naam/adres/btw/website).

   Vereist:
   - window.SECTOR_CONFIG (gezet door sector-bootstrap.js)
   - window.bedrijven (gezet door app.js)
   - escHtml, fmtK helpers uit config.js
   ═══════════════════════════════════════════════════════════════ */

(function () {
  // Per-tab state
  const tabState = {};   // { [catId]: { sortKey, sortAsc, search, land, provincie, grootte, status, kolom_filters: { [colKey]: string } } }

  // Kolom-definities
  const COLS = [
    { key: "status",         label: "Status",      sortable: false },
    { key: "naam",           label: "Naam",        sortable: true,  filter: "text" },
    { key: "land",           label: "Land",        sortable: true,  filter: "select" },
    { key: "provincie",      label: "Provincie",   sortable: true,  filter: "select" },
    { key: "grootte",        label: "Grootte",     sortable: true,  filter: "select" },
    { key: "cw_omzet",       label: "Omzet",       sortable: true,  align: "right" },
    { key: "cw_brutomarge",  label: "Brutomarge",  sortable: true,  align: "right" },
    { key: "bizzy_ebitda",   label: "EBITDA",      sortable: true,  align: "right" },
    { key: "cw_winst",       label: "Winst",       sortable: true,  align: "right" },
    { key: "cw_fte",         label: "FTE",         sortable: true,  align: "right" },
    { key: "adres",          label: "Adres",       sortable: true,  filter: "text" },
    { key: "telefoon",       label: "Telefoon",    sortable: true,  filter: "text" },
    { key: "btw_kvk",        label: "BTW/KvK",     sortable: true,  filter: "text" },
    { key: "website",        label: "Website",     sortable: true,  filter: "text" },
    { key: "bron",           label: "Bron",        sortable: false },
  ];

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
      // Init state
      tabState[cat.id] = {
        sortKey: "naam",
        sortAsc: true,
        search: "",
        kolomFilters: {},
      };

      const view = document.createElement("div");
      view.id = `cat-${cat.id}-view`;
      view.className = "cat-view hidden";

      // Header + zoekbalk + acties
      view.innerHTML = `
        <div class="cat-view-header">
          <h2>
            <span class="cat-dot" style="background:${cat.kleur}"></span>
            ${escapeHtml(cat.label)}
          </h2>
          <span class="cat-subtitle" id="cat-${cat.id}-subtitle">0 bedrijven</span>
        </div>

        <div class="analyse-toolbar cat-toolbar">
          <div class="analyse-search-wrap">
            <input type="text" class="cat-search" data-cat="${cat.id}" placeholder="Zoek (naam, adres, BTW, website…)" autocomplete="off"/>
          </div>
          <div class="analyse-actions">
            <button class="analyse-btn cat-reset" data-cat="${cat.id}" title="Reset alle filters in deze tab">↺ Reset</button>
            <button class="analyse-btn cat-export" data-cat="${cat.id}">📥 Exporteer CSV</button>
          </div>
        </div>

        <div class="analyse-table-wrap">
          <table class="analyse-table cat-table" data-cat="${cat.id}">
            <thead>
              <tr class="cat-header-row">
                ${COLS.map(c => `
                  <th data-col="${c.key}" class="${c.sortable ? "sortable" : ""}" ${c.align ? `style="text-align:${c.align}"` : ""}>
                    <div class="th-label">${escapeHtml(c.label)}${c.sortable ? '<span class="sort-arrow"></span>' : ""}</div>
                  </th>
                `).join("")}
              </tr>
              <tr class="cat-filter-row">
                ${COLS.map(c => `
                  <th data-col="${c.key}" class="cat-filter-cell">
                    ${renderFilterControl(c, cat.id)}
                  </th>
                `).join("")}
              </tr>
            </thead>
            <tbody id="cat-${cat.id}-tbody"></tbody>
          </table>
        </div>
      `;
      container.appendChild(view);
    }

    // Event delegation
    container.addEventListener("input", e => {
      const t = e.target;
      if (t.classList.contains("cat-search")) {
        const id = t.dataset.cat;
        tabState[id].search = t.value;
        renderCategorieRows(id);
      } else if (t.classList.contains("cat-filter-input")) {
        const id = t.dataset.cat;
        tabState[id].kolomFilters[t.dataset.col] = t.value;
        renderCategorieRows(id);
      }
    });

    container.addEventListener("change", e => {
      const t = e.target;
      if (t.classList.contains("cat-filter-select")) {
        const id = t.dataset.cat;
        tabState[id].kolomFilters[t.dataset.col] = t.value;
        renderCategorieRows(id);
      }
    });

    container.addEventListener("click", e => {
      const t = e.target;
      const sortableTh = t.closest("th.sortable");
      if (sortableTh) {
        const catId = sortableTh.closest(".cat-table")?.dataset.cat;
        const col   = sortableTh.dataset.col;
        if (catId && col) {
          const st = tabState[catId];
          if (st.sortKey === col) st.sortAsc = !st.sortAsc;
          else { st.sortKey = col; st.sortAsc = true; }
          renderCategorieRows(catId);
        }
        return;
      }
      if (t.classList.contains("cat-export")) exportCategorieCSV(t.dataset.cat);
      if (t.classList.contains("cat-reset"))  resetCategorieFilters(t.dataset.cat);
    });
  }

  /* ─── Kolom-filter UI per kolom-type ─── */
  function renderFilterControl(col, catId) {
    if (col.filter === "text") {
      return `<input type="text" class="cat-filter-input" data-cat="${catId}" data-col="${col.key}" placeholder="Filter…" />`;
    }
    if (col.filter === "select") {
      return `<select class="cat-filter-select" data-cat="${catId}" data-col="${col.key}" data-placeholder="${col.label}">
        <option value="">Alle</option>
      </select>`;
    }
    return "";
  }

  /* ─── Populate select-opties op basis van data in categorie ─── */
  function populateSelectFilters(catId, bedrijvenInCat) {
    const view = document.getElementById(`cat-${catId}-view`);
    if (!view) return;
    const selects = view.querySelectorAll(".cat-filter-select");
    for (const select of selects) {
      const col = select.dataset.col;
      const huidige = select.value;

      // Verzamel unieke waarden
      const values = new Set();
      for (const b of bedrijvenInCat) {
        const v = cellRawValue(b, col);
        if (v != null && v !== "") values.add(v);
      }

      // Update opties — alleen als nog niet ingevuld
      if (select.dataset.populated === "yes" && select.options.length > 1) continue;

      const sorted = [...values].sort((a, b) => String(a).localeCompare(String(b)));
      select.innerHTML = `<option value="">Alle ${escapeHtml(select.dataset.placeholder || "")}</option>` +
        sorted.map(v => {
          const label = col === "provincie" ? (window.PROV_LABELS?.[v] || v)
                       : col === "land"      ? (window.LAND_LABELS?.[v] || v)
                       : v;
          return `<option value="${escapeHtml(String(v))}">${escapeHtml(String(label))}</option>`;
        }).join("");
      select.value = huidige;
      select.dataset.populated = "yes";
    }
  }

  function resetCategorieFilters(catId) {
    const st = tabState[catId];
    if (!st) return;
    st.sortKey = "naam";
    st.sortAsc = true;
    st.search = "";
    st.kolomFilters = {};
    const view = document.getElementById(`cat-${catId}-view`);
    if (view) {
      view.querySelectorAll(".cat-search, .cat-filter-input").forEach(el => el.value = "");
      view.querySelectorAll(".cat-filter-select").forEach(el => el.value = "");
    }
    renderCategorieRows(catId);
  }

  /* ─── Hoofd-render ─── */
  window.renderCategorieRows = function (catId) {
    const cfg = window.SECTOR_CONFIG;
    if (!cfg || !window.bedrijven) return;
    const st = tabState[catId];
    if (!st) return;

    const inCat = window.bedrijven.filter(b => {
      const cats = b.categorieen || (b.categorie ? [b.categorie] : []);
      return cats.includes(catId);
    });

    // Populate select-opties (1×)
    populateSelectFilters(catId, inCat);

    // Filter
    const filtered = inCat.filter(b => {
      if (st.search) {
        const lq = st.search.toLowerCase().trim();
        const hay = [b.naam, b.adres, b.btw, b.kvk, b.website, b.plaats, b.info].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(lq)) return false;
      }
      for (const [col, val] of Object.entries(st.kolomFilters)) {
        if (!val) continue;
        const cell = String(cellRawValue(b, col) ?? "");
        const cellLow = cell.toLowerCase();
        const v = String(val).toLowerCase();
        // Text-filter: substring; select-filter: exacte match
        if (isSelectCol(col)) {
          if (cellLow !== v) return false;
        } else {
          if (!cellLow.includes(v)) return false;
        }
      }
      return true;
    });

    // Sort
    const sorted = sortRows(filtered, st.sortKey, st.sortAsc);

    // Render
    const tbody = document.getElementById(`cat-${catId}-tbody`);
    if (tbody) {
      if (!sorted.length) {
        tbody.innerHTML = `<tr><td colspan="${COLS.length}" class="cat-empty">Geen resultaten voor huidige filters.</td></tr>`;
      } else {
        tbody.innerHTML = sorted.map(renderRow).join("");
      }
    }

    // Subtitle + count
    const subtitle = document.getElementById(`cat-${catId}-subtitle`);
    if (subtitle) subtitle.textContent = `${sorted.length} van ${inCat.length} bedrijven`;
    const badge = document.getElementById(`cat-count-${catId}`);
    if (badge) badge.textContent = inCat.length;

    // Update sort-arrow
    updateSortArrow(catId, st.sortKey, st.sortAsc);
  };

  function isSelectCol(col) {
    return ["land", "provincie", "grootte"].includes(col);
  }

  function cellRawValue(b, col) {
    if (col === "btw_kvk") return b.btw || b.kvk || "";
    return b[col];
  }

  function sortRows(rows, key, asc) {
    const dir = asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = cellRawValue(a, key);
      const bv = cellRawValue(b, key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "nl") * dir;
    });
  }

  function updateSortArrow(catId, key, asc) {
    const view = document.getElementById(`cat-${catId}-view`);
    if (!view) return;
    view.querySelectorAll("th.sortable .sort-arrow").forEach(s => s.textContent = "");
    const th = view.querySelector(`th[data-col="${key}"] .sort-arrow`);
    if (th) th.textContent = asc ? " ▲" : " ▼";
  }

  /* ─── Een tabel-rij ─── */
  function renderRow(b) {
    const fav   = window.favorites?.has(b.naam);
    const orange= window.markedOrange?.has(b.naam);
    const red   = window.markedRed?.has(b.naam);
    const statusHtml = (typeof window.buildStatusHtml === "function")
      ? window.buildStatusHtml(b.naam)
      : `${fav ? "★" : ""}${orange ? "●" : ""}${red ? "✗" : ""}`;

    const fmt = v => (typeof v === "number" ? (window.fmtK ? window.fmtK(v) : v) : (v == null || v === "" ? "—" : v));
    const prov = window.PROV_LABELS?.[b.provincie] || b.provincie || "";
    const land = window.LAND_LABELS?.[b.land] || b.land || "";

    // ─── Adres → Google Maps link ───
    const adresHtml = b.adres
      ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.adres + ", " + (b.land === "BE" ? "België" : "Nederland"))}" target="_blank" rel="noopener" title="Open in Google Maps">📍 ${escapeHtml(b.adres)}</a>`
      : "—";

    // ─── Telefoon → tel: link ───
    const telefoonHtml = b.telefoon
      ? `<a href="tel:${String(b.telefoon).replace(/[^+\d]/g, "")}" title="Bellen">📞 ${escapeHtml(b.telefoon)}</a>`
      : "—";

    // ─── BTW/KvK → CompanyWeb (BE) of KvK.nl (NL) link ───
    let btwKvkHtml = "—";
    if (b.btw) {
      const num = String(b.btw).replace(/[^0-9]/g, "");
      const csNum = num.replace(/^0+/, "");
      btwKvkHtml = `<a href="https://www.companyweb.be/nl/${num}" target="_blank" rel="noopener" title="CompanyWeb"><code>${escapeHtml(b.btw)}</code></a>`
        + ` <a href="https://app.creditsafe.com/companies/BE-X-${csNum}" target="_blank" rel="noopener" class="cs-link" title="Creditsafe">CS</a>`
        + ` <a href="https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${num}" target="_blank" rel="noopener" class="cs-link" title="KBO">KBO</a>`;
    } else if (b.kvk) {
      const num = String(b.kvk).replace(/[^0-9]/g, "");
      btwKvkHtml = `<a href="https://www.kvk.nl/orderstraat/bedrijfsprofiel/?kvknummer=${num}" target="_blank" rel="noopener" title="KvK"><code>${escapeHtml(b.kvk)}</code></a>`;
    } else if (b.land === "BE" && b.naam) {
      // Geen BTW bekend → KBO zoek-link op naam
      btwKvkHtml = `<a href="https://kbopub.economie.fgov.be/kbopub/zoekwoordenform.html?searchWord=${encodeURIComponent(b.naam)}" target="_blank" rel="noopener" class="cs-link" title="Zoek BTW op KBO">🔎 KBO zoek</a>`;
    }

    // ─── Website → externe link ───
    const websiteHtml = b.website
      ? `<a href="${b.website.startsWith("http") ? b.website : "https://" + b.website}" target="_blank" rel="noopener">🌐 ${escapeHtml(b.website)}</a>`
      : "—";

    return `
      <tr>
        <td>${statusHtml}</td>
        <td><a class="open-detail" data-naam="${escapeHtml(b.naam || "")}" href="#" title="Toon details">${escapeHtml(b.naam || "")}</a></td>
        <td>${escapeHtml(land)}</td>
        <td>${escapeHtml(prov)}</td>
        <td>${escapeHtml(b.grootte || "")}</td>
        <td style="text-align:right">${fmt(b.cw_omzet)}</td>
        <td style="text-align:right">${fmt(b.cw_brutomarge)}</td>
        <td style="text-align:right">${fmt(b.bizzy_ebitda)}</td>
        <td style="text-align:right">${fmt(b.cw_winst)}</td>
        <td style="text-align:right">${b.cw_fte ?? "—"}</td>
        <td>${adresHtml}</td>
        <td>${telefoonHtml}</td>
        <td>${btwKvkHtml}</td>
        <td>${websiteHtml}</td>
        <td>${(b.bron || []).join(", ")}</td>
      </tr>
    `;
  }

  /* ─── CSV export ─── */
  function exportCategorieCSV(catId) {
    const cfg = window.SECTOR_CONFIG;
    if (!cfg || !window.bedrijven) return;
    const rows = window.bedrijven.filter(b => {
      const cats = b.categorieen || (b.categorie ? [b.categorie] : []);
      return cats.includes(catId);
    });
    const headers = ["naam", "land", "provincie", "primaire_categorie", "categorieen", "grootte", "adres", "btw", "kvk", "website", "cw_omzet", "cw_brutomarge", "cw_winst", "cw_fte", "bizzy_ebitda", "bron"];
    const csv = [headers.join(",")];
    for (const b of rows) {
      csv.push(headers.map(h => csvCell(b[h])).join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cfg.sector_id}-${catId}-${new Date().toISOString().slice(0, 10)}.csv`;
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
