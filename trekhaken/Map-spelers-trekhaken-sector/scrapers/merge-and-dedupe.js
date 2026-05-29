/**
 * merge-and-dedupe.js
 * Leest ALLE bestanden in data/_bron-cache/ → merge → dedup → schrijf data/_master.json
 * Output: kort rapport (max 500 woorden) dat Claude WEL mag lezen.
 *
 * Usage:
 *   node merge-and-dedupe.js          # volledig merge+write
 *   node merge-and-dedupe.js --dry    # alleen rapport (geen write)
 */
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { CACHE_DIR, DATA_DIR } from "./_lib/config.js";
import { readJson, writeJson } from "./_lib/io.js";
import { dedupe } from "./_lib/dedupe.js";

const args = new Set(process.argv.slice(2));
const DRY  = args.has("--dry") || args.has("--report-only");

function loadAllCache() {
  if (!isDir(CACHE_DIR)) {
    console.error(`[merge] cache-dir ontbreekt: ${CACHE_DIR}`);
    return { sources: [], records: [] };
  }
  const files = readdirSync(CACHE_DIR)
    .filter(f => f.endsWith(".json") && !f.startsWith("_"))
    .map(f => resolve(CACHE_DIR, f));

  const sources = [];
  const records = [];
  for (const f of files) {
    const data = readJson(f, null);
    if (!Array.isArray(data)) continue;
    sources.push({ file: f.replace(CACHE_DIR + "\\", "").replace(CACHE_DIR + "/", ""), n: data.length });
    for (const r of data) records.push(r);
  }
  return { sources, records };
}

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function main() {
  const { sources, records } = loadAllCache();

  if (!records.length) {
    console.log("⚠️  Geen records in cache. Run eerst scrapers (kbo-bulk, kvk-bulk, dealer-locators, apify).");
    process.exit(0);
  }

  const before = records.length;
  const deduped = dedupe(records);
  const after = deduped.length;
  const dropped = before - after;

  // Tellen per land + per bron
  const perLand = {};
  const perBron = {};
  for (const r of deduped) {
    perLand[r.land || "?"] = (perLand[r.land || "?"] || 0) + 1;
    for (const b of (r.bron || ["?"])) perBron[b] = (perBron[b] || 0) + 1;
  }

  // Records met financials
  const withFin = deduped.filter(r => r.cw_omzet != null || r.bizzy_ebitda != null).length;
  const withWeb = deduped.filter(r => r.website).length;
  const withGeo = deduped.filter(r => typeof r.lat === "number" && typeof r.lng === "number").length;

  // Rapport
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Scrape-rapport ${new Date().toISOString().slice(0, 10)}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Bron-bestanden in cache:");
  for (const s of sources) console.log(`  • ${s.file.padEnd(50, " ")} ${String(s.n).padStart(7)} records`);
  console.log("");
  console.log(`Totaal ruw:           ${before.toLocaleString()} records`);
  console.log(`Na dedup:             ${after.toLocaleString()} records (${dropped.toLocaleString()} duplicaten weggewerkt)`);
  console.log("");
  console.log("Per land:");
  for (const [l, n] of Object.entries(perLand).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${l.padEnd(4, " ")} ${String(n).padStart(7)}`);
  }
  console.log("");
  console.log("Per bron (top 10):");
  const topBron = Object.entries(perBron).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [b, n] of topBron) console.log(`  ${b.padEnd(30, " ")} ${String(n).padStart(7)}`);
  console.log("");
  console.log("Kwaliteits-indicatoren:");
  console.log(`  Met financials:     ${withFin.toLocaleString()} (${pct(withFin, after)}%)`);
  console.log(`  Met website:        ${withWeb.toLocaleString()} (${pct(withWeb, after)}%)`);
  console.log(`  Met geo-coords:     ${withGeo.toLocaleString()} (${pct(withGeo, after)}%)`);
  console.log("");

  if (!DRY) {
    const masterPath = resolve(DATA_DIR, "_master.json");
    writeJson(masterPath, deduped);
    console.log(`✓ Geschreven naar ${masterPath}`);
    console.log(`  Volgende stap: node classify.js`);
  } else {
    console.log("(dry-run — geen master.json geschreven)");
  }
}

function pct(a, total) {
  if (!total) return "0";
  return ((a / total) * 100).toFixed(1);
}

main();
