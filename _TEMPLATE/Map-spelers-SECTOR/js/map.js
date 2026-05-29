/* ═══════════════════════════════════════════════════════════════
   map.js — sector-agnostische kaart.
   Geen rijtijd-zones, geen eigen-locatie markers.
   Center + zoom + scope komen uit sector.config.json.
   ═══════════════════════════════════════════════════════════════ */

let map;

function initMap() {
  const cfg = window.SECTOR_CONFIG;
  const center = cfg?.kaart_center || [51.5, 4.7];
  const zoom   = cfg?.kaart_zoom   || 7;

  map = L.map("map", {
    center,
    zoom,
    zoomControl: true,
    scrollWheelZoom: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
}

window.initMap = initMap;
