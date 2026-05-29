/**
 * apify-cities.js
 * Genereert de Apify input JSON voor city-by-city Google Maps scrape.
 * Output: apify-input.json (zelf upload in Apify console of via API).
 *
 * Usage:
 *   node apify-cities.js              # genereert apify-input.json
 *   node apify-cities.js --submit     # submit naar Apify API (APIFY_TOKEN env var nodig)
 *
 * Apify actor: compass/crawler-google-places (pay-per-result ~€0.40/1000 places)
 * Geschatte kost: ~9.230 queries × 20 results = 184.600 results × €0.40/1000 = ~€74 voor de
 * volledige BE+NL trekhaak+garage scrape. Of trekhaak-only: ~5.500 queries × 20 = 110K = ~€44.
 */
import { resolve } from "node:path";
import { loadConfig, SCRAPERS_DIR } from "./_lib/config.js";
import { writeJson } from "./_lib/io.js";
import { GEMEENTEN_BE, GEMEENTEN_NL } from "./_lib/gemeenten.js";

function buildQueries(cfg) {
  const terms = cfg.scrape?.google_maps_terms || [];
  if (!terms.length) {
    console.error("⚠️  sector.config.json scrape.google_maps_terms is leeg.");
    process.exit(1);
  }

  // Welke gemeenten? Alleen in scope_landen
  const gemeenten = [];
  if (cfg.scope_landen.includes("BE")) gemeenten.push(...GEMEENTEN_BE.map(g => ({ naam: g, land: "BE" })));
  if (cfg.scope_landen.includes("NL")) gemeenten.push(...GEMEENTEN_NL.map(g => ({ naam: g, land: "NL" })));

  const queries = [];
  for (const g of gemeenten) {
    for (const term of terms) {
      const q = term
        .replace(/{gemeente}/g, g.naam)
        .replace(/{sector_label}/g, cfg.sector_label || cfg.sector_id)
        .replace(/{sector_id}/g, cfg.sector_id);
      queries.push(q);
    }
  }
  return queries;
}

function buildApifyInput(cfg, queries) {
  return {
    searchStringsArray: queries,
    maxCrawledPlacesPerSearch: cfg.scrape?.max_places_per_query || 20,
    language: "nl",
    countryCode: cfg.scope_landen.map(l => l.toLowerCase()),
    includeWebResults: false,
    scrapeContacts: true,
    scrapeReviewsPersonalData: false,
    skipClosedPlaces: true,
    placeMinimumStars: "",
  };
}

async function submit(input) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error("✗ APIFY_TOKEN env var ontbreekt. Maak een token op apify.com → Settings → Integrations.");
    process.exit(1);
  }
  const actorId = "compass~crawler-google-places";
  const url = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    console.error("✗ Apify submit faalde:", res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  console.log("✓ Apify run gestart:", data.data?.id || data.id);
  console.log(`  Status volgen: https://console.apify.com/actors/runs/${data.data?.id}`);
}

function main() {
  const cfg = loadConfig();
  const queries = buildQueries(cfg);
  const input = buildApifyInput(cfg, queries);

  const path = resolve(SCRAPERS_DIR, "apify-input.json");
  writeJson(path, input);

  const maxResults = queries.length * (cfg.scrape?.max_places_per_query || 20);
  const estCostEur = (maxResults / 1000 * 0.4).toFixed(2);

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Apify input gegenereerd — ${queries.length.toLocaleString()} queries`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log(`Gemeenten:    ${(cfg.scope_landen.includes("BE") ? GEMEENTEN_BE.length : 0) + (cfg.scope_landen.includes("NL") ? GEMEENTEN_NL.length : 0)} (${cfg.scope_landen.join(", ")})`);
  console.log(`Zoektermen:   ${cfg.scrape.google_maps_terms.length} per gemeente`);
  console.log(`Max per Q:    ${cfg.scrape?.max_places_per_query || 20} places`);
  console.log(`Max totaal:   ${maxResults.toLocaleString()} results (vóór dedup)`);
  console.log(`Geschatte $:  ~€${estCostEur} (Apify pay-per-result €0.40/1000)`);
  console.log("");
  console.log(`Input opgeslagen: ${path}`);
  console.log("");

  if (process.argv.includes("--submit")) {
    submit(input);
  } else {
    console.log("Volgende stappen:");
    console.log("  Optie A — manueel:    Upload apify-input.json in https://console.apify.com");
    console.log("                        Actor: compass/crawler-google-places");
    console.log("                        Download resultaat als JSON in data/_bron-cache/apify-google-maps.json");
    console.log("  Optie B — API:        export APIFY_TOKEN=xxx && node apify-cities.js --submit");
    console.log("");
  }
}

main();
