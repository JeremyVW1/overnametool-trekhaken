/**
 * kvk-bulk.js
 * Nederlandse bedrijven uit KvK / BoldData met SBI-codes uit sector.config.json.
 *
 * KvK heeft GEEN gratis open bulk API. Opties:
 *   - BoldData API: betaald, ~€0.10/record (bolddata.nl)
 *   - CBS Microdata: gratis maar statistisch (geen bedrijfsnamen)
 *   - KvK Handelsregister API: betaald per call (~€0.50 per zoekopdracht)
 *
 * Standaard config: voorzie BOLDDATA_TOKEN via env var.
 *
 * Usage:
 *   export BOLDDATA_TOKEN=xxx
 *   node kvk-bulk.js --limit 1000
 *
 * Status: SKELET — vereist API-key. Stub-output zodat merge blijft draaien.
 */
import { loadConfig } from "./_lib/config.js";
import { writeJson, cachePath } from "./_lib/io.js";

async function main() {
  const cfg = loadConfig();
  const sbiCodes = cfg.scrape?.sbi_codes_nl || [];

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("KvK / BoldData Bulk Dump (NL)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log(`SBI codes: ${sbiCodes.join(", ")}`);
  console.log("");

  const token = process.env.BOLDDATA_TOKEN;
  if (!token) {
    console.log("⚠️  BOLDDATA_TOKEN env var ontbreekt.");
    console.log("");
    console.log("Alternatieven:");
    console.log("  1. BoldData account aanmaken op bolddata.nl");
    console.log("     export BOLDDATA_TOKEN=xxx && node kvk-bulk.js --limit 1000");
    console.log("  2. Handmatige export via KvK.nl downloaden (login vereist)");
    console.log("     Plaats CSV in _lib/kvk-raw/ en pas dit script aan");
    console.log("");
  }

  console.log("⚠️  IMPLEMENTATIE TODO:");
  console.log("   - BoldData API endpoint: https://api.bolddata.nl/v1/companies");
  console.log("   - Filter param: sbi_codes=4532,4520");
  console.log("   - Pagination: 100 per call, ~10 calls voor 1000 records");
  console.log("   - Map response naar bedrijf-schema (zie _lib/bedrijf.js)");
  console.log("   - Output naar cachePath('kvk')");
  console.log("");

  const out = cachePath("kvk");
  writeJson(out, []);
  console.log(`Stub-output geschreven: ${out}`);
}

main();
