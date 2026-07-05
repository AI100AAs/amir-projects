// Leaflet map view: base layers, the campus network, POI markers, the chosen
// route plus an optional "fastest" comparison overlay, and click-to-set-points.

import { NODES } from "./graph.js";
import { ADJ } from "./router.js";

let map;
let layers = {};
let tileLight, tileDark;

function divIcon(kind, label) {
  return L.divIcon({
    className: `pin pin-${kind}`,
    html: `<span>${label}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function mapReady() {
  return Boolean(map);
}

export function initMap(onMapClick) {
  if (typeof L === "undefined") {
    console.warn("Leaflet failed to load — running without the map; routing still works.");
    const el = document.getElementById("map");
    if (el) {
      el.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:24px;text-align:center;color:#93a4b5;font-size:0.9rem;">The map library could not load (offline?). Routes, directions and interpretation still work in the panel.</div>';
    }
    return null;
  }
  map = L.map("map", { zoomControl: true, attributionControl: true }).setView([49.2665, -123.252], 15);

  tileDark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  });
  tileLight = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  });
  tileDark.addTo(map);

  layers = {
    network: L.layerGroup().addTo(map),
    pois: L.layerGroup().addTo(map),
    fastest: L.layerGroup().addTo(map),
    route: L.layerGroup().addTo(map),
    endpoints: L.layerGroup().addTo(map),
  };

  if (onMapClick) {
    map.on("click", (e) => onMapClick(e.latlng.lat, e.latlng.lng));
  }
  return map;
}

export function setBasemap(theme) {
  if (!map) return;
  if (theme === "light") {
    map.removeLayer(tileDark);
    tileLight.addTo(map);
  } else {
    map.removeLayer(tileLight);
    tileDark.addTo(map);
  }
}

// Faint rendering of the whole walkable network so users see the options.
export function drawNetwork() {
  if (!map) return;
  layers.network.clearLayers();
  const seen = new Set();
  for (const [from, edges] of Object.entries(ADJ)) {
    for (const e of edges) {
      const key = [from, e.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      L.polyline(
        [
          [NODES[from].lat, NODES[from].lng],
          [NODES[e.to].lat, NODES[e.to].lng],
        ],
        { color: "#64748b", weight: 2, opacity: 0.25, interactive: false }
      ).addTo(layers.network);
    }
  }
}

export function drawPOIs(onPick) {
  if (!map) return;
  layers.pois.clearLayers();
  for (const [id, n] of Object.entries(NODES)) {
    if (!n.poi) continue;
    const m = L.marker([n.lat, n.lng], { icon: divIcon("poi", "•"), title: n.name });
    m.bindPopup(`<b>${n.name}</b><br><button class="popup-btn" data-id="${id}">Route here</button>`);
    m.on("popupopen", (ev) => {
      const btn = ev.popup.getElement().querySelector(".popup-btn");
      if (btn) btn.onclick = () => { onPick(id); map.closePopup(); };
    });
    m.addTo(layers.pois);
  }
}

export function drawEndpoints(startId, destId) {
  if (!map) return;
  layers.endpoints.clearLayers();
  if (startId && NODES[startId]) {
    L.marker([NODES[startId].lat, NODES[startId].lng], { icon: divIcon("start", "A"), zIndexOffset: 1000 })
      .bindPopup(`<b>Start:</b> ${NODES[startId].name}`)
      .addTo(layers.endpoints);
  }
  if (destId && NODES[destId]) {
    L.marker([NODES[destId].lat, NODES[destId].lng], { icon: divIcon("dest", "B"), zIndexOffset: 1000 })
      .bindPopup(`<b>Destination:</b> ${NODES[destId].name}`)
      .addTo(layers.endpoints);
  }
}

function latlngs(path) {
  return path.map((id) => [NODES[id].lat, NODES[id].lng]);
}

export function drawRoute(path) {
  if (!map) return;
  layers.route.clearLayers();
  if (!path || path.length < 2) return;
  const pts = latlngs(path);
  // Glow + main line for a modern look.
  L.polyline(pts, { color: "#4fd1a5", weight: 11, opacity: 0.2, interactive: false }).addTo(layers.route);
  L.polyline(pts, { color: "#4fd1a5", weight: 6, opacity: 0.95, interactive: false }).addTo(layers.route);
}

export function drawFastest(path, show) {
  if (!map) return;
  layers.fastest.clearLayers();
  if (!show || !path || path.length < 2) return;
  L.polyline(latlngs(path), {
    color: "#9aa7b4",
    weight: 4,
    opacity: 0.8,
    dashArray: "4 8",
    interactive: false,
  }).addTo(layers.fastest);
}

export function fitTo(path) {
  if (!map) return;
  if (!path || path.length < 2) return;
  const line = L.polyline(latlngs(path));
  map.fitBounds(line.getBounds(), { padding: [60, 60], maxZoom: 17 });
}
