# Sector-specifieke scrapers

Hier komen scrapers die *enkel relevant zijn voor deze sector*. Voor trekhaken:

| Script | Bron | Verwacht volume |
|--------|------|-----------------|
| `brink-dealers.js` | brink.eu/nl-be dealer-finder | ~250 BE+NL |
| `gdw-dealers.js` | gdwtowbars.com find-a-dealer | ~180 |
| `westfalia-partners.js` | westfalia-automotive.com partners | ~150 |
| `oris-acps-dealers.js` | acps-automotive.com | ~100 |
| `bosal-dealers.js` | bosal.com towbars dealers | ~120 |
| `trekhaakcentrum-vestigingen.js` | trekhaakcentrum.nl/vestiging | ~100 NL |
| `trekhaken-nu-partners.js` | trekhaken.nu installateurs | ~80 |
| `burghof-partners.js` | burghoftrekhaken.nl/montagepartners | ~66 |

## Patroon

Elk script volgt dezelfde structuur:

```js
import { launchBrowser, newPage } from "../_lib/browser.js";
import { writeJson, cachePath } from "../_lib/io.js";
import { makeBedrijf } from "../_lib/bedrijf.js";
import { geocode } from "../_lib/geocode.js";

const BRON_ID = "brink";          // unieke id voor cache-file
const URL    = "https://...";

async function scrape() {
  const { browser, context } = await launchBrowser({ headless: true });
  const page = await newPage(context);
  await page.goto(URL, { waitUntil: "networkidle" });

  // 1. Try om de XHR-call van de dealer-locator te vinden
  //    (in DevTools Network → filter XHR → klik op "zoeken")
  //    Voorbeeld: const xhrResp = await page.waitForResponse(r => r.url().includes("/dealer-search"));
  //    const data = await xhrResp.json();

  // 2. Of: scrape HTML-results
  //    const results = await page.$$eval(".dealer-card", cards => cards.map(c => ({
  //      naam:    c.querySelector("h3")?.textContent?.trim(),
  //      adres:   c.querySelector(".address")?.textContent?.trim(),
  //      website: c.querySelector("a[href*='http']")?.href,
  //    })));

  const records = [];
  // ... vul records met makeBedrijf({...}) per dealer

  // Geocode + enrich
  for (const r of records) {
    if (!r.lat && r.adres) {
      const g = await geocode(r.adres);
      if (g) Object.assign(r, g);
    }
    r.categorieen = ["plaatser"];   // pas aan per bron
    r.primaire_categorie = "plaatser";
    r.bron = [BRON_ID + "_dealer"];
  }

  writeJson(cachePath(BRON_ID), records);
  console.log(`✓ ${records.length} dealers gescraped naar cache`);

  await browser.close();
}

scrape().catch(e => { console.error(e); process.exit(1); });
```

## Tips

1. **DevTools eerst:** open de dealer-locator manueel in Chrome → DevTools → Network → filter XHR/Fetch → klik "zoek dealer". Vaak is er een JSON endpoint dat direct alle dealers returnt — dan hoef je niets te scrapen, gewoon de fetch nadoen.

2. **Rate-limit:** vermijd >1 request/seconde op dezelfde host. Gebruik `await page.waitForTimeout(1000)` tussen pagina's.

3. **User-Agent:** gebruik een echte UA (zie `_lib/browser.js`).

4. **Geocode pas in 2e fase:** scraping + geocoding parallel is langzamer dan eerst alles scrapen, dan in bulk geocoden (cache hits!).

5. **Selectors testen:** `await page.locator(".dealer-card").count()` in een REPL is sneller dan trial-and-error.
