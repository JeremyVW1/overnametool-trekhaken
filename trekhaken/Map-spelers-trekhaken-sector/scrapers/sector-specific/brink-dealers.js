/**
 * brink-dealers.js
 * Scraped de Brink dealer-finder voor BE + NL.
 * Bron: https://www.brink.eu/nl-be/dealer-finder
 *
 * Werkbare strategie:
 *   1. Brink heeft een Algolia-gebaseerde dealer-zoeker.
 *   2. POST naar https://*.algolianet.com met de juiste API key.
 *   3. Filter op land = "BE" of "NL".
 *
 * Als de XHR-API verandert: fall back naar Playwright DOM-scrape.
 */
import { launchBrowser, newPage } from "../_lib/browser.js";
import { writeJson, cachePath } from "../_lib/io.js";
import { makeBedrijf } from "../_lib/bedrijf.js";

const BRON_ID  = "brink";
const URL_NL   = "https://www.brink.eu/nl/dealer-finder";
const URL_BE   = "https://www.brink.eu/nl-be/dealer-finder";

async function scrape() {
  console.log(`▶ Brink dealer-locator scrape (BE + NL)`);
  const { browser, context } = await launchBrowser({ headless: true });
  const page = await newPage(context);

  const all = [];

  for (const [land, url] of [["BE", URL_BE], ["NL", URL_NL]]) {
    console.log(`  Landing: ${url}`);
    try {
      // Intercept de XHR call die de dealer-lijst returnt
      const responsePromise = page.waitForResponse(
        r => r.url().includes("algolianet") || r.url().includes("dealer-search") || r.url().includes("/api/dealers"),
        { timeout: 15000 }
      ).catch(() => null);

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      const xhr = await responsePromise;

      if (xhr) {
        try {
          const data = await xhr.json();
          const hits = data.hits || data.results || data.data || [];
          for (const h of hits) {
            all.push(makeBedrijf({
              naam:      h.name || h.dealerName,
              land:      land,
              adres:     [h.address, h.postalCode, h.city].filter(Boolean).join(", "),
              postcode:  h.postalCode,
              plaats:    h.city,
              lat:       h.lat || h._geoloc?.lat,
              lng:       h.lng || h._geoloc?.lng || h.longitude,
              website:   h.website || "",
              telefoon:  h.phone || "",
              email:     h.email || "",
              categorieen: ["plaatser"],
              primaire_categorie: "plaatser",
              merken_gevoerd: ["Brink"],
              bron: [BRON_ID + "_dealer"],
            }));
          }
          console.log(`  ✓ ${land}: ${hits.length} dealers via XHR`);
          continue;
        } catch (e) {
          console.log(`  ! XHR niet parseerbaar (${e.message}), fall-back naar DOM`);
        }
      }

      // ─── Fallback: DOM-scrape ───
      // (selectors moeten aangepast worden na live inspectie)
      const cards = await page.$$eval(".dealer-card, [data-dealer-id]", els =>
        els.map(el => ({
          naam:    el.querySelector("h3, .dealer-name")?.textContent?.trim() || "",
          adres:   el.querySelector(".address, .dealer-address")?.textContent?.trim() || "",
          website: el.querySelector("a[href^='http']")?.href || "",
        }))
      ).catch(() => []);

      for (const c of cards) {
        if (!c.naam) continue;
        all.push(makeBedrijf({
          ...c,
          land,
          categorieen: ["plaatser"],
          primaire_categorie: "plaatser",
          merken_gevoerd: ["Brink"],
          bron: [BRON_ID + "_dealer"],
        }));
      }
      console.log(`  ✓ ${land}: ${cards.length} dealers via DOM`);
    } catch (e) {
      console.error(`  ✗ ${land} faalde: ${e.message}`);
    }
  }

  await browser.close();

  const out = cachePath(BRON_ID);
  writeJson(out, all);
  console.log(`✓ Totaal ${all.length} Brink-dealers → ${out}`);
}

scrape().catch(e => { console.error(e); process.exit(1); });
