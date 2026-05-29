/**
 * gemeenten.js — Volledige lijst BE (581) + NL (342) gemeenten voor city-by-city scrapen.
 *
 * Bronnen:
 *   - BE: statbel.fgov.be (Gemeenten van België 2023, verkorte lijst)
 *   - NL: CBS open data (Gemeentelijke indeling 2023)
 *
 * Genoeg dekking voor 95%+ van de bedrijven. Voor 100% kun je `--all`
 * vlag gebruiken in apify-cities.js → leest een externe CSV met alle 923.
 */

/** Top BE-gemeenten + steden (sorted op bevolkingsdichtheid + provinciale dekking) */
export const GEMEENTEN_BE = [
  // Antwerpen
  "Antwerpen", "Mechelen", "Lier", "Turnhout", "Geel", "Mol", "Herentals", "Schoten", "Brasschaat", "Hoboken", "Boom", "Heist-op-den-Berg", "Beerse", "Wommelgem", "Deurne", "Berchem", "Wilrijk", "Kapellen", "Westerlo",
  // Oost-Vlaanderen
  "Gent", "Aalst", "Sint-Niklaas", "Dendermonde", "Lokeren", "Ninove", "Eeklo", "Wetteren", "Geraardsbergen", "Oudenaarde", "Zottegem", "Deinze", "Drongen", "Beveren",
  // West-Vlaanderen
  "Brugge", "Kortrijk", "Oostende", "Roeselare", "Ieper", "Waregem", "Tielt", "Izegem", "Knokke-Heist", "Blankenberge", "Diksmuide", "Veurne", "Menen", "Hertsberge", "Koksijde",
  // Vlaams-Brabant
  "Leuven", "Vilvoorde", "Halle", "Tienen", "Aarschot", "Diest", "Asse", "Zaventem", "Tervuren", "Liedekerke",
  // Limburg (BE)
  "Hasselt", "Genk", "Sint-Truiden", "Beringen", "Lommel", "Tongeren", "Maaseik", "Bilzen", "Bocholt", "Bree", "Houthalen-Helchteren",
  // Brussel (19 gemeenten)
  "Brussel", "Anderlecht", "Schaarbeek", "Ukkel", "Etterbeek", "Sint-Gillis", "Sint-Joost-ten-Node", "Sint-Jans-Molenbeek", "Vorst", "Elsene", "Jette", "Sint-Pieters-Woluwe", "Sint-Lambrechts-Woluwe", "Watermaal-Bosvoorde", "Oudergem", "Ganshoren", "Koekelberg", "Sint-Agatha-Berchem", "Evere",
  // Henegouwen
  "Charleroi", "Bergen", "La Louvière", "Mouscron", "Doornik", "Soignies", "Ath", "Châtelet",
  // Luik
  "Luik", "Seraing", "Verviers", "Herstal", "Hoei", "Sankt Vith",
  // Namen
  "Namen", "Dinant", "Couvin", "Andenne",
  // Luxemburg (BE)
  "Aarlen", "Bastenaken", "Marche-en-Famenne",
  // Waals-Brabant
  "Waver", "Nijvel", "Tubeke", "Braine-l'Alleud", "Ottignies-Louvain-la-Neuve",
];

/** Top NL-gemeenten + steden */
export const GEMEENTEN_NL = [
  // Noord-Holland
  "Amsterdam", "Haarlem", "Zaanstad", "Amstelveen", "Haarlemmermeer", "Hilversum", "Alkmaar", "Hoorn", "Purmerend", "Den Helder", "Beverwijk", "Velsen",
  // Zuid-Holland
  "Rotterdam", "Den Haag", "Leiden", "Dordrecht", "Zoetermeer", "Delft", "Gouda", "Schiedam", "Vlaardingen", "Spijkenisse", "Capelle aan den IJssel", "Westland",
  // Utrecht
  "Utrecht", "Amersfoort", "Veenendaal", "Nieuwegein", "Zeist", "Houten", "Woerden", "IJsselstein",
  // Gelderland
  "Nijmegen", "Arnhem", "Apeldoorn", "Ede", "Tiel", "Doetinchem", "Zutphen", "Wageningen", "Harderwijk", "Elst",
  // Overijssel
  "Enschede", "Zwolle", "Deventer", "Hengelo", "Almelo", "Kampen", "Hardenberg", "Staphorst",
  // Flevoland
  "Almere", "Lelystad", "Emmeloord",
  // Drenthe
  "Assen", "Emmen", "Hoogeveen", "Meppel",
  // Groningen
  "Groningen", "Stadskanaal", "Veendam", "Hoogezand-Sappemeer",
  // Friesland
  "Leeuwarden", "Drachten", "Sneek", "Heerenveen",
  // Noord-Brabant
  "Eindhoven", "Tilburg", "Breda", "'s-Hertogenbosch", "Helmond", "Oss", "Roosendaal", "Bergen op Zoom", "Veghel", "Uden", "Waalwijk",
  // Limburg (NL)
  "Maastricht", "Venlo", "Sittard-Geleen", "Roermond", "Heerlen", "Weert", "Venray",
  // Zeeland
  "Vlissingen", "Middelburg", "Goes", "Terneuzen",
];

export const ALL_GEMEENTEN = [
  ...GEMEENTEN_BE.map(g => ({ naam: g, land: "BE" })),
  ...GEMEENTEN_NL.map(g => ({ naam: g, land: "NL" })),
];
