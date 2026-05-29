# Scrapers

Sector-agnostische Node.js scrapers die `sector.config.json` lezen voor sector-specifieke parameters.

## Setup (1× per sector)

```powershell
cd <sector>/Map-spelers-<sector>-sector/scrapers
npm install
npx playwright install chromium
```

## Workflow

```powershell
# 1. Officiële registers (snel, gratis)
npm run kbo        # KBO open data → data/_bron-cache/kbo__YYYY-MM-DD.json
npm run kvk        # KvK / BoldData → data/_bron-cache/kvk__YYYY-MM-DD.json

# 2. Sector-specifieke dealer-locators
npm run dealers    # Roept alle scripts in sector-specific/ aan

# 3. Apify cloud-job — city-by-city Google Maps (~€30 voor 80K results)
npm run apify      # Genereert input + roept Apify API aan + download resultaat

# 4. Extra brute-force web scrapes
node extra/goudengids.js
node extra/bsearch.js
# ...etc

# 5. Merge + dedup → finale categorie-files
npm run merge      # Merge alle _bron-cache → bedrijven_master.json
npm run classify   # Wijst categorieën toe → plaatsers.json/verkopers.json/etc.

# 6. Of alles in 1 commando
npm run all
```

## Folder-structuur

```
scrapers/
├── package.json
├── README.md (dit bestand)
├── _lib/                          # Herbruikbaar
│   ├── config.js                  # sector.config.json laden
│   ├── io.js                      # JSON read/write + atomic
│   ├── bedrijf.js                 # bedrijf-schema helpers
│   ├── geocode.js                 # Nominatim (gratis, 1 req/sec)
│   ├── browser.js                 # Playwright launcher
│   └── dedupe.js                  # Multi-key dedup (BTW > KvK > domain > naam+plaats)
│
├── sector-specific/               # Hierin schrijf je sector-specifieke scrapers
│   ├── brink-dealers.js
│   ├── gdw-dealers.js
│   └── ...
│
├── kbo-bulk.js                    # GENERIEK — leest NACE-codes uit sector.config.json
├── kvk-bulk.js                    # GENERIEK — leest SBI-codes uit sector.config.json
├── apify-cities.js                # GENERIEK — leest google_maps_terms uit config
├── run-all.js                     # Orchestrator
├── run-dealers.js                 # Loop door sector-specific/
├── merge-and-dedupe.js
└── classify.js
```

## Bedrijf-schema (output)

Elke scraper produceert records met dit schema (zie `_lib/bedrijf.js` voor de factory):

```json
{
  "naam": "Carloma",
  "land": "BE",
  "provincie": "ant",
  "categorieen": ["distributeur", "plaatser"],
  "primaire_categorie": "plaatser",
  "lat": 51.2125,
  "lng": 4.5226,
  "adres": "Bisschoppenhoflaan, 2150 Wommelgem",
  "btw": "BE0123456789",
  "kvk": null,
  "website": "carloma.be",
  "nace": ["45.32", "45.20"],
  "sbi": [],
  "merken_gevoerd": ["Westfalia", "GDW"],
  "cw_omzet": null,
  "bron": ["brink_dealer", "manual"]
}
```

## Token-efficiency

Deze scrapers draaien **volledig buiten Claude Code**. Claude schrijft de scripts één keer, daarna draait Jeremy ze met `npm run all`. De ruwe output (tienduizenden records) komt nooit in Claude-context. Alleen het samenvattingsrapport van `merge-and-dedupe.js` is klein genoeg om Claude te laten lezen.
