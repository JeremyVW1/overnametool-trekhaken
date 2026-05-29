/* ═══════════════════════════════════════════════════════════════
   status.js — Status toggles (★ favoriet, ● twijfel, ✗ niet)
   en UI helpers (knoppen, counters).
   renderFavorieten / renderTwijfel / exportFavCSV / exportTwijfelCSV
   staan in analyse.js.
   ═══════════════════════════════════════════════════════════════ */

function isFavorite(naam) { return favorites.has(naam); }
function isOrange(naam)   { return markedOrange.has(naam); }
function isRed(naam)      { return markedRed.has(naam); }

function _companyPostData(c) {
  return {
    naam: c.naam,
    land: c.land || "",
    provincie: provLabel(c),
    categorieen: (c.categorieen || []).join("|"),
    primaire_categorie: c.primaire_categorie || "",
    grootte: GROOTTE_LONG[c.grootte] || "",
    adres: c.adres || "",
    btw: c.btw || "",
    kvk: c.kvk || "",
    website: c.website || "",
  };
}

function toggleFavorite(company) {
  const naam = company.naam;
  const removing = favorites.has(naam);
  if (removing) favorites.delete(naam); else favorites.add(naam);
  if (!removing) {
    if (markedOrange.has(naam)) { markedOrange.delete(naam); _post({ action: "remove_twijfel", naam }); }
    if (markedRed.has(naam))    { markedRed.delete(naam);    _post({ action: "remove_red", naam }); }
  }
  _saveLocal();
  updateStatusButtons(naam);
  updateFavCount();
  updateOrangeCount();
  _post({
    action: removing ? "remove" : "add",
    ..._companyPostData(company),
    notes: favNotes[naam] || "",
    notes_vincent: favNotesVincent[naam] || "",
  });
}

function toggleOrange(company) {
  const naam = company.naam;
  const removing = markedOrange.has(naam);
  if (removing) markedOrange.delete(naam); else markedOrange.add(naam);
  if (!removing) {
    if (favorites.has(naam)) { favorites.delete(naam); _post({ action: "remove", naam }); }
    if (markedRed.has(naam)) { markedRed.delete(naam); _post({ action: "remove_red", naam }); }
  }
  _saveLocal();
  updateStatusButtons(naam);
  updateFavCount();
  updateOrangeCount();
  _post({
    action: removing ? "remove_twijfel" : "add_twijfel",
    ..._companyPostData(company),
    notes_jeremy: orangeNotes[naam] || "",
    notes_vincent: orangeNotesVincent[naam] || "",
  });
}

function toggleRed(company) {
  const naam = company.naam;
  const removing = markedRed.has(naam);
  if (removing) markedRed.delete(naam); else markedRed.add(naam);
  if (!removing) {
    if (favorites.has(naam))    { favorites.delete(naam);    _post({ action: "remove", naam }); }
    if (markedOrange.has(naam)) { markedOrange.delete(naam); _post({ action: "remove_twijfel", naam }); }
  }
  _saveLocal();
  updateStatusButtons(naam);
  updateFavCount();
  updateOrangeCount();
  _post({
    action: removing ? "remove_red" : "add_red",
    ..._companyPostData(company),
    notes_jeremy: redNotes[naam] || "",
    notes_vincent: redNotesVincent[naam] || "",
  });
}

function buildStatusHtml(naam) {
  const fav = isFavorite(naam);
  const orange = isOrange(naam);
  const red = isRed(naam);
  return `
    <button class="star-btn ${fav ? "starred" : ""}" data-naam="${escHtml(naam)}" title="${fav ? "Verwijder favoriet" : "Markeer favoriet"}">${fav ? "★" : "☆"}</button>
    <button class="orange-btn ${orange ? "marked-orange" : ""}" data-naam="${escHtml(naam)}" title="${orange ? "Verwijder twijfel" : "Markeer twijfel"}">●</button>
    <button class="red-btn ${red ? "marked-red" : ""}" data-naam="${escHtml(naam)}" title="${red ? "Verwijder niet-interessant" : "Markeer niet-interessant"}">✗</button>
  `;
}

function updateStatusButtons(naam) {
  document.querySelectorAll(`.star-btn[data-naam="${CSS.escape(naam)}"]`).forEach(btn => {
    const on = isFavorite(naam);
    btn.classList.toggle("starred", on);
    btn.innerHTML = on ? "★" : "☆";
  });
  document.querySelectorAll(`.orange-btn[data-naam="${CSS.escape(naam)}"]`).forEach(btn => {
    btn.classList.toggle("marked-orange", isOrange(naam));
  });
  document.querySelectorAll(`.red-btn[data-naam="${CSS.escape(naam)}"]`).forEach(btn => {
    btn.classList.toggle("marked-red", isRed(naam));
  });
}

function updateFavCount() {
  const el = document.getElementById("fav-count");
  if (el) el.textContent = favorites.size;
}

function updateOrangeCount() {
  const el = document.getElementById("orange-count");
  if (el) el.textContent = markedOrange.size;
}

window.isFavorite = isFavorite;
window.isOrange = isOrange;
window.isRed = isRed;
window.toggleFavorite = toggleFavorite;
window.toggleOrange = toggleOrange;
window.toggleRed = toggleRed;
window.buildStatusHtml = buildStatusHtml;
window.updateStatusButtons = updateStatusButtons;
window.updateFavCount = updateFavCount;
window.updateOrangeCount = updateOrangeCount;
