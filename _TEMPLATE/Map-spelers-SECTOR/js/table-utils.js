/* Houtkaart — Gedeelde tabel-bouwers, CSV export & event handlers
 *
 * Verplaatst uit config.js — bevat UI-logica die niet bij configuratie hoort.
 */

/* ─── Gedeelde status-knoppen (ster/oranje/rood) ─── */
function buildStatusHtml(naam) {
  const isFav = isFavorite(naam);
  const isOr  = isOrange(naam);
  const isRd  = isRed(naam);
  if (isFav)            return `<button class="star-btn starred" data-naam="${escHtml(naam)}" title="Verwijder uit favorieten">★</button>`;
  if (isOr)             return `<button class="orange-btn marked-orange" data-naam="${escHtml(naam)}" title="Verwijder twijfel">?</button>`;
  if (isRd)             return `<button class="red-btn marked-red" data-naam="${escHtml(naam)}" title="Verwijder niet-interessant">✕</button>`;
  return `<button class="star-btn" data-naam="${escHtml(naam)}" title="Favoriet">☆</button>
    <button class="orange-btn" data-naam="${escHtml(naam)}" title="Twijfel">?</button>
    <button class="red-btn" data-naam="${escHtml(naam)}" title="Niet interessant">✕</button>`;
}

/* ─── Gedeelde tabel-rij bouwer ─── */
function buildTableRow(c, opts) {
  const gem = gemRijtijd(c);
  const sc  = rijtijdClass(gem);
  const st  = scoreText(c);

  let h = "";
  if (opts.rang != null) h += `<td class="top15-rang">${opts.rang}</td>`;
  h += `<td class="td-status">${buildStatusHtml(c.naam)}</td>`;
  h += `<td class="td-naam">${escHtml(c.naam)}${c.bron === "bizzy" ? ' <span class="bizzy-badge">B</span>' : ""}</td>`;
  h += `<td>${provLabel(c)}</td>`;
  h += `<td>${escHtml(actLabel(c))}</td>`;
  h += `<td><span class="size-badge ${c.grootte}">${sizeLabel(c)}</span></td>`;

  h += `<td class="td-num">${c.cw_omzet ? fmtK(c.cw_omzet) : ""}</td>`;
  h += `<td class="td-num">${c.cw_brutomarge ? fmtK(c.cw_brutomarge) : ""}</td>`;
  h += `<td class="td-num" style="color:#1565C0;font-weight:600">${c.bizzy_ebitda ? fmtK(c.bizzy_ebitda) : ""}</td>`;
  h += `<td class="td-num" style="color:#1565C0">${c.bizzy_revenue ? fmtK(c.bizzy_revenue) : ""}</td>`;
  const wClass = c.cw_winst != null ? (c.cw_winst >= 0 ? "fin-pos" : "fin-neg") : "";
  h += `<td class="td-num ${wClass}">${c.cw_winst != null ? fmtK(c.cw_winst) : ""}</td>`;
  h += `<td class="td-num" style="color:#1565C0">${c.bizzy_fte != null ? c.bizzy_fte : ""}</td>`;
  h += `<td class="td-num">${c.cw_fte != null ? c.cw_fte : ""}</td>`;

  h += `<td class="td-adres">${adresLinkHtml(c)}</td>`;
  h += `<td class="td-btw">${btwLinkHtml(c)}</td>`;
  h += `<td class="td-web">${webLinkHtml(c)}</td>`;
  h += `<td class="td-num">${c.rijtijd_hertsberge != null ? c.rijtijd_hertsberge + "'" : ""}</td>`;
  h += `<td class="td-num">${c.rijtijd_drongen != null ? c.rijtijd_drongen + "'" : ""}</td>`;
  h += `<td class="td-num td-dichtste ${sc}">${st}</td>`;

  if (opts.top15) {
    h += `<td class="top15-digitaal">${escHtml(opts.digitaal || "")}</td>`;
    h += `<td class="top15-notitie">${escHtml(opts.notitie || "")}</td>`;
  }
  if (opts.showNotes) {
    h += `<td class="td-notes"><textarea class="fav-note" data-naam="${escHtml(c.naam)}" data-who="jeremy" placeholder="Notitie Jeremy…">${escHtml(favNotes[c.naam] || "")}</textarea></td>`;
    h += `<td class="td-notes"><textarea class="fav-note" data-naam="${escHtml(c.naam)}" data-who="vincent" placeholder="Notitie Vincent…">${escHtml(favNotesVincent[c.naam] || "")}</textarea></td>`;
  }
  return h;
}

/* ─── Gedeelde CSV bouwer ─── */
function buildCSV(data, extraCols) {
  const base = ["Naam", "Regio", "Activiteiten", "Grootte", "Omzet (CW)", "Brutomarge (CW)", "EBITDA (Bizzy)", "Omzet (Bizzy)", "Winst (CW)", "FTE (Bizzy)", "FTE (CW)", "Adres", "BTW", "Website", "Rijtijd Hertsberge", "Rijtijd Drongen", "Gem. rijtijd H+D"];
  const header = extraCols ? [...base, ...extraCols] : base;

  const rows = data.map(c => {
    const baseRow = [
      c.naam, provLabel(c), actLabel(c), sizeLabelLong(c),
      c.cw_omzet || "", c.cw_brutomarge || "", c.bizzy_ebitda != null ? c.bizzy_ebitda : "", c.bizzy_revenue != null ? c.bizzy_revenue : "", c.cw_winst != null ? c.cw_winst : "", c.bizzy_fte != null ? c.bizzy_fte : "", c.cw_fte != null ? c.cw_fte : "",
      c.adres || "", c.btw || "", c.website || "",
      c.rijtijd_hertsberge != null ? c.rijtijd_hertsberge : "",
      c.rijtijd_drongen != null ? c.rijtijd_drongen : "",
      gemRijtijd(c) != null ? gemRijtijd(c) : "",
    ];
    return baseRow;
  });
  return [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Gedeelde event handlers ─── */
function attachNoteHandlers(container) {
  container.querySelectorAll(".fav-note").forEach(ta => {
    ta.addEventListener("input", () => saveNote(ta.dataset.naam, ta.value, ta.dataset.who || "jeremy"));
  });
}
