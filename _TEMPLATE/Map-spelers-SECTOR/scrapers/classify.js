/**
 * classify.js
 * Leest data/_master.json (merged + deduped) en wijst categorieën toe.
 * Schrijft per categorie naar data/<categorie>.json (een record kan in
 * meerdere categorie-files staan; primaire_categorie volgt prioriteit).
 *
 * Regels: zie classify() onderaan. Volledig regelgebaseerd — geen AI-call
 * per bedrijf = 0 token-kosten.
 */
import { resolve } from "node:path";
import { loadConfig, DATA_DIR } from "./_lib/config.js";
import { readJson, writeJson } from "./_lib/io.js";

function main() {
  const cfg = loadConfig();
  const masterPath = resolve(DATA_DIR, "_master.json");
  const master = readJson(masterPath, null);
  if (!Array.isArray(master)) {
    console.error(`✗ ${masterPath} ontbreekt. Run eerst: node merge-and-dedupe.js`);
    process.exit(1);
  }

  const prioOrder = cfg.categorieen.map(c => c.id);
  const byCategory = Object.fromEntries(cfg.categorieen.map(c => [c.id, []]));

  let unclassified = 0;
  for (const r of master) {
    const cats = classify(r, cfg);
    if (!cats.length) { unclassified++; continue; }
    r.categorieen = cats;
    r.primaire_categorie = prioOrder.find(p => cats.includes(p)) || cats[0];

    // Bedrijf wordt fysiek opgeslagen in zijn primaire_categorie-file.
    // App.js merged ze bij het laden, maar via dedup-key blijft het 1 record.
    if (byCategory[r.primaire_categorie]) {
      byCategory[r.primaire_categorie].push(r);
    }
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    const path = resolve(DATA_DIR, `${cat}.json`);
    writeJson(path, items);
    console.log(`  ${cat.padEnd(20, " ")} ${String(items.length).padStart(7)} records → ${cat}.json`);
  }

  console.log("");
  console.log(`Totaal:       ${master.length.toLocaleString()} bedrijven`);
  console.log(`Geclassified: ${(master.length - unclassified).toLocaleString()}`);
  console.log(`Niet:         ${unclassified.toLocaleString()}`);
  console.log("");
  console.log("✓ Klaar. Open index.html om de tool te bekijken.");
}

/**
 * Regelgebaseerde classificatie. Een record kan in meerdere categorieën zitten.
 * Aanpassen per sector: pas dit bestand aan of override via sector-specific/classify-rules.js
 */
function classify(b, cfg) {
  const cats = new Set();

  // Behoud expliciete categorieen[] uit bron (handmatige data)
  if (Array.isArray(b.categorieen) && b.categorieen.length) {
    for (const c of b.categorieen) cats.add(c);
  }

  const bron = (b.bron || []).join(" ").toLowerCase();
  const info = (b.info || "").toLowerCase();
  const naam = (b.naam || "").toLowerCase();
  const web  = (b.website || "").toLowerCase();
  const nace = b.nace || [];
  const sbi  = b.sbi  || [];

  // PLAATSER — uit dealer-locator-bron of expliciet trekhaak-montage in naam/info
  if (/dealer|partner|monteur|installateur|plaats/.test(bron)
      || /trekhaak.*monteren|monteren.*trekhaak|trekhaak.*inbouw/.test(info)
      || /trekhaak/.test(naam)) {
    cats.add("plaatser");
  }

  // VERKOPER — webshop indicator
  if (b.webshop === "Ja"
      || /shop|store|webshop|outlet/.test(naam)
      || /\.com$|\.shop$/.test(web)
      || /shop/.test(web)) {
    cats.add("verkoper");
  }

  // DISTRIBUTEUR — NACE/SBI 46.xx (groothandel) of "groothandel|importeur"
  if (nace.some(c => String(c).startsWith("46."))
      || sbi.some(c => String(c).startsWith("46"))
      || /groothandel|importeur|distribute/.test(info)) {
    cats.add("distributeur");
  }

  // GARAGE — NACE 45.20 / SBI 4520 (onderhoud/reparatie)
  if (nace.includes("45.20") || sbi.includes("4520")) {
    cats.add("garage");
  }

  // ALLE_GARAGES — alle garages die niet expliciet trekhaak-gerelateerd zijn
  if ((nace.includes("45.20") || sbi.includes("4520"))
      && !cats.has("plaatser") && !cats.has("verkoper")) {
    cats.add("alle_garages");
  }

  // Fallback: als nog leeg maar NACE 45.32 / SBI 4532 → verkoper
  if (cats.size === 0 && (nace.includes("45.32") || sbi.includes("4532"))) {
    cats.add("verkoper");
  }

  return Array.from(cats);
}

main();
