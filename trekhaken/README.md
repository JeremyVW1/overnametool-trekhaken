# Trekhaken & Garages — Overname-Marktkaart BE+NL

Sector-instance van `overname-tool/`. Volledige marktkaart van trekhaken-spelers en garages in België en Nederland.

## Doel

Bedrijf identificeren in de trekhaken/aanhangwagens-sector dat overname-waardig is. Eerste fase: **volledige markt in kaart brengen** voor BE+NL (~25.000-40.000 unieke spelers verwacht).

## Sector-context

- **Marktomvang Europa:** €1,9 mld (2022) → €2,5 mld (2030), CAGR +3,6%/jaar
- **EV-trend:** stijgende vraag naar gespecialiseerde monteurs (codering CAN-bus complexer)
- **Fragmentatie:** fabricage is geconsolideerd (Brink, GDW, ORIS, Westfalia), **montage-segment sterk gefragmenteerd** → overnamekansen
- **Multiples:** automotive diensten 3,5x-5,5x EBITDA; specialisten met franchise-formule 5x-6x

## 5 Categorieën

1. **Plaatsers** (`#FF6B35` oranje) — montage-specialisten waar trekhaken kernspecialisatie is
2. **Verkopers** (`#1E88E5` blauw) — online + fysieke retailers
3. **Distributeurs** (`#7C4DFF` paars) — importeurs + B2B-groothandel
4. **Garages** (`#9E9E9E` grijs) — universele autobedrijven die ook trekhaken plaatsen
5. **Alle garages** (`#BDBDBD` lichter grijs) — élke garage in BE+NL ongeacht trekhaak-vermelding

**Marker-prioriteit:** als een bedrijf in meerdere categorieën zit, wint de hoogste prioriteit (Plaatser > Verkoper > Distributeur > Garage > Alle garages).

## Volgende stappen

1. **Open de tool**: dubbel-klik `Map-spelers-trekhaken-sector/index.html`
2. **Run scrapers** (vanaf S3 — zie [plan](../../.claude/plans/ik-wil-dat-je-humming-plum.md)):
   ```powershell
   cd Map-spelers-trekhaken-sector\scrapers
   npm install playwright
   node sector-specific/brink-dealers.js
   node sector-specific/gdw-dealers.js
   # ... etc
   ```
3. **Apify cloud-job**: zie `scrapers/apify-cities.js` voor de 9.230-queries config
4. **Bekijk resultaten** in tool (kaart + 5 categorie-tabs)

## Status

- ✅ S1: master `overname-tool/` structuur + template + branding-systeem
- ⏳ S2: 5 categorie-tabs werkend met dummy data
- ⏳ S3-S6: scrapers schrijven en uitvoeren
- ⏳ S7: merge + classify
- ⏳ S8: financials enrichment
- ⏳ S9: Top-50 scoring
- ⏳ S10: Google Sheets sync + git init

Zie [criteria.md](./criteria.md) voor overname-criteria.
