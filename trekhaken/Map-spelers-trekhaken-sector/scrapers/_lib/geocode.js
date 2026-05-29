/**
 * geocode.js — Nominatim (OpenStreetMap) geocoding helper.
 * GRATIS, maar rate-limit 1 req/sec. Cache wordt ALTIJD gebruikt.
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { CACHE_DIR } from "./config.js";
import { readJson, writeJson } from "./io.js";

const CACHE_FILE = resolve(CACHE_DIR, "_geocode-cache.json");

let cache = readJson(CACHE_FILE, {});
let lastRequest = 0;

/**
 * Geocode een adres → { lat, lng, provincie, land }
 * Cached. Rate-limit 1 req/sec.
 */
export async function geocode(adres) {
  if (!adres) return null;
  const key = adres.toLowerCase().trim();
  if (cache[key]) return cache[key];

  // Rate-limit: minstens 1.1 sec sinds vorige request
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(adres)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "marktkaart-scrapers/1.0 (jeremyvanwetter@gmail.com)" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data?.length) {
      cache[key] = null;
      writeJson(CACHE_FILE, cache);
      return null;
    }
    const r = data[0];
    const result = {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      provincie: mapProvincie(r.address?.state || r.address?.county || ""),
      land: r.address?.country_code?.toUpperCase() || "",
    };
    cache[key] = result;
    writeJson(CACHE_FILE, cache);
    return result;
  } catch (err) {
    cache[key] = null;
    writeJson(CACHE_FILE, cache);
    return null;
  }
}

/** Map provincie-namen naar onze id's (zoals in sector.config.json) */
function mapProvincie(name) {
  const n = name.toLowerCase();
  const map = {
    // BE
    "west-vlaanderen": "wvl",
    "west flanders": "wvl",
    "oost-vlaanderen": "ovl",
    "east flanders": "ovl",
    "antwerpen": "ant",
    "antwerp": "ant",
    "vlaams-brabant": "vbr",
    "flemish brabant": "vbr",
    "limburg": "lim",
    "brussels": "bru",
    "brussel": "bru",
    "bruxelles": "bru",
    "hainaut": "hai",
    "henegouwen": "hai",
    "liège": "lui",
    "luik": "lui",
    "namur": "nam",
    "namen": "nam",
    "luxembourg": "lux",
    "brabant wallon": "bwa",
    "waals-brabant": "bwa",
    // NL
    "noord-holland": "nh",
    "zuid-holland": "zh",
    "utrecht": "ut",
    "gelderland": "gl",
    "overijssel": "ov",
    "flevoland": "fl",
    "drenthe": "dr",
    "groningen": "gr",
    "friesland": "fr",
    "fryslân": "fr",
    "noord-brabant": "nb",
    "zeeland": "ze",
  };
  return map[n] || "";
}
