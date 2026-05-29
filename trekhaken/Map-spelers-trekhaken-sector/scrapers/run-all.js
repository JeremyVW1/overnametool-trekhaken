/**
 * run-all.js — Orchestrator: draait alle scrapers in volgorde + merge + classify.
 *
 * Sequence:
 *   1. kbo-bulk.js        (BE register)
 *   2. kvk-bulk.js        (NL register)
 *   3. run-dealers.js     (sector-specific dealer-locators)
 *   4. apify-cities.js    (genereert input — submit handmatig of met APIFY_TOKEN)
 *   5. extra-web/*.js     (overige web-scrapes)
 *   6. merge-and-dedupe.js
 *   7. classify.js
 *
 * Usage: npm run all
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { SCRAPERS_DIR } from "./_lib/config.js";

const steps = [
  ["1/7 KBO bulk dump",       "kbo-bulk.js"],
  ["2/7 KvK bulk dump",       "kvk-bulk.js"],
  ["3/7 Dealer-locators",     "run-dealers.js"],
  ["4/7 Apify city-by-city",  "apify-cities.js"],   // genereert input
  // Extra web scrapes komen in scrapers/extra-web/ — die loop je apart door
  ["5/7 Merge + dedup",       "merge-and-dedupe.js"],
  ["6/7 Classify",            "classify.js"],
];

for (const [label, script] of steps) {
  console.log("");
  console.log(`▶ ${label}`);
  console.log("─────────────────────────────────────────");
  const path = resolve(SCRAPERS_DIR, script);
  const r = spawnSync("node", [path], { stdio: "inherit", cwd: SCRAPERS_DIR });
  if (r.status !== 0) {
    console.warn(`⚠️  ${script} exited met code ${r.status} — continue`);
  }
}

console.log("");
console.log("═══════════════════════════════════════════════════════════");
console.log("Alle scrapers afgerond. Open index.html om resultaten te bekijken.");
console.log("═══════════════════════════════════════════════════════════");
