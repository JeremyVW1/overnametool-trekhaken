/**
 * config.js — laadt sector.config.json en geeft typed-helpers.
 * Wordt door alle scrapers gebruikt.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, "..", "..");
const CONFIG_PATH = resolve(ROOT, "sector.config.json");

/** @typedef {Object} SectorCategorie
 *  @property {string} id
 *  @property {string} label
 *  @property {string} kleur
 */

/** @typedef {Object} SectorConfig
 *  @property {string} sector_id
 *  @property {string} sector_label
 *  @property {string[]} scope_landen
 *  @property {SectorCategorie[]} categorieen
 *  @property {{
 *    nace_codes_be: string[],
 *    sbi_codes_nl: string[],
 *    google_maps_terms: string[],
 *    max_places_per_query: number,
 *    dealer_locators: { naam: string, url: string, type: string, categorie?: string }[],
 *    extra_web_sources: { naam: string, url: string, type: string }[],
 *  }} scrape
 */

/** @returns {SectorConfig} */
export function loadConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`sector.config.json laden faalt (${CONFIG_PATH}): ${err.message}`);
  }
}

export const ROOT_DIR     = ROOT;
export const DATA_DIR     = resolve(ROOT, "data");
export const CACHE_DIR    = resolve(ROOT, "data", "_bron-cache");
export const SCRAPERS_DIR = resolve(ROOT, "scrapers");
