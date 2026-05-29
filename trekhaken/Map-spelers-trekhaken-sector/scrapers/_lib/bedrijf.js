/**
 * bedrijf.js — Helpers voor het bedrijf-record-schema dat overal hetzelfde is.
 * Schema (zie ook README): naam, land, provincie, lat/lng, adres, btw/kvk, website, categorieen, bron.
 */

/** Maak een leeg bedrijf-record met basis-velden */
export function makeBedrijf(initial = {}) {
  return {
    naam: "",
    land: "",
    provincie: "",
    categorieen: [],
    primaire_categorie: null,
    grootte: null,
    lat: null,
    lng: null,
    adres: "",
    postcode: "",
    plaats: "",
    btw: "",
    kvk: "",
    website: "",
    telefoon: "",
    email: "",
    nace: [],
    sbi: [],
    merken_gevoerd: [],
    cw_omzet: null,
    cw_brutomarge: null,
    cw_winst: null,
    cw_fte: null,
    cw_jaar: null,
    bizzy_ebitda: null,
    bizzy_revenue: null,
    bizzy_fte: null,
    webshop: null,
    info: "",
    bron: [],
    ...initial,
  };
}

/** Normaliseer een naam zodat verschillende schrijfwijzes matchen (lowercase, accenten weg, &→en) */
export function normName(name) {
  if (!name) return "";
  return String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "en")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.\-]/g, "")
    .trim();
}

/** Strip alle non-digits van BTW of KvK; returns "" als nul digits */
export function digitsOnly(s) {
  if (!s) return "";
  const d = String(s).replace(/[^0-9]/g, "");
  return d || "";
}

/** Heuristic: lat/lng plausibel binnen Benelux box */
export function inBeneluxBbox(lat, lng) {
  return typeof lat === "number" && typeof lng === "number"
    && lat >= 49.4 && lat <= 53.6
    && lng >= 2.3  && lng <= 7.3;
}

/** Heuristic: bepaal land op basis van lat/lng (grof) */
export function landFromCoord(lat, lng) {
  if (!inBeneluxBbox(lat, lng)) return "";
  // Boven 51.43 + west van 6.0 → meestal NL (grof, BE-NL grens loopt rond 51.35-51.50)
  return lat > 51.45 ? "NL" : "BE";
}
