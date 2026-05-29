/* ═══════════════════════════════════════════════════════════════
   markers.js — sector-agnostische markers + popups.
   Marker-kleur volgt categorie-prioriteit uit sector.config.json
   (via window.getMarkerKleur() — gezet door sector-bootstrap.js).
   ═══════════════════════════════════════════════════════════════ */

let markers = [];
const allMarkers = new Map(); // naam → { marker, company }

function makeIcon(col, r, isGroot, isFav, isOr, isRd, zekerheid) {
  const s = r * 2 + 8;
  const ring = isGroot
    ? `<circle cx="${s / 2}" cy="${s / 2}" r="${r + 4}" fill="none" stroke="${col}" stroke-width="1.5" opacity="0.28"/>`
    : "";

  // Status-ring prioriteit: rood > oranje > favoriet
  let statusRing = "";
  let stroke = "white", strokeW = 1.8;
  if (isRd) {
    statusRing = `<circle cx="${s / 2}" cy="${s / 2}" r="${r + 2}" fill="none" stroke="#c62828" stroke-width="2.5" opacity="0.8"/>`;
    stroke = "#c62828"; strokeW = 2;
  } else if (isOr) {
    statusRing = `<circle cx="${s / 2}" cy="${s / 2}" r="${r + 2}" fill="none" stroke="#FB8C00" stroke-width="2.5" opacity="0.8"/>`;
    stroke = "#FB8C00"; strokeW = 2;
  } else if (isFav) {
    statusRing = `<circle cx="${s / 2}" cy="${s / 2}" r="${r + 2}" fill="none" stroke="#FFC107" stroke-width="1.5" opacity="0.6"/>`;
    stroke = "#FFC107"; strokeW = 2.5;
  }

  // Trekhaak-zekerheid: laag = gestippelde rand + lagere opacity
  // midden = full ring blijft, hoog = full (default)
  let dasharray = "";
  let fillOpacity = 0.93;
  if (zekerheid === "laag") {
    dasharray = ` stroke-dasharray="2 2"`;
    fillOpacity = 0.55;
  } else if (zekerheid === "midden") {
    dasharray = ` stroke-dasharray="4 2"`;
    fillOpacity = 0.78;
  }

  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${ring}${statusRing}<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${col}" stroke="${stroke}" stroke-width="${strokeW}"${dasharray} opacity="${fillOpacity}"/></svg>`,
    className: "",
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}

/**
 * Marker-kleur op basis van categorie-prioriteit.
 * Fallback naar grijs.
 */
function getCategorieColor(c) {
  if (typeof window.getMarkerKleur === "function") {
    return window.getMarkerKleur(c);
  }
  return "#9E9E9E";
}

function buildPopup(c) {
  const col      = getCategorieColor(c);
  const prov     = provLabel(c);
  const land     = landLabel(c);
  const sizeText = GROOTTE_LABELS[c.grootte] || "Onbekend";
  const cats     = c.categorieen || (c.categorie ? [c.categorie] : []);
  const primaire = c.primaire_categorie || cats[0];
  const primaireLbl = CAT_LABEL[primaire] || primaire || "?";

  // Categorieën-badge (alle)
  const catBadges = cats.map(id => {
    const kleur = CAT_KLEUR[id] || "#9E9E9E";
    const lbl   = CAT_LABEL[id] || id;
    const isPri = (id === primaire);
    return `<span class="popup-badge" style="background:${kleur}${isPri ? '' : ';opacity:0.6'}">${escHtml(lbl)}${isPri ? ' ★' : ''}</span>`;
  }).join(" ");

  // Contactblok
  const adres   = c.adres || "";
  const website = c.website || "";
  const tel     = c.telefoon || "";
  let contactHtml = '<div class="popup-contact">';
  if (adres)   contactHtml += `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}" target="_blank" rel="noopener" class="popup-link">📍 ${escHtml(adres)}</a>`;
  if (tel)     contactHtml += `<a href="tel:${tel.replace(/[^+\d]/g, "")}" class="popup-link">📞 ${escHtml(tel)}</a>`;
  if (website) {
    const url = website.startsWith("http") ? website : "https://" + website;
    contactHtml += `<a href="${escHtml(url)}" target="_blank" rel="noopener" class="popup-link">🌐 ${escHtml(website)}</a>`;
  }
  contactHtml += "</div>";

  // Bedrijfsdata (BTW/KvK + omzet/medewerkers)
  let enrichHtml = "";
  if (c.btw || c.kvk || c.omzet || c.medewerkers || c.oprichting) {
    enrichHtml = '<div class="popup-enrich">';
    if (c.groep)        enrichHtml += `<b>Groep:</b> ${escHtml(c.groep)}<br>`;
    if (c.btw)          enrichHtml += `<b>BTW:</b> ${escHtml(c.btw)}<br>`;
    if (c.kvk)          enrichHtml += `<b>KvK:</b> ${escHtml(c.kvk)}<br>`;
    if (c.omzet)        enrichHtml += `<b>Omzet:</b> ${escHtml(c.omzet)}<br>`;
    if (c.medewerkers)  enrichHtml += `<b>Werknemers:</b> ${escHtml(c.medewerkers)}<br>`;
    if (c.oprichting)   enrichHtml += `<b>Opgericht:</b> ${escHtml(c.oprichting)}<br>`;
    if (c.rechtsvorm)   enrichHtml += `<b>Vorm:</b> ${escHtml(c.rechtsvorm)}<br>`;
    if (c.btw) {
      const btwNum = String(c.btw).replace(/[^0-9]/g, "");
      enrichHtml += `<a href="https://www.companyweb.be/nl/${btwNum}" target="_blank" rel="noopener" class="popup-link" style="font-size:10px">📊 CompanyWeb</a>`;
      enrichHtml += ` <a href="https://app.creditsafe.com/companies/BE-X-${btwNum.replace(/^0+/, "")}" target="_blank" rel="noopener" class="popup-link" style="font-size:10px">🔍 Creditsafe</a>`;
    }
    if (c.kvk) {
      const kvkNum = String(c.kvk).replace(/[^0-9]/g, "");
      enrichHtml += `<a href="https://www.kvk.nl/orderstraat/bedrijfsprofiel/?kvknummer=${kvkNum}" target="_blank" rel="noopener" class="popup-link" style="font-size:10px">📊 KvK</a>`;
    }
    enrichHtml += "</div>";
  }

  // Financiële data
  let finHtml = "";
  if (c.cw_brutomarge != null || c.cw_omzet != null || c.cw_winst != null || c.cw_fte != null) {
    const yr = c.cw_jaar ? ` (${c.cw_jaar})` : "";
    finHtml = `<div class="popup-financials">
      <div class="popup-fin-title">📊 Financieel${yr}</div>
      ${c.cw_omzet != null      ? `<span class="popup-fin-item"><b>Omzet:</b> ${fmtK(c.cw_omzet)}</span>` : ""}
      ${c.cw_brutomarge != null  ? `<span class="popup-fin-item"><b>Brutomarge:</b> ${fmtK(c.cw_brutomarge)}</span>` : ""}
      ${c.cw_winst != null       ? `<span class="popup-fin-item"><b>Winst:</b> <span class="${c.cw_winst >= 0 ? "fin-pos" : "fin-neg"}">${fmtK(c.cw_winst)}</span></span>` : ""}
      ${c.cw_fte != null         ? `<span class="popup-fin-item"><b>Personeel:</b> ${c.cw_fte} FTE</span>` : ""}
    </div>`;
  }

  // EBITDA
  let ebitdaHtml = "";
  if (c.bizzy_ebitda != null) {
    ebitdaHtml = `<div class="popup-fin-item" style="margin-top:4px"><b>EBITDA:</b> <span style="color:var(--brand-primary);font-weight:700">${fmtK(c.bizzy_ebitda)}</span></div>`;
  }

  // Bron-vermelding
  let bronHtml = "";
  if (Array.isArray(c.bron) && c.bron.length) {
    bronHtml = `<div class="popup-bronnen" style="margin-top:4px;font-size:10px;color:var(--color-text-muted)">📚 ${c.bron.join(", ")}</div>`;
  }

  return `
    <div class="popup-header-row">
      <div>${catBadges} <span class="popup-prov">${escHtml(land ? `${land} · ${prov}` : prov)}</span></div>
      <div class="popup-actions">${typeof buildStatusHtml === "function" ? buildStatusHtml(c.naam) : ""}</div>
    </div>
    <span class="popup-name">${escHtml(c.naam)}</span>
    ${c.info ? `<span class="popup-info">${escHtml(c.info)}</span>` : ""}
    ${contactHtml}
    ${enrichHtml}
    ${finHtml}
    ${ebitdaHtml}
    ${bronHtml}
    <span class="popup-size ${c.grootte || ""}">${escHtml(sizeText)}</span>
  `;
}

/* ─── Eenmalig alle markers aanmaken ─── */
function createAllMarkers() {
  bedrijven.forEach(c => {
    if (typeof c.lat !== "number" || typeof c.lng !== "number") return;
    const col = getCategorieColor(c);
    const r = GROOTTE_RADIUS[c.grootte] || 7;
    const m = L.marker([c.lat, c.lng], {
      icon: makeIcon(col, r, c.grootte === "Groot", isFavorite(c.naam), isOrange(c.naam), isRed(c.naam), c.trekhaak_zekerheid)
    });
    m.bindPopup(() => buildPopup(c), { maxWidth: 320 });
    allMarkers.set(c.naam, { marker: m, company: c });
  });
}

/* ─── Render markers op basis van actieve filters ─── */
function render() {
  const visible = new Set(getVisibleCompanies().map(c => c.naam));
  allMarkers.forEach(({ marker }, naam) => {
    if (visible.has(naam)) {
      if (!map.hasLayer(marker)) map.addLayer(marker);
    } else {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    }
  });
  markers = [...visible].map(n => allMarkers.get(n)?.marker).filter(Boolean);
}

/* ─── Eén marker-icoon updaten ─── */
function refreshMarkerIcon(naam) {
  const entry = allMarkers.get(naam);
  if (!entry) return;
  const c = entry.company;
  const col = getCategorieColor(c);
  const r = GROOTTE_RADIUS[c.grootte] || 7;
  entry.marker.setIcon(makeIcon(col, r, c.grootte === "Groot", isFavorite(naam), isOrange(naam), isRed(naam), c.trekhaak_zekerheid));
}

window.createAllMarkers = createAllMarkers;
window.render = render;
window.refreshMarkerIcon = refreshMarkerIcon;
window.allMarkers = allMarkers;
window.buildPopup = buildPopup;
