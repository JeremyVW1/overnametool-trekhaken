# Hoe een nieuwe sector toevoegen

Het systeem is opgebouwd zodat **alle sector-specifieke configuratie in één bestand zit**: `sector.config.json`. Bij een nieuwe sector:

1. Run het duplicate-script
2. Vul `sector.config.json` in
3. Vervang `favicon.svg`
4. Run scrapers
5. Open `index.html`

Geen find-and-replace in HTML/CSS, geen code-wijzigingen.

---

## Stap 1 — Maak nieuwe sector aan (1 minuut)

Vanuit `overname-tool/`:

```powershell
.\nieuwe-sector.ps1 -SectorId "parket" -SectorLabel "Parket & Vloeren"
```

Het script:
- Kopieert `_TEMPLATE/Map-spelers-SECTOR/` → `parket/Map-spelers-parket-sector/`
- Genereert een initiële `parket/sector.config.json` met de basis ingevuld
- Maakt `parket/README.md` en `parket/criteria.md` aan

## Stap 2 — Vul sector.config.json in (10-30 minuten)

Open `parket/sector.config.json`. Pas aan:

| Veld | Beschrijving | Voorbeeld |
|------|--------------|-----------|
| `sector_id` | Kebab-case ID (1 woord) | `"parket"` |
| `sector_label` | Volledig label voor UI | `"Parket & Vloeren"` |
| `tagline` | Tagline onder titel | `"Elke vloerenlegger. BE + NL."` |
| `scope_landen` | Lijst landcodes | `["BE", "NL"]` |
| `kaart_center` | Lat/lng Benelux center | `[51.5, 4.7]` |
| `kaart_zoom` | Default zoom-level | `7` |
| `categorieen` | Array van 4-6 categorieën in prioriteit-volgorde | zie hieronder |
| `provincies` | Lijst provincies per land | BE+NL default ingevuld |
| `theme` | CSS-vars (primary/accent/secondary etc.) | zie hieronder |
| `scrape.nace_codes_be` | NACE-codes voor KBO-bulk | `["16.22", "43.33"]` |
| `scrape.sbi_codes_nl` | SBI-codes voor KvK-bulk | `["1622", "4333"]` |
| `scrape.google_maps_terms` | Templates met `{gemeente}` placeholder | `["parket {gemeente}", "vloeren {gemeente}"]` |
| `scrape.dealer_locators` | URL's van fabrikant-dealer-locators | `[{"naam": "Quick-Step", "url": "..."}]` |
| `scoring.ebitda_sweet_spot` | EBITDA-range voor Top-50 | `[150000, 750000]` |
| `scoring.max_fte` | Team-grootte cap | `15` |
| `google_sheets_url` | Apps Script endpoint (na deploy) | `"https://script.google.com/..."` |

### Voorbeeld: categorieen-array

Volgorde = prioriteit op kaartmarker. Eerste = hoogste prioriteit.

```json
"categorieen": [
  { "id": "plaatser",     "label": "Plaatsers",     "kleur": "#FF6B35" },
  { "id": "verkoper",     "label": "Verkopers",     "kleur": "#1E88E5" },
  { "id": "distributeur", "label": "Distributeurs", "kleur": "#7C4DFF" },
  { "id": "garage",       "label": "Garages",       "kleur": "#9E9E9E" },
  { "id": "alle_garages", "label": "Alle garages",  "kleur": "#BDBDBD" }
]
```

Voor parket-sector zou je dit kunnen vervangen door:

```json
"categorieen": [
  { "id": "restaurateur", "label": "Restaurateurs",   "kleur": "#5D4037" },
  { "id": "plaatser",     "label": "Plaatsers",       "kleur": "#FF6B35" },
  { "id": "verkoper",     "label": "Verkopers",       "kleur": "#1E88E5" },
  { "id": "fabrikant",    "label": "Fabrikanten",     "kleur": "#7C4DFF" }
]
```

### Voorbeeld: theme

```json
"theme": {
  "primary":    "#1A237E",
  "primary_d":  "#0D1660",
  "accent":     "#FF6B35",
  "secondary":  "#37474F",
  "light":      "#ECEFF1",
  "dark":       "#102027",
  "status_fav":     "#FFC107",
  "status_twijfel": "#FB8C00",
  "status_niet":    "#E53935"
}
```

## Stap 3 — Vervang favicon.svg (5 minuten)

Maak een SVG van ~64×64 met je sector-icoon. Gebruik de kleuren uit `theme.primary` + `theme.accent` voor consistentie.

## Stap 4 — Run scrapers (autonoom, 0 tokens)

```powershell
cd parket\Map-spelers-parket-sector\scrapers
npm install                                       # 1× per sector
node apify-cities.js                              # Apify cloud-job genereren
node kbo-bulk.js                                  # BE register dump
node kvk-bulk.js                                  # NL register dump
# (sector-specifieke scrapers in scrapers/sector-specific/)
node merge-and-dedupe.js                          # alles samenvoegen
node classify.js                                  # categorieën toewijzen
```

## Stap 5 — Open de tool

Dubbel-klik `parket\Map-spelers-parket-sector\index.html`. De tool laadt `sector.config.json`, past branding toe, leest data, en toont alles.

---

## Bestaande sectoren

| Sector | Folder | Categorieën | Status |
|--------|--------|-------------|--------|
| Trekhaken | `trekhaken/` | Plaatsers / Verkopers / Distributeurs / Garages / Alle garages | In opbouw (BE+NL) |

## Tips

- **Hou `_TEMPLATE/` ALTIJD up-to-date.** Verbeteringen aan de tool die generiek zijn, terug-mergen in `_TEMPLATE/` zodat nieuwe sectoren ze meteen krijgen.
- **Per-sector git-repo:** elke `<sector>/`-folder kan een eigen GitHub-repo zijn (`JeremyVW1/overname-<sector>`). Master `overname-tool/` kan ook in eigen repo voor het template-beheer.
- **Sector-specifieke scrapers** komen in `<sector>/Map-spelers-<sector>-sector/scrapers/sector-specific/`. Bv. voor trekhaken: `brink-dealers.js`, `gdw-dealers.js`.
- **Test bij wijziging in `_TEMPLATE/`:** maak een test-sector aan en verifieer dat alles nog draait.
