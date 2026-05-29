/* ═══════════════════════════════════════════════════════════════
   sync.js — Google Sheets sync + localStorage fallback.
   Sector-agnostisch — leest URL uit window.SECTOR_CONFIG.
   LocalStorage-keys krijgen sector-prefix om kruis-sector
   conflicten te vermijden.
   ═══════════════════════════════════════════════════════════════ */

let favorites          = new Set();
let favNotes           = {};
let favNotesVincent    = {};
let markedOrange       = new Set();
let orangeNotes        = {};
let orangeNotesVincent = {};
let markedRed          = new Set();
let redNotes           = {};
let redNotesVincent    = {};

const SYNC_INTERVAL = 30000;
let _syncTimer = null;
const _saveTimers = {};

function getSheetUrl() { return window.SECTOR_CONFIG?.google_sheets_url || ""; }
function _k(suffix)    { return (window.SECTOR_CONFIG?.sector_id || "mkt") + "_" + suffix; }

/* ─── localStorage ─── */
function _loadLocal() {
  const get = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(_k(k)) || fallback); }
    catch { return JSON.parse(fallback); }
  };
  favorites          = new Set(get("favs", "[]"));
  favNotes           = get("notes", "{}");
  favNotesVincent    = get("notes_v", "{}");
  markedOrange       = new Set(get("orange", "[]"));
  orangeNotes        = get("orange_notes", "{}");
  orangeNotesVincent = get("orange_notes_v", "{}");
  markedRed          = new Set(get("red", "[]"));
  redNotes           = get("red_notes", "{}");
  redNotesVincent    = get("red_notes_v", "{}");
}

function _saveLocal() {
  const set = (k, v) => localStorage.setItem(_k(k), JSON.stringify(v));
  set("favs",            [...favorites]);
  set("notes",           favNotes);
  set("notes_v",         favNotesVincent);
  set("orange",          [...markedOrange]);
  set("orange_notes",    orangeNotes);
  set("orange_notes_v",  orangeNotesVincent);
  set("red",             [...markedRed]);
  set("red_notes",       redNotes);
  set("red_notes_v",     redNotesVincent);
}

/* ─── Google Sheets POST ─── */
function _post(data) {
  const url = getSheetUrl();
  if (!url) return;
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(data),
  }).catch(() => {
    if (typeof showToast === "function") {
      showToast("Sync mislukt — lokaal opgeslagen.", "warning", 4000);
    }
  });
}

/* ─── Sheets → geheugen ─── */
function _name(r) { return r.Naam || r.naam || ""; }

function _parseBlad1(data) {
  if (!Array.isArray(data) || !data.length) return;
  favorites = new Set(data.map(_name));
  favNotes = {};
  favNotesVincent = {};
  for (const r of data) {
    const naam = _name(r);
    if (!naam) continue;
    const nJ = r.notes || r["Notes Jeremy"] || "";
    const nV = r.notes_vincent || r["Notes Vincent"] || "";
    if (nJ) favNotes[naam] = nJ;
    if (nV) favNotesVincent[naam] = nV;
  }
}

function _parseStatusTab(data, set, notesJ, notesV) {
  if (!Array.isArray(data) || !data.length) return;
  set.clear();
  Object.keys(notesJ).forEach(k => delete notesJ[k]);
  Object.keys(notesV).forEach(k => delete notesV[k]);
  for (const r of data) {
    const naam = _name(r);
    if (!naam) continue;
    set.add(naam);
    const nJ = r["Notes Jeremy"] || r.notes || "";
    const nV = r["Notes Vincent"] || r.notes_vincent || "";
    if (nJ) notesJ[naam] = nJ;
    if (nV) notesV[naam] = nV;
  }
}

async function _fetchSheetData() {
  const url = getSheetUrl();
  if (!url) return false;
  try {
    const [r1, r3, r4] = await Promise.all([
      fetch(url),
      fetch(url + "?tab=twijfel"),
      fetch(url + "?tab=nietinteressant"),
    ]);
    const blad1 = await r1.json();
    _parseBlad1(blad1);
    try {
      const twijfelData = await r3.json();
      _parseStatusTab(twijfelData, markedOrange, orangeNotes, orangeNotesVincent);
    } catch { /* tab might not exist */ }
    try {
      const redData = await r4.json();
      _parseStatusTab(redData, markedRed, redNotes, redNotesVincent);
    } catch { /* tab might not exist */ }
    return true;
  } catch {
    return false;
  }
}

async function loadFavorites() {
  _loadLocal();
  if (getSheetUrl()) await _fetchSheetData();
  _saveLocal();
  if (typeof updateFavCount === "function") updateFavCount();
  if (typeof updateOrangeCount === "function") updateOrangeCount();
}

async function _autoSync() {
  if (!getSheetUrl()) return;
  const prevFav = favorites.size;
  const prevOr  = markedOrange.size;
  await _fetchSheetData();
  _saveLocal();
  if (favorites.size !== prevFav && typeof updateFavCount === "function") updateFavCount();
  if (markedOrange.size !== prevOr && typeof updateOrangeCount === "function") updateOrangeCount();
}

function startAutoSync() {
  if (!getSheetUrl()) return;
  if (_syncTimer) clearInterval(_syncTimer);
  _syncTimer = setInterval(_autoSync, SYNC_INTERVAL);
}

/* ─── Note opslaan ─── */
function saveNote(naam, text, who) {
  (who === "vincent" ? favNotesVincent : favNotes)[naam] = text;
  _saveLocal();
  document.querySelectorAll(`.fav-note[data-naam="${CSS.escape(naam)}"][data-who="${who}"]`).forEach(ta => {
    if (ta.value !== text) ta.value = text;
  });
  const key = naam + "_fav_" + who;
  clearTimeout(_saveTimers[key]);
  _saveTimers[key] = setTimeout(() => {
    if (favorites.has(naam)) {
      _post({
        action: "update_note",
        naam,
        notes: favNotes[naam] || "",
        notes_vincent: favNotesVincent[naam] || "",
      });
    }
  }, 1000);
}

function saveStatusNote(naam, text, who, status) {
  const notesJ = status === "orange" ? orangeNotes : redNotes;
  const notesV = status === "orange" ? orangeNotesVincent : redNotesVincent;
  (who === "vincent" ? notesV : notesJ)[naam] = text;
  _saveLocal();
  const key = naam + "_" + status + "_" + who;
  clearTimeout(_saveTimers[key]);
  _saveTimers[key] = setTimeout(() => {
    const action = status === "orange" ? "update_twijfel_note" : "update_red_note";
    _post({
      action,
      naam,
      notes_jeremy: notesJ[naam] || "",
      notes_vincent: notesV[naam] || "",
    });
  }, 1000);
}

/* ─── Expose ─── */
window.favorites = favorites;
window.favNotes = favNotes;
window.favNotesVincent = favNotesVincent;
window.markedOrange = markedOrange;
window.markedRed = markedRed;
window.orangeNotes = orangeNotes;
window.redNotes = redNotes;
window.loadFavorites = loadFavorites;
window.startAutoSync = startAutoSync;
window.saveNote = saveNote;
window.saveStatusNote = saveStatusNote;
window._post = _post;
