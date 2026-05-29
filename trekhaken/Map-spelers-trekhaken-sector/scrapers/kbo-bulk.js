/**
 * kbo-bulk.js
 * Download de KBO Open Data (Belgische Kruispuntbank van Ondernemingen)
 * en filter op NACE-codes uit sector.config.json.
 *
 * Bron: https://kbopub.economie.fgov.be/kbopub/zoekwoordenform.html (HTML zoek)
 *       OF https://economie.fgov.be/nl/themas/ondernemingen/kruispuntbank-van/diensten-voor-iedereen/kruispuntbank-van/open-data
 *       (CSV-dumps, ~50MB/elk, maandelijks)
 *
 * Aanpak:
 *   1. Download de meest recente "activity.csv" + "enterprise.csv" + "address.csv"
 *   2. Filter op NACE-codes (cfg.scrape.nace_codes_be)
 *   3. Join met enterprise + address
 *   4. Output naar data/_bron-cache/kbo-{datum}.json
 *
 * Status: SKELET — exacte CSV-URL's en kolom-mapping moeten ingevuld worden
 *         na download van de open-data ZIP.
 */
import { resolve } from "node:path";
import { loadConfig } from "./_lib/config.js";
import { writeJson, cachePath } from "./_lib/io.js";
import { makeBedrijf } from "./_lib/bedrijf.js";

const KBO_OPEN_DATA_BASE = "https://kbopub.economie.fgov.be/kbo-open-data/affiliation/";

async function main() {
  const cfg = loadConfig();
  const naceCodes = cfg.scrape?.nace_codes_be || [];

  if (!naceCodes.length) {
    console.error("✗ sector.config.json scrape.nace_codes_be is leeg.");
    process.exit(1);
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("KBO Open Data Bulk Dump");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log(`NACE codes: ${naceCodes.join(", ")}`);
  console.log("");

  // STAP 1 — Handmatige download
  // Ga naar: https://economie.fgov.be/nl/themas/ondernemingen/kruispuntbank-van/diensten-voor-iedereen/kruispuntbank-van/open-data
  // Download de laatste ZIP (KBOPUB_YYYYMM_FULL.zip) → ~50MB
  // Pak uit in: ./_lib/kbo-raw/
  //
  // Verwachte bestanden:
  //   enterprise.csv   (BTW, naam, rechtsvorm, oprichting)
  //   activity.csv     (BTW × NACE-codes)
  //   address.csv      (BTW × adres)
  //
  // Dit script leest die files in en filtert op NACE.

  const rawDir = resolve(import.meta.url, "..", "_lib", "kbo-raw");
  console.log(`Verwacht KBO-raw in: ${rawDir}`);
  console.log("");
  console.log("Stappen:");
  console.log("  1. Download ZIP van fgov.be (handmatig — login mag worden gevraagd)");
  console.log("  2. Pak uit in _lib/kbo-raw/");
  console.log("  3. Run dit script opnieuw");
  console.log("");
  console.log("⚠️  IMPLEMENTATIE TODO:");
  console.log("   - csv-parse readstream voor activity.csv (filter NACE)");
  console.log("   - csv-parse readstream voor enterprise.csv (lookup BTW)");
  console.log("   - csv-parse readstream voor address.csv (lookup BTW)");
  console.log("   - Geocode adressen via _lib/geocode.js (Nominatim)");
  console.log("   - Output naar cachePath('kbo')");
  console.log("");

  // Stub: schrijf lege output zodat merge-and-dedupe blijft draaien
  const out = cachePath("kbo");
  writeJson(out, []);
  console.log(`Stub-output geschreven: ${out}`);
}

main();
