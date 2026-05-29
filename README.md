# Overname-Tool — Universele Marktkaart per Sector

**Wat is dit?** Een herbruikbaar template voor sectoranalyses bij bedrijfsovernames. Je maakt één keer een sector aan en krijgt automatisch:

- Interactieve **Leaflet-kaart** met alle spelers
- **Tabs per categorie** (Plaatsers / Verkopers / Distributeurs / Garages / etc.)
- **Filters** op land, provincie, categorie, grootte
- **Top-50 scoring** voor overnamekandidaten
- **Favorieten / Twijfel / Bewerk** met Google Sheets-sync
- **Standalone scrapers** (Apify cloud + lokaal Node) voor 0-token data-collection

## Folder-structuur

```
overname-tool/
├── README.md                    ← dit bestand
├── HOW-TO-NEW-SECTOR.md         ← handleiding nieuwe sector toevoegen
├── nieuwe-sector.ps1            ← script: dupliceer template voor nieuwe sector
│
├── _TEMPLATE/                   ← MASTER skelet (raak je NOOIT direct aan voor data)
│   └── Map-spelers-SECTOR/
│       ├── index.html           ← sector-agnostisch
│       ├── sector.config.json   ← lege template met placeholders
│       ├── favicon.svg          ← default (overschrijf per sector)
│       ├── js/
│       │   ├── sector-bootstrap.js  ← leest sector.config.json en past alles toe
│       │   └── ...              ← alle herbruikbare modules
│       ├── css/
│       │   ├── base.css         ← sector-vrij; gebruikt CSS-vars
│       │   ├── theme.css        ← CSS-vars worden runtime ingevuld
│       │   └── ...
│       ├── data/                ← leeg in template
│       └── scrapers/
│           ├── _lib/            ← herbruikbare scraper-modules
│           ├── apify-cities.js  ← generieke city-by-city scrape (leest config)
│           ├── kbo-bulk.js      ← BE register (NACE uit config)
│           ├── kvk-bulk.js      ← NL register (SBI uit config)
│           ├── merge-and-dedupe.js
│           └── classify.js      ← regelgebaseerde categorie-toewijzing
│
└── trekhaken/                   ← Sector-instance #1 (de werkende app voor trekhaken)
    ├── sector.config.json       ← ALLES wat sector-specifiek is
    ├── favicon.svg              ← trekhaak-silhouet
    ├── README.md                ← sector-context
    ├── criteria.md              ← overnamecriteria voor deze sector
    └── Map-spelers-trekhaken-sector/
        ├── (zelfde structuur als _TEMPLATE — kopie + sector data)
        └── data/                ← gevulde JSON's per categorie
```

## Nieuwe sector toevoegen

1. Run: `.\nieuwe-sector.ps1 -SectorId "parket" -SectorLabel "Parket & Vloeren"`
2. Open `parket/sector.config.json` en vul alle velden in
3. Vervang `parket/favicon.svg` met je eigen logo (SVG)
4. Run scrapers: `cd parket\Map-spelers-parket-sector\scrapers; node apify-cities.js`
5. Open `parket\Map-spelers-parket-sector\index.html` in browser

Zie [HOW-TO-NEW-SECTOR.md](./HOW-TO-NEW-SECTOR.md) voor de volledige stap-voor-stap.

## Principes

- **Single source of truth per sector:** alles wat verschilt zit in `sector.config.json`. HTML/CSS/JS-code is sector-agnostisch.
- **0 token-kosten bij scrapen:** scrapers draaien standalone (Node lokaal of Apify cloud). Claude leest enkel het eindrapport.
- **Visuele kleur-prioriteit:** wanneer een bedrijf in meerdere categorieën zit (vb. Plaatser + Verkoper + Distributeur), wint de hoogste prioriteit op de kaart.
- **Provincies BE+NL standaard ondersteund** (24 provincies + Brussel), uit te breiden per sector.
- **Google Sheets sync** als universele backend voor favorieten/notities — elke sector krijgt zijn eigen Sheet via Apps Script.

## Eerste sector: trekhaken

Zie [trekhaken/README.md](./trekhaken/README.md). Doel: complete marktkaart van trekhaken-spelers in BE+NL (verwacht 25.000-40.000 unieke records over 5 categorieën).
