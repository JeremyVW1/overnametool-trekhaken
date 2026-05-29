/**
 * run-dealers.js
 * Orchestrator: loopt door alle sector-specific/ scripts en draait ze sequentieel.
 * Per script: timeout + retry + log.
 */
import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { SCRAPERS_DIR } from "./_lib/config.js";

const SECTOR_DIR = resolve(SCRAPERS_DIR, "sector-specific");

function main() {
  if (!existsSync(SECTOR_DIR)) {
    console.log("⚠️  scrapers/sector-specific/ ontbreekt. Niets te doen.");
    process.exit(0);
  }

  const scripts = readdirSync(SECTOR_DIR)
    .filter(f => f.endsWith(".js") && !f.startsWith("_"));

  if (!scripts.length) {
    console.log("⚠️  Geen scripts in sector-specific/. Voeg per fabrikant een dealer-locator scraper toe.");
    process.exit(0);
  }

  console.log(`Gevonden scrapers: ${scripts.length}`);
  console.log("");

  const results = [];
  for (const script of scripts) {
    const path = resolve(SECTOR_DIR, script);
    console.log(`▶ ${script}`);
    const t0 = Date.now();
    const r = spawnSync("node", [path], {
      stdio: "inherit",
      cwd: SCRAPERS_DIR,
    });
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    results.push({ script, ok: r.status === 0, sec });
    console.log(`  ${r.status === 0 ? "✓" : "✗"} ${sec}s`);
    console.log("");
  }

  console.log("Samenvatting:");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"}  ${r.script.padEnd(40, " ")} ${r.sec}s`);
  }
}

main();
