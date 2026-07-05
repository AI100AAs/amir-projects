// Orchestration: pickers, NL interpretation, editable sliders, routing,
// comparison, directions, sharing, theming.
import { NODES, PLACES } from "./graph.js";
import { route, fastestRoute, nearestNode } from "./router.js";
import { interpretConstraint, fetchHealth } from "./api.js";
import * as MapView from "./map.js";

const $ = (id) => document.getElementById(id);
const PREF_KEYS = ["scenic", "shade", "quiet", "accessible", "avoidBusy"];
const PREF_LABELS = { scenic: "Scenic", shade: "Shade", quiet: "Quiet", accessible: "Step-free", avoidBusy: "Avoid crowds" };
const ATTR_LABELS = { scenic: "Scenic", shade: "Shade", quiet: "Quiet", accessible: "Step-free", busy: "Crowds" };
const EXAMPLES = [
  "I want a calming walk in the shade",
  "Wheelchair-friendly, no stairs please",
  "Fastest route, I'm late",
  "Show me the scenic way, no rush",
  "Avoid the crowds and busy roads",
];

const state = {
  startId: "nest",
  destId: "rose_garden",
  params: null, // last interpreted/edited params
  clickMode: "off",
  showFastest: false,
};

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const bar = (v) => `<div class="bar"><span style="width:${Math.round((v || 0) * 100)}%"></span></div>`;

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Pickers
// ---------------------------------------------------------------------------
function populateSelects() {
  for (const selId of ["start", "dest"]) {
    const sel = $(selId);
    let group = null;
    for (const p of PLACES) {
      if ((p.poi && (!group || group.label !== "Landmarks")) ) {
        group = document.createElement("optgroup");
        group.label = "Landmarks";
        sel.appendChild(group);
      } else if (!p.poi && (!group || group.label !== "Intersections")) {
        group = document.createElement("optgroup");
        group.label = "Intersections";
        sel.appendChild(group);
      }
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      group.appendChild(opt);
    }
  }
  $("start").value = state.startId;
  $("dest").value = state.destId;
}

function buildExamples() {
  const box = $("examples");
  for (const ex of EXAMPLES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = ex;
    b.onclick = () => {
      $("constraint").value = ex;
      $("constraint").focus();
    };
    box.appendChild(b);
  }
}

// ---------------------------------------------------------------------------
// Sliders (editable interpreted params)
// ---------------------------------------------------------------------------
function buildSliders() {
  const box = $("sliders");
  box.innerHTML = "";
  const rows = [...PREF_KEYS.map((k) => [k, PREF_LABELS[k]]), ["efficiency", "Hurry"]];
  for (const [key, label] of rows) {
    const row = document.createElement("div");
    row.className = "slider-row";
    row.innerHTML = `<span class="name">${label}</span>
      <input type="range" min="0" max="1" step="0.05" id="slider-${key}" aria-label="${label}" />
      <span class="val" id="val-${key}">0</span>`;
    box.appendChild(row);
  }
  for (const [key] of rows) {
    $(`slider-${key}`).addEventListener("input", onSliderInput);
  }
}

function setSliders(params) {
  for (const k of PREF_KEYS) {
    $(`slider-${k}`).value = params.preferences[k];
    $(`val-${k}`).textContent = params.preferences[k].toFixed(2);
  }
  $("slider-efficiency").value = params.efficiency;
  $("val-efficiency").textContent = params.efficiency.toFixed(2);
}

function readSliders() {
  const preferences = {};
  for (const k of PREF_KEYS) preferences[k] = parseFloat($(`slider-${k}`).value);
  return { ...state.params, preferences, efficiency: parseFloat($("slider-efficiency").value) };
}

const onSliderInput = debounce(() => {
  state.params = readSliders();
  for (const k of [...PREF_KEYS, "efficiency"]) $(`val-${k}`).textContent = parseFloat($(`slider-${k}`).value).toFixed(2);
  $("manual-note").classList.remove("hidden");
  recompute();
}, 120);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function showInterpretation(result) {
  $("mood-line").innerHTML = `Mood: <b>${escapeHtml(result.mood)}</b>`;
  $("rationale").textContent = result.rationale;
  const srcMap = {
    lmstudio: `local model${result.model ? ` · ${result.model}` : ""}`,
    claude: `Claude${result.model ? ` · ${result.model}` : ""}`,
    "rule-based": "keyword interpreter",
    offline: "offline fallback",
    default: "defaults",
  };
  $("source-badge").textContent = srcMap[result.source] || result.source;
  setSliders(result);
  $("manual-note").classList.add("hidden");
  $("interpretation").classList.remove("hidden");
}

function showWarnings(warnings) {
  const box = $("warnings");
  const list = $("warning-list");
  list.innerHTML = "";
  if (!warnings || !warnings.length) return box.classList.add("hidden");
  for (const w of warnings) {
    const li = document.createElement("li");
    li.textContent = w;
    list.appendChild(li);
  }
  box.classList.remove("hidden");
}

function showSummary(r, fastest) {
  $("route-stats").innerHTML =
    `To <b>${escapeHtml(NODES[state.destId].name)}</b> · <b>${r.stats.meters} m</b> · ~<b>${r.stats.minutes} min</b> walk`;

  // Comparison vs fastest route.
  const cmp = $("comparison");
  if (fastest && (r.stats.meters !== fastest.stats.meters)) {
    const dM = r.stats.meters - fastest.stats.meters;
    const dT = r.stats.minutes - fastest.stats.minutes;
    const gains = PREF_KEYS.filter((k) => k !== "avoidBusy")
      .filter((k) => (r.stats[k] || 0) - (fastest.stats[k] || 0) > 0.08)
      .map((k) => ATTR_LABELS[k].toLowerCase());
    if (r.stats.busy < fastest.stats.busy - 0.08) gains.push("fewer crowds");
    const gainText = gains.length ? ` for ${gains.join(", ")}` : "";
    cmp.textContent =
      dM > 0 ? `+${dM} m (${dT > 0 ? `+${dT} min` : "about the same time"})${gainText} vs the fastest route.`
             : "This is also the fastest route.";
  } else {
    cmp.textContent = "This is the fastest route.";
  }

  $("route-attrs").innerHTML = Object.keys(ATTR_LABELS)
    .map((k) => `<div class="attr-row"><span class="name">${ATTR_LABELS[k]}</span>${bar(r.stats[k])}</div>`)
    .join("");
  $("route-summary").classList.remove("hidden");
}

function showDirections(steps) {
  const ol = $("steps");
  ol.innerHTML = "";
  if (!steps || !steps.length) return $("directions").classList.add("hidden");
  for (const s of steps) {
    const li = document.createElement("li");
    li.innerHTML = `${escapeHtml(s.instruction)} <span class="dist">(${s.meters} m)</span>`;
    ol.appendChild(li);
  }
  $("directions").classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Core: recompute route from current state.params
// ---------------------------------------------------------------------------
function recompute() {
  if (!state.params) return;
  MapView.drawEndpoints(state.startId, state.destId);
  const r = route(state.startId, state.destId, state.params);
  const fastest = fastestRoute(state.startId, state.destId);

  if (!r) {
    $("route-stats").textContent = "No route found between those points.";
    $("comparison").textContent = "";
    $("route-attrs").innerHTML = "";
    $("route-summary").classList.remove("hidden");
    $("directions").classList.add("hidden");
    MapView.drawRoute(null);
    return;
  }
  MapView.drawRoute(r.path);
  MapView.drawFastest(fastest ? fastest.path : null, state.showFastest);
  MapView.fitTo(state.showFastest && fastest ? fastest.path.concat(r.path) : r.path);
  showSummary(r, fastest);
  showDirections(r.steps);
  updateHash();
}

// ---------------------------------------------------------------------------
// Main flow: interpret then route
// ---------------------------------------------------------------------------
async function runInterpretAndRoute() {
  const text = $("constraint").value.trim();
  const btn = $("go");
  btn.disabled = true;
  btn.textContent = "Thinking…";
  try {
    const result = await interpretConstraint(text);
    state.params = result;
    showInterpretation(result);
    showWarnings(result.warnings);
    recompute();
  } finally {
    btn.disabled = false;
    btn.textContent = "Find my route";
  }
}

// ---------------------------------------------------------------------------
// URL state (privacy-friendly sharing: everything lives in the link)
// ---------------------------------------------------------------------------
function updateHash() {
  const p = new URLSearchParams();
  p.set("start", state.startId);
  p.set("dest", state.destId);
  const q = $("constraint").value.trim();
  if (q) p.set("q", q);
  if (state.params) {
    p.set("w", PREF_KEYS.map((k) => state.params.preferences[k].toFixed(2)).join(",") + "," + state.params.efficiency.toFixed(2));
  }
  history.replaceState(null, "", "#" + p.toString());
}

function applyHash() {
  if (!location.hash || location.hash.length < 2) return false;
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get("start") && NODES[p.get("start")]) state.startId = p.get("start");
  if (p.get("dest") && NODES[p.get("dest")]) state.destId = p.get("dest");
  if (p.get("q")) $("constraint").value = p.get("q");
  $("start").value = state.startId;
  $("dest").value = state.destId;
  // Optional explicit weights override the interpreter on load.
  const w = p.get("w");
  if (w) {
    const nums = w.split(",").map(Number);
    if (nums.length === 6 && nums.every((n) => !Number.isNaN(n))) {
      const preferences = {};
      PREF_KEYS.forEach((k, i) => (preferences[k] = nums[i]));
      state.params = { preferences, efficiency: nums[5], mood: "from link", rationale: "Loaded from a shared link.", warnings: [], source: "default" };
      return "weights";
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ubcnav-theme", theme);
  MapView.setBasemap(theme);
}

// ---------------------------------------------------------------------------
// Health badge
// ---------------------------------------------------------------------------
async function loadHealth() {
  const h = await fetchHealth();
  const badge = $("ai-badge");
  const text = $("ai-badge-text");
  if (h.active === "lmstudio") {
    badge.className = "badge live";
    text.textContent = `Local model: ${h.model || "ready"}`;
  } else if (h.active === "claude") {
    badge.className = "badge live";
    text.textContent = `Claude: ${h.model || "ready"}`;
  } else {
    badge.className = "badge rules";
    const lm = (h.backends || []).find((b) => b.name === "lmstudio");
    text.textContent = lm ? `Rule-based (LM Studio ${lm.detail})` : "Rule-based interpreter";
  }
}

// ---------------------------------------------------------------------------
// Map click -> set start/destination
// ---------------------------------------------------------------------------
function onMapClick(lat, lng) {
  if (state.clickMode === "off") return;
  const id = nearestNode(lat, lng);
  if (state.clickMode === "start") {
    state.startId = id;
    $("start").value = id;
  } else {
    state.destId = id;
    $("dest").value = id;
  }
  MapView.drawEndpoints(state.startId, state.destId);
  toast(`${state.clickMode === "start" ? "Start" : "Destination"}: ${NODES[id].name}`);
  if (state.params) recompute();
}

function setClickMode(mode) {
  state.clickMode = mode;
  document.querySelectorAll(".seg").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
function init() {
  applyTheme(localStorage.getItem("ubcnav-theme") || "dark");

  MapView.initMap(onMapClick);
  MapView.drawNetwork();
  MapView.drawPOIs((id) => {
    state.destId = id;
    $("dest").value = id;
    MapView.drawEndpoints(state.startId, state.destId);
    if (state.params) recompute();
  });

  populateSelects();
  buildExamples();
  buildSliders();

  const loaded = applyHash();
  MapView.drawEndpoints(state.startId, state.destId);

  // Events
  $("route-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runInterpretAndRoute();
  });
  $("start").addEventListener("change", (e) => {
    state.startId = e.target.value;
    MapView.drawEndpoints(state.startId, state.destId);
    if (state.params) recompute();
  });
  $("dest").addEventListener("change", (e) => {
    state.destId = e.target.value;
    MapView.drawEndpoints(state.startId, state.destId);
    if (state.params) recompute();
  });
  document.querySelectorAll(".seg").forEach((b) => (b.onclick = () => setClickMode(b.dataset.mode)));
  $("show-fastest").addEventListener("change", (e) => {
    state.showFastest = e.target.checked;
    recompute();
  });
  $("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });
  $("geo").addEventListener("click", useMyLocation);
  $("share").addEventListener("click", async () => {
    updateHash();
    try {
      await navigator.clipboard.writeText(location.href);
      toast("Shareable link copied to clipboard");
    } catch {
      toast("Copy failed — your link is in the address bar");
    }
  });

  loadHealth();

  // If loaded from a link with constraint/weights, route immediately.
  if (loaded === "weights") {
    showInterpretation(state.params);
    showWarnings(state.params.warnings);
    recompute();
  } else if (loaded && $("constraint").value.trim()) {
    runInterpretAndRoute();
  }
}

function useMyLocation() {
  if (!navigator.geolocation) return toast("Geolocation not supported");
  toast("Locating…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const id = nearestNode(pos.coords.latitude, pos.coords.longitude);
      state.startId = id;
      $("start").value = id;
      MapView.drawEndpoints(state.startId, state.destId);
      toast(`Nearest point: ${NODES[id].name}`);
      if (state.params) recompute();
    },
    () => toast("Couldn't get your location"),
    { timeout: 8000 }
  );
}

init();
