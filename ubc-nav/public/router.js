// Weighted shortest-path over the campus graph.
//
// The cost of traversing an edge is its real distance, inflated by how poorly
// the edge matches the user's soft constraints:
//
//   penalty = wScenic*(1-scenic) + wShade*(1-shade) + wQuiet*(1-quiet)
//           + wAccessible*(1-accessible) + wAvoidBusy*busy
//   cost    = distance * (1 + detourScale * penalty)
//
// `efficiency` (0..1) shrinks detourScale: a hurried user tolerates little
// detour, a wandering user tolerates a lot. This is what makes the same
// origin/destination produce visibly different routes for different vibes.

import { NODES, buildGraph, CORRIDOR_LABEL } from "./graph.js";

const ADJ = buildGraph();

const FASTEST_PARAMS = {
  preferences: { scenic: 0, shade: 0, quiet: 0, accessible: 0, avoidBusy: 0 },
  efficiency: 1,
};

function edgeCost(edge, params) {
  const { preferences: w, efficiency } = params;
  const a = edge.attrs;
  const penalty =
    w.scenic * (1 - a.scenic) +
    w.shade * (1 - a.shade) +
    w.quiet * (1 - a.quiet) +
    w.accessible * (1 - a.accessible) +
    w.avoidBusy * a.busy;

  // Hard-ish guard: a strong accessibility need should make near-impassable
  // paths (e.g. a stair trail) very expensive, not just mildly penalized.
  let accessibilityGate = 0;
  if (w.accessible >= 0.6 && a.accessible <= 0.3) accessibilityGate = 4;

  const detourScale = 0.5 + (1 - efficiency) * 4;
  return edge.dist * (1 + detourScale * penalty + accessibilityGate);
}

// Dijkstra. Returns { path, edges, stats, steps } or null if unreachable.
export function route(startId, goalId, params) {
  if (!NODES[startId] || !NODES[goalId]) return null;
  if (startId === goalId) return { path: [startId], edges: [], stats: emptyStats(), steps: [] };

  const cost = {};
  const prev = {};
  const visited = new Set();
  for (const id of Object.keys(NODES)) cost[id] = Infinity;
  cost[startId] = 0;

  const pending = new Set(Object.keys(NODES));
  while (pending.size) {
    let u = null;
    let best = Infinity;
    for (const id of pending) {
      if (cost[id] < best) {
        best = cost[id];
        u = id;
      }
    }
    if (u === null) break;
    pending.delete(u);
    visited.add(u);
    if (u === goalId) break;

    for (const edge of ADJ[u]) {
      if (visited.has(edge.to)) continue;
      const c = cost[u] + edgeCost(edge, params);
      if (c < cost[edge.to]) {
        cost[edge.to] = c;
        prev[edge.to] = { from: u, edge };
      }
    }
  }

  if (!Number.isFinite(cost[goalId])) return null;

  const path = [];
  const edges = [];
  let cur = goalId;
  while (cur !== startId) {
    path.unshift(cur);
    const step = prev[cur];
    if (!step) return null;
    edges.unshift(step.edge);
    cur = step.from;
  }
  path.unshift(startId);

  return { path, edges, stats: summarize(edges), steps: directions(path, edges) };
}

// The pure shortest/fastest route, for comparison against a vibe route.
export function fastestRoute(startId, goalId) {
  return route(startId, goalId, FASTEST_PARAMS);
}

function emptyStats() {
  return { meters: 0, minutes: 0, scenic: 0, shade: 0, quiet: 0, accessible: 0, busy: 0 };
}

// Distance-weighted average of edge attributes, plus total length & walk time.
function summarize(edges) {
  let meters = 0;
  const acc = { scenic: 0, shade: 0, quiet: 0, accessible: 0, busy: 0 };
  for (const e of edges) {
    meters += e.dist;
    for (const k of Object.keys(acc)) acc[k] += (e.attrs[k] || 0) * e.dist;
  }
  const stats = { meters: Math.round(meters), minutes: Math.max(1, Math.round(meters / 80)) };
  for (const k of Object.keys(acc)) stats[k] = meters ? acc[k] / meters : 0;
  return stats;
}

// Compass bearing from a to b -> 8-point direction.
function compass(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  const dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return dirs[Math.round(((brng % 360) + 360) % 360 / 45) % 8];
}

// Group consecutive edges on the same corridor into human-readable steps.
function directions(path, edges) {
  const steps = [];
  let i = 0;
  while (i < edges.length) {
    const corridor = edges[i].corridor;
    const startNode = NODES[path[i]];
    let meters = edges[i].dist;
    let j = i + 1;
    while (j < edges.length && edges[j].corridor === corridor) {
      meters += edges[j].dist;
      j++;
    }
    const endNode = NODES[path[j]];
    const dir = compass(startNode, endNode);
    const label = CORRIDOR_LABEL[corridor] || "a path";
    const towards = endNode.poi || j === edges.length ? ` toward ${endNode.name}` : "";
    steps.push({
      instruction: `Head ${dir} along ${label}${towards}`,
      meters: Math.round(meters),
      corridor,
    });
    i = j;
  }
  if (steps.length) steps[steps.length - 1].instruction = steps[steps.length - 1].instruction + " — arrive.";
  return steps;
}

// Snap an arbitrary lat/lng (geolocation, map click) to the nearest graph node.
export function nearestNode(lat, lng) {
  let bestId = null;
  let bestD = Infinity;
  for (const [id, n] of Object.entries(NODES)) {
    const d = (n.lat - lat) ** 2 + (n.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      bestId = id;
    }
  }
  return bestId;
}

export { ADJ };
