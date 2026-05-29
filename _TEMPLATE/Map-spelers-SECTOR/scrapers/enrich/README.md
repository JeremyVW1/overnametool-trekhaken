# Financials Enrichment

Verrijken van bestaande bedrijven met financiële data (omzet, brutomarge, EBITDA, FTE, winst).

| Script | Bron | Land | Kost |
|--------|------|------|------|
| `companyweb-be.js` | companyweb.be (BTW → jaarrekening) | BE | Subscription (~€100/mnd) |
| `trends-top-be.js` | trendstop.knack.be | BE | Gratis basis / betaald uitbreid |
| `jaarrekening-be.js` | jaarrekening.be | BE | Gratis (ondernemingen.staatsblad) |
| `bizzy-be.js` | bizzy.be | BE | Betaald (~€50/mnd) |
| `bolddata-nl.js` | bolddata.nl | NL | €0.10/record |
| `cbs-microdata-nl.js` | CBS open data | NL | Gratis (statistisch) |

## Patroon

Elke enrichment-script:
1. Leest `data/_master.json`
2. Voor records met `land === "BE"` en `btw`: query CompanyWeb / Trends Top
3. Voor records met `land === "NL"` en `kvk`: query BoldData
4. Vult `cw_omzet`, `cw_brutomarge`, `cw_winst`, `cw_fte`, `cw_jaar` in
5. Schrijft terug naar `_master.json` (of als delta in `_bron-cache/enrich-{bron}.json`)

Voor de **Top-50** zijn alleen de bedrijven met EBITDA-data relevant (in sweet spot 150K-750K). Loop dus de top-200-300 grootste door (op basis van omzet-indicator) en stop. Niet alle 25.000 records enrichen.

## CompanyWeb access

Jeremy heeft reeds CompanyWeb-access via het hout-project. Hergebruik die credentials (zie `~/.claude/projects/.../memory/project_masterplan*.md`).
