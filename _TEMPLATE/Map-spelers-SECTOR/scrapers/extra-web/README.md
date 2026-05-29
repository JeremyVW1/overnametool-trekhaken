# Extra web-scrapes

Aanvullende bronnen die *naast* de officiële registers (KBO/KvK) en de fabrikant dealer-locators draaien. Geeft extra dekking — vooral kleine/lokale spelers die niet in de hoofdbronnen zitten.

| Script | Bron | Type | Verwacht |
|--------|------|------|----------|
| `goudengids-be.js` | goudengids.be | Playwright per gemeente | +500 BE |
| `gouden-gids-nl.js` | gouden-gids.nl | Playwright per gemeente | +500 NL |
| `bsearch-be.js` | bsearch.be | Playwright op postcode-zone | +200 BE |
| `vinden-nl.js` | vinden.nl | Playwright per provincie | +400 NL |
| `telefoonboek-nl.js` | telefoonboek.nl | Playwright | +300 NL |
| `europages.js` | europages.nl | Fetch + parse | +100 |
| `anwb-garages.js` | anwb.nl/auto/garage-zoeker | Playwright | ~2.000 NL |
| `touring-be.js` | touring.be/garages | Playwright | ~500 BE |
| `marktplaats.js` | marktplaats.nl bedrijfsverkopers | Playwright | +200 |
| `2dehands-be.js` | 2dehands.be bedrijfsverkopers | Playwright | +150 |
| `linkedin-companies.js` | LinkedIn via Apify actor | Cloud API | +500 |

**Status:** alle 11 zijn skeletten — volg het patroon uit `sector-specific/README.md`.

Voor de eerste iteratie (S6) kun je je beperken tot:
1. `goudengids-be.js` + `gouden-gids-nl.js` (grootste dekking)
2. `anwb-garages.js` (cat 5 alle garages NL)
3. `touring-be.js` (cat 5 alle garages BE)

De rest is incrementeel.
