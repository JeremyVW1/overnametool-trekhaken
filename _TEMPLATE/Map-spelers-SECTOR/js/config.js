/* ═══════════════════════════════════════════════════════════════
   config.js — sector-agnostische constanten en helpers.
   Sector-specifieke waarden komen uit window.SECTOR_CONFIG
   (gezet door sector-bootstrap.js).
   ═══════════════════════════════════════════════════════════════ */

const SEARCH_DEBOUNCE_MS = 150;
const SEARCH_MAX_RESULTS = 8;

/* Wordt door app.js gevuld op basis van SECTOR_CONFIG.provincies */
const PROV_LABELS = {};
const PROV_KLEUR  = {};
const LAND_LABELS = {};
const LAND_KLEUR  = {};

/* Categorieën — gevuld door app.js op basis van SECTOR_CONFIG.categorieen */
const CAT_LABEL = {};
const CAT_KLEUR = {};

/* Groottes — defaults; kunnen via sector.config.json (groottes-array) override worden */
const GROOTTE_LABELS = {
  Groot:        "GROTE / DOMINANTE SPELER",
  Middelgroot:  "Middelgrote speler",
  Klein:        "Lokale speler",
  Micro:        "Micro-onderneming"
};
const GROOTTE_SHORT  = { Groot: "Groot", Middelgroot: "Midden", Klein: "Klein", Micro: "Micro" };
const GROOTTE_LONG   = { Groot: "Groot", Middelgroot: "Middelgroot", Klein: "Klein", Micro: "Micro" };
const GROOTTE_RADIUS = { Groot: 13, Middelgroot: 10, Klein: 7, Micro: 5 };

/* ─── Formattering ─── */
function fmtK(n) {
  if (n == null || n === "") return "—";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "—";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1000000) return sign + "€" + (abs / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1000)    return sign + "€" + Math.round(abs / 1000) + "K";
  return sign + "€" + Math.round(abs);
}

function escHtml(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ─── Data-helpers ─── */
function catLabelsOf(c) {
  const cats = c.categorieen || (c.categorie ? [c.categorie] : []);
  return cats.map(id => CAT_LABEL[id] || id);
}
function catLabel(c)       { return catLabelsOf(c).join(", "); }
function sizeLabel(c)      { return GROOTTE_SHORT[c.grootte] || ""; }
function sizeLabelLong(c)  { return GROOTTE_LONG[c.grootte] || ""; }
function provLabel(c)      { return PROV_LABELS[c.provincie] || c.provincie || ""; }
function landLabel(c)      { return LAND_LABELS[c.land] || c.land || ""; }

function adresLinkHtml(c) {
  if (!c.adres) return "";
  const q = encodeURIComponent(c.adres);
  return `<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${escHtml(c.adres)}</a>`;
}

function webLinkHtml(c) {
  if (!c.website) return "";
  const url = c.website.startsWith("http") ? c.website : "https://" + c.website;
  return `<a href="${escHtml(url)}" target="_blank" rel="noopener">${escHtml(c.website)}</a>`;
}

/**
 * BTW (BE) of KvK (NL) link.
 * - BE → CompanyWeb + Creditsafe
 * - NL → KvK + BoldData
 */
function btwLinkHtml(c) {
  if (c.land === "NL" && c.kvk) {
    const num = String(c.kvk).replace(/[^0-9]/g, "");
    return `<a href="https://www.kvk.nl/orderstraat/bedrijfsprofiel/?kvknummer=${num}" target="_blank" rel="noopener" title="KvK">${escHtml(c.kvk)}</a>`;
  }
  if (c.btw) {
    const num = String(c.btw).replace(/[^0-9]/g, "");
    return `<a href="https://www.companyweb.be/nl/${num}" target="_blank" rel="noopener" title="CompanyWeb">${escHtml(c.btw)}</a>`
      + ` <a href="https://app.creditsafe.com/companies/BE-X-${num.replace(/^0+/, "")}" target="_blank" rel="noopener" class="cs-link" title="Creditsafe">CS</a>`;
  }
  return "";
}

/* ─── Toast notificaties ─── */
function showToast(message, type = "info", duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => toast.remove());
  }, duration);
}

/* Expose helpers globaal (gebruikt door categorie-tabs.js) */
window.fmtK = fmtK;
window.escHtml = escHtml;
