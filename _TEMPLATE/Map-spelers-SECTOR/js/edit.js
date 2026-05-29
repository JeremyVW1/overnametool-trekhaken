/* Houtkaart — Bedrijf bewerken tab */

let editOverrides = {};

function _loadOverrides() {
  try { editOverrides = JSON.parse(localStorage.getItem(((window.SECTOR_CONFIG?.sector_id || "mkt") + "_overrides")) || "{}"); } catch { editOverrides = {}; }
}

function _saveOverrides() {
  localStorage.setItem(((window.SECTOR_CONFIG?.sector_id || "mkt") + "_overrides"), JSON.stringify(editOverrides));
}

function _applyOverrides() {
  Object.entries(editOverrides).forEach(([naam, data]) => {
    const c = bedrijvenMap.get(naam);
    if (!c) return;
    Object.entries(data).forEach(([key, val]) => {
      if (val !== null && val !== "") c[key] = val;
    });
  });
}

/* ─── Render ─── */

function renderEdit() {
  const container = document.getElementById("edit-content");
  if (!container) return;
  container.innerHTML = "";

  // Zoekbalk
  const searchWrap = document.createElement("div");
  searchWrap.className = "edit-search-wrap";
  searchWrap.innerHTML = `
    <input type="text" id="edit-search" placeholder="Zoek bedrijf op naam, plaats of BTW..." autocomplete="off"/>
    <div id="edit-suggestions" class="edit-suggestions"></div>
  `;
  container.appendChild(searchWrap);

  // Formulier (initieel verborgen)
  const form = document.createElement("div");
  form.id = "edit-form";
  form.className = "edit-form hidden";
  container.appendChild(form);

  // Recente bewerkingen
  const recent = document.createElement("div");
  recent.id = "edit-recent";
  recent.className = "edit-recent";
  _renderRecent(recent);
  container.appendChild(recent);

  // Event handlers
  const input = document.getElementById("edit-search");
  const suggestions = document.getElementById("edit-suggestions");
  let debounce = null;

  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { suggestions.innerHTML = ""; suggestions.classList.remove("show"); return; }

      const matches = bedrijven.filter(c =>
        c.naam.toLowerCase().includes(q) ||
        (c.adres || "").toLowerCase().includes(q) ||
        (c.btw || "").toLowerCase().includes(q)
      ).slice(0, 10);

      if (matches.length === 0) {
        suggestions.innerHTML = '<div class="edit-sug-empty">Geen resultaten</div>';
        suggestions.classList.add("show");
        return;
      }

      suggestions.innerHTML = matches.map(c => `
        <div class="edit-sug-item" data-naam="${escHtml(c.naam)}">
          <span class="edit-sug-naam">${escHtml(c.naam)}</span>
          <span class="edit-sug-detail">${escHtml(c.adres || "")} ${c.btw ? "| " + escHtml(c.btw) : ""}</span>
        </div>
      `).join("");
      suggestions.classList.add("show");

      suggestions.querySelectorAll(".edit-sug-item").forEach(el => {
        el.addEventListener("click", () => {
          const c = bedrijvenMap.get(el.dataset.naam);
          suggestions.innerHTML = "";
          suggestions.classList.remove("show");
          if (c) {
            input.value = c.naam;
            _openEditForm(c);
          }
        });
      });
    }, 150);
  });

  // Sluit suggesties bij klik buiten (listener in initEdit, niet hier)
}

/* ─── Formulier ─── */

const EDIT_FIELDS = [
  { key: "naam",               label: "Naam",             type: "text",   readonly: true },
  { key: "info",               label: "Omschrijving",     type: "textarea" },
  { key: "adres",              label: "Adres",            type: "text" },
  { key: "btw",                label: "BTW-nummer",       type: "text",   placeholder: "BE 0xxx.xxx.xxx" },
  { key: "website",            label: "Website",          type: "text" },
  { key: "email",              label: "E-mail",           type: "text" },
  { key: "tel",                label: "Telefoon",         type: "text" },
  { key: "oprichting",         label: "Opgericht",        type: "text",   placeholder: "bijv. 1985" },
  { key: "rechtsvorm",         label: "Rechtsvorm",       type: "text",   placeholder: "BV, NV, ..." },
  { key: "grootte",            label: "Grootte",          type: "select", options: ["", "Groot", "Middelgroot", "Klein", "Micro"] },
  { section: "Financieel (CompanyWeb)" },
  { key: "cw_omzet",           label: "Omzet",            type: "number", placeholder: "in euro" },
  { key: "cw_brutomarge",      label: "Brutomarge",       type: "number", placeholder: "in euro" },
  { key: "cw_winst",           label: "Winst/verlies",    type: "number", placeholder: "in euro" },
  { key: "cw_fte",             label: "FTE",              type: "number", placeholder: "bijv. 5.2", step: "0.1" },
  { key: "cw_jaar",            label: "Boekjaar",         type: "number", placeholder: "bijv. 2024" },
  { section: "Financieel (Bizzy / EBITDA)" },
  { key: "bizzy_ebitda",       label: "EBITDA",           type: "number", placeholder: "in euro" },
  { key: "bizzy_revenue",      label: "Omzet (Bizzy)",    type: "number", placeholder: "in euro" },
  { key: "bizzy_fte",          label: "FTE (Bizzy)",      type: "number", placeholder: "bijv. 12", step: "0.1" },
  { section: "Overige" },
  { key: "rijtijd_hertsberge", label: "Rijtijd Hertsberge (min)", type: "number" },
  { key: "rijtijd_drongen",    label: "Rijtijd Drongen (min)",    type: "number" },
  { key: "webshop",            label: "Webshop",          type: "select", options: ["", "Ja", "Nee"] },
];

function _openEditForm(c) {
  const form = document.getElementById("edit-form");
  form.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });

  const overrides = editOverrides[c.naam] || {};

  let html = `<div class="edit-form-header">
    <h3>${escHtml(c.naam)}</h3>
    <div class="edit-form-links">`;
  if (c.btw) {
    const num = c.btw.replace(/[^0-9]/g, "");
    html += `<a href="https://www.companyweb.be/nl/${num}" target="_blank" rel="noopener" class="edit-link">CompanyWeb</a>`;
    html += `<a href="https://app.creditsafe.com/companies/BE-X-${num.replace(/^0+/, "")}" target="_blank" rel="noopener" class="edit-link">Creditsafe</a>`;
    html += `<a href="https://consult.cbso.nbb.be/consult/enterprise/${num}" target="_blank" rel="noopener" class="edit-link">NBB Jaarrekening</a>`;
  }
  html += `</div></div><div class="edit-fields">`;

  EDIT_FIELDS.forEach(f => {
    if (f.section) {
      html += `<div class="edit-section">${f.section}</div>`;
      return;
    }

    const val = overrides[f.key] !== undefined ? overrides[f.key] : (c[f.key] != null ? c[f.key] : "");
    const changed = overrides[f.key] !== undefined ? ' edit-changed' : '';

    if (f.type === "textarea") {
      html += `<div class="edit-field">
        <label>${f.label}</label>
        <textarea data-key="${f.key}" class="edit-input${changed}" ${f.readonly ? "readonly" : ""}>${escHtml(String(val))}</textarea>
      </div>`;
    } else if (f.type === "select") {
      html += `<div class="edit-field">
        <label>${f.label}</label>
        <select data-key="${f.key}" class="edit-input${changed}">
          ${f.options.map(o => `<option value="${o}" ${val === o ? "selected" : ""}>${o || "—"}</option>`).join("")}
        </select>
      </div>`;
    } else {
      html += `<div class="edit-field">
        <label>${f.label}</label>
        <input type="${f.type}" data-key="${f.key}" class="edit-input${changed}" value="${escHtml(String(val))}"
          ${f.placeholder ? `placeholder="${f.placeholder}"` : ""}
          ${f.step ? `step="${f.step}"` : ""}
          ${f.readonly ? "readonly" : ""}/>
      </div>`;
    }
  });

  html += `</div>
    <div class="edit-actions">
      <button id="edit-save" class="edit-btn edit-btn-save">Opslaan</button>
      <button id="edit-reset" class="edit-btn edit-btn-reset">Reset naar origineel</button>
    </div>`;

  form.innerHTML = html;

  // Save handler
  document.getElementById("edit-save").addEventListener("click", () => _saveEdit(c));
  document.getElementById("edit-reset").addEventListener("click", () => _resetEdit(c));
}

function _saveEdit(c) {
  const fields = document.querySelectorAll("#edit-form .edit-input");
  const data = {};
  let changed = 0;

  fields.forEach(el => {
    const key = el.dataset.key;
    if (!key) return;
    const f = EDIT_FIELDS.find(x => x.key === key);
    if (f && f.readonly) return;

    let val = el.tagName === "TEXTAREA" ? el.value : el.value.trim();

    // Type conversie
    if (f && f.type === "number" && val !== "") {
      val = parseFloat(val);
      if (isNaN(val)) return;
    }

    if (val !== "" && val !== null) {
      data[key] = val;
      c[key] = val;
      changed++;
    }
  });

  if (changed > 0) {
    editOverrides[c.naam] = { ...(editOverrides[c.naam] || {}), ...data };
    _saveOverrides();

    // Update marker
    refreshMarkerIcon(c.naam);
    const entry = allMarkers.get(c.naam);
    if (entry && entry.marker.isPopupOpen()) {
      entry.marker.setPopupContent(buildPopup(c));
    }

    showToast(`${c.naam} bijgewerkt (${changed} veld${changed > 1 ? "en" : ""})`, "success", 3000);
    _renderRecent(document.getElementById("edit-recent"));

    // Markeer opgeslagen velden
    fields.forEach(el => {
      if (data[el.dataset.key] !== undefined) el.classList.add("edit-changed");
    });
  } else {
    showToast("Geen wijzigingen", "info", 2000);
  }
}

function _resetEdit(c) {
  if (!editOverrides[c.naam]) return;
  delete editOverrides[c.naam];
  _saveOverrides();
  showToast(`${c.naam} teruggezet naar origineel`, "info", 3000);
  _openEditForm(c); // Herlaad formulier
  _renderRecent(document.getElementById("edit-recent"));
}

/* ─── Recente bewerkingen ─── */

function _renderRecent(container) {
  if (!container) return;
  const names = Object.keys(editOverrides);
  if (names.length === 0) {
    container.innerHTML = '<div class="edit-recent-empty">Nog geen bewerkingen. Zoek een bedrijf hierboven om te beginnen.</div>';
    return;
  }

  let html = '<h3>Bewerkte bedrijven</h3><div class="edit-recent-list">';
  names.forEach(naam => {
    const data = editOverrides[naam];
    const fields = Object.keys(data).filter(k => data[k] !== null && data[k] !== "");
    html += `<div class="edit-recent-item" data-naam="${escHtml(naam)}">
      <span class="edit-recent-naam">${escHtml(naam)}</span>
      <span class="edit-recent-fields">${fields.length} veld${fields.length > 1 ? "en" : ""} aangepast</span>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll(".edit-recent-item").forEach(el => {
    el.addEventListener("click", () => {
      const c = bedrijvenMap.get(el.dataset.naam);
      if (c) {
        document.getElementById("edit-search").value = c.naam;
        _openEditForm(c);
      }
    });
  });
}

/* ─── Init ─── */

function initEdit() {
  _loadOverrides();
  _applyOverrides();

  // Sluit edit-suggesties bij klik buiten (eenmalig, geen leak)
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".edit-search-wrap")) {
      const sug = document.getElementById("edit-suggestions");
      if (sug) { sug.innerHTML = ""; sug.classList.remove("show"); }
    }
  });
}
