// A curated walking graph of central UBC Vancouver.
//
// Coordinates are approximate and laid out as a coherent grid of the campus
// "malls" (the main pedestrian/road corridors) plus well-known landmarks.
// It is a prototype map, not a survey-accurate one — accurate enough to make
// the soft-constraint routing tangible and to look right on OpenStreetMap.
//
// Every edge carries attributes in 0..1:
//   scenic     higher = nicer views / gardens / landmarks
//   shade      higher = more tree cover / shelter
//   quiet      higher = calmer, less foot/vehicle traffic
//   accessible higher = flatter, step-free, mobility-friendly
//   busy       higher = more crowded / vehicle traffic  (router AVOIDS high values)

// Corridor presets describe the "character" of each street.
const CORRIDOR = {
  // North–south malls (west -> east)
  westMall:   { scenic: 0.6, shade: 0.6, quiet: 0.9, accessible: 0.85, busy: 0.15 },
  mainMall:   { scenic: 0.9, shade: 0.85, quiet: 0.8, accessible: 0.95, busy: 0.2 }, // pedestrian green spine
  eastMall:   { scenic: 0.4, shade: 0.45, quiet: 0.45, accessible: 0.85, busy: 0.5 },
  wesbrook:   { scenic: 0.2, shade: 0.3, quiet: 0.2, accessible: 0.7, busy: 0.95 },   // vehicle road
  // East–west streets (north -> south)
  crescent:   { scenic: 0.95, shade: 0.7, quiet: 0.7, accessible: 0.6, busy: 0.3 },   // ocean/forest edge
  universityBlvd: { scenic: 0.3, shade: 0.3, quiet: 0.2, accessible: 0.85, busy: 0.9 }, // transit hub
  memorial:   { scenic: 0.65, shade: 0.5, quiet: 0.5, accessible: 0.9, busy: 0.4 },
  agronomy:   { scenic: 0.4, shade: 0.45, quiet: 0.65, accessible: 0.8, busy: 0.35 },
  thunderbird:{ scenic: 0.35, shade: 0.35, quiet: 0.7, accessible: 0.75, busy: 0.35 },
  // Special paths
  gardenPath: { scenic: 1.0, shade: 0.8, quiet: 0.85, accessible: 0.7, busy: 0.15 },
  spur:       { scenic: 0.5, shade: 0.5, quiet: 0.6, accessible: 0.85, busy: 0.3 },   // generic connector
  trail:      { scenic: 1.0, shade: 0.95, quiet: 0.95, accessible: 0.1, busy: 0.1 },  // forest trail, lots of stairs
  stairsCut:  { scenic: 0.4, shade: 0.3, quiet: 0.3, accessible: 0.15, busy: 0.8 },   // quick plaza stair shortcut
};

// Friendly labels for corridors (used in turn-by-turn directions).
const CORRIDOR_LABEL = {
  westMall: "West Mall", mainMall: "Main Mall", eastMall: "East Mall", wesbrook: "Wesbrook Mall",
  crescent: "Crescent Rd", universityBlvd: "University Blvd", memorial: "Memorial Rd",
  agronomy: "Agronomy Rd", thunderbird: "Thunderbird Blvd",
  gardenPath: "a garden path", spur: "a connecting path", trail: "the forest trail (stairs)",
  stairsCut: "a plaza stair shortcut",
};

// Grid coordinates.
const LNG = { west: -123.2548, main: -123.2528, east: -123.2508, wes: -123.2478 };
const LAT = { cres: 49.2702, univ: 49.2684, mem: 49.2668, agro: 49.2648, tbird: 49.2628 };

// Build the 4x5 grid of intersections.
const NODES = {};
const COLS = [
  ["west", LNG.west, "West Mall"],
  ["main", LNG.main, "Main Mall"],
  ["east", LNG.east, "East Mall"],
  ["wes", LNG.wes, "Wesbrook Mall"],
];
const ROWS = [
  ["cres", LAT.cres, "Crescent Rd"],
  ["univ", LAT.univ, "University Blvd"],
  ["mem", LAT.mem, "Memorial Rd"],
  ["agro", LAT.agro, "Agronomy Rd"],
  ["tbird", LAT.tbird, "Thunderbird Blvd"],
];
for (const [c, lng, cName] of COLS) {
  for (const [r, lat, rName] of ROWS) {
    NODES[`${c}_${r}`] = { name: `${cName} & ${rName}`, lat, lng, junction: true };
  }
}

// Landmarks (destinations the user can pick). Each connects to grid nodes below.
Object.assign(NODES, {
  rose_garden:  { name: "UBC Rose Garden", lat: 49.2701, lng: -123.2536, poi: true },
  moa:          { name: "Museum of Anthropology", lat: 49.2695, lng: -123.2590, poi: true },
  chan_centre:  { name: "Chan Centre", lat: 49.2697, lng: -123.2572, poi: true },
  nitobe:       { name: "Nitobe Memorial Garden", lat: 49.2685, lng: -123.2587, poi: true },
  koerner:      { name: "Koerner Library", lat: 49.2678, lng: -123.2552, poi: true },
  ikb:          { name: "Irving K. Barber Learning Centre", lat: 49.2669, lng: -123.2522, poi: true },
  fountain:     { name: "Martha Piper Plaza (Fountain)", lat: 49.2667, lng: -123.2531, poi: true },
  buchanan:     { name: "Buchanan Building", lat: 49.2686, lng: -123.2538, poi: true },
  nest:         { name: "AMS Student Nest", lat: 49.2685, lng: -123.2497, poi: true },
  aquatic:      { name: "UBC Aquatic Centre", lat: 49.2689, lng: -123.2488, poi: true },
  sauder:       { name: "Sauder School of Business", lat: 49.2688, lng: -123.2545, poi: true },
  beaty:        { name: "Beaty Biodiversity Museum", lat: 49.2638, lng: -123.2523, poi: true },
  lifesci:      { name: "Life Sciences Centre", lat: 49.2627, lng: -123.2499, poi: true },
  forestry:     { name: "Forest Sciences Centre", lat: 49.2648, lng: -123.2546, poi: true },
  warmemgym:    { name: "War Memorial Gym", lat: 49.2628, lng: -123.2545, poi: true },
  wreck_trail:  { name: "Wreck Beach Trail 6", lat: 49.2640, lng: -123.2606, poi: true },
  bookstore:    { name: "UBC Bookstore", lat: 49.2666, lng: -123.2499, poi: true },
  brock_hall:   { name: "Brock Hall", lat: 49.2675, lng: -123.2541, poi: true },
  gage:         { name: "Walter Gage Residence", lat: 49.2682, lng: -123.2509, poi: true },
  rec_centre:   { name: "Student Recreation Centre", lat: 49.2681, lng: -123.2481, poi: true },
  longhouse:    { name: "First Nations Longhouse", lat: 49.2693, lng: -123.2532, poi: true },
});

// Edges: [a, b, corridorKey]. Distance is computed from coordinates at load.
const EDGE_SPECS = [];

// Vertical edges (within each column, between adjacent rows).
const colCorridor = { west: "westMall", main: "mainMall", east: "eastMall", wes: "wesbrook" };
for (const [c] of COLS) {
  const rowKeys = ROWS.map((r) => r[0]);
  for (let i = 0; i < rowKeys.length - 1; i++) {
    EDGE_SPECS.push([`${c}_${rowKeys[i]}`, `${c}_${rowKeys[i + 1]}`, colCorridor[c]]);
  }
}
// Horizontal edges (within each row, between adjacent columns).
const rowCorridor = { cres: "crescent", univ: "universityBlvd", mem: "memorial", agro: "agronomy", tbird: "thunderbird" };
for (const [r] of ROWS) {
  const colKeys = COLS.map((c) => c[0]);
  for (let i = 0; i < colKeys.length - 1; i++) {
    EDGE_SPECS.push([`${colKeys[i]}_${r}`, `${colKeys[i + 1]}_${r}`, rowCorridor[r]]);
  }
}

// Landmark connectors.
EDGE_SPECS.push(
  ["rose_garden", "main_cres", "gardenPath"],
  ["rose_garden", "main_univ", "gardenPath"],
  ["chan_centre", "west_cres", "spur"],
  ["moa", "chan_centre", "crescent"],
  ["moa", "west_cres", "crescent"],
  ["nitobe", "west_univ", "gardenPath"],
  ["nitobe", "west_cres", "gardenPath"],
  ["koerner", "main_univ", "spur"],
  ["koerner", "main_mem", "spur"],
  ["buchanan", "main_univ", "spur"],
  ["buchanan", "west_univ", "spur"],
  ["sauder", "west_univ", "spur"],
  ["ikb", "main_mem", "spur"],
  ["ikb", "east_mem", "spur"],
  ["fountain", "main_mem", "gardenPath"],
  ["nest", "east_univ", "spur"],
  ["nest", "wes_univ", "spur"],
  ["aquatic", "wes_univ", "spur"],
  ["forestry", "west_agro", "spur"],
  ["forestry", "main_agro", "spur"],
  ["beaty", "main_agro", "spur"],
  ["beaty", "east_agro", "spur"],
  ["lifesci", "east_tbird", "spur"],
  ["lifesci", "wes_tbird", "spur"],
  ["warmemgym", "west_tbird", "spur"],
  ["warmemgym", "main_tbird", "spur"],
  ["wreck_trail", "west_agro", "trail"],
  ["wreck_trail", "moa", "trail"],
  ["bookstore", "east_mem", "spur"],
  ["bookstore", "main_mem", "spur"],
  ["brock_hall", "main_univ", "spur"],
  ["brock_hall", "main_mem", "spur"],
  ["gage", "east_univ", "spur"],
  ["rec_centre", "wes_univ", "spur"],
  ["rec_centre", "wes_mem", "spur"],
  ["longhouse", "main_cres", "gardenPath"],
  ["longhouse", "main_univ", "gardenPath"],
  // Diagonals that add genuine route choice:
  ["west_univ", "main_mem", "stairsCut"], // fast Buchanan-plaza shortcut, but stairs
  ["moa", "nitobe", "gardenPath"],        // scenic garden-to-garden link on the west edge
  ["rose_garden", "fountain", "gardenPath"],
);

// Haversine distance in metres.
function dist(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Build adjacency list with materialized attributes + distance.
function buildGraph() {
  const adj = {};
  for (const id of Object.keys(NODES)) adj[id] = [];
  for (const [a, b, corridor] of EDGE_SPECS) {
    if (!NODES[a] || !NODES[b]) {
      console.warn("Edge references missing node:", a, b);
      continue;
    }
    const attrs = CORRIDOR[corridor];
    const d = dist(NODES[a], NODES[b]);
    adj[a].push({ to: b, dist: d, attrs, corridor });
    adj[b].push({ to: a, dist: d, attrs, corridor });
  }
  return adj;
}

// Destinations the UI offers (POIs only), sorted by name.
const DESTINATIONS = Object.entries(NODES)
  .filter(([, n]) => n.poi)
  .map(([id, n]) => ({ id, name: n.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// All selectable points (POIs + junctions), for start/destination pickers.
const PLACES = Object.entries(NODES)
  .map(([id, n]) => ({ id, name: n.name, poi: Boolean(n.poi) }))
  .sort((a, b) => Number(b.poi) - Number(a.poi) || a.name.localeCompare(b.name));

export { NODES, buildGraph, DESTINATIONS, PLACES, CORRIDOR, CORRIDOR_LABEL };
