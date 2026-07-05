// Dependency-free smoke tests for the interpreter + router.
// Run with: npm test   (or: node tests/smoke.mjs)
import assert from "node:assert/strict";
import { ruleBased, extractJson, normalize } from "../lib/interpret.js";
import { route, fastestRoute, nearestNode } from "../public/router.js";
import { NODES, PLACES } from "../public/graph.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("interpret:");
test("rule-based detects calming/shade/crowds", () => {
  const r = ruleBased("a calming walk in the shade, avoid crowds");
  assert.ok(r.preferences.quiet >= 0.6);
  assert.ok(r.preferences.shade >= 0.6);
  assert.ok(r.preferences.avoidBusy >= 0.5);
  assert.ok(r.warnings.length >= 1, "quiet route should add a safety warning");
});
test("rule-based detects hurry", () => {
  assert.ok(ruleBased("fastest route, I'm late").efficiency >= 0.9);
});
test("rule-based detects accessibility", () => {
  assert.ok(ruleBased("wheelchair, no stairs").preferences.accessible >= 0.6);
});
test("extractJson handles fenced + trailing commas", () => {
  const obj = extractJson('```json\n{"efficiency":0.3, "preferences":{"quiet":0.8,}}\n```');
  assert.equal(obj.efficiency, 0.3);
  assert.equal(obj.preferences.quiet, 0.8);
});
test("normalize clamps and fills schema", () => {
  const n = normalize({ preferences: { scenic: 5, quiet: -2 }, efficiency: 9 }, { source: "test" });
  assert.equal(n.preferences.scenic, 1);
  assert.equal(n.preferences.quiet, 0);
  assert.equal(n.efficiency, 1);
  assert.equal(n.preferences.shade, 0);
});

console.log("graph:");
test("graph has landmarks", () => {
  assert.ok(PLACES.filter((p) => p.poi).length >= 15);
  assert.ok(NODES.nest && NODES.rose_garden);
});

console.log("router:");
test("scenic route differs from fastest", () => {
  const scenic = route("nest", "lifesci", ruleBased("scenic calm walk no rush"));
  const fast = fastestRoute("nest", "lifesci");
  assert.ok(scenic.stats.scenic > fast.stats.scenic, "scenic route should be more scenic");
  assert.ok(scenic.stats.meters >= fast.stats.meters, "scenic route is a detour");
});
test("accessible route avoids the stairs shortcut", () => {
  const acc = route("sauder", "ikb", ruleBased("wheelchair no stairs"));
  const fast = fastestRoute("sauder", "ikb");
  assert.ok(fast.edges.some((e) => e.corridor === "stairsCut"), "fastest uses stairs shortcut");
  assert.ok(!acc.edges.some((e) => e.corridor === "stairsCut"), "accessible route avoids it");
});
test("directions are generated", () => {
  const r = route("nest", "moa", ruleBased("scenic"));
  assert.ok(r.steps.length >= 1);
  assert.ok(/arrive/.test(r.steps.at(-1).instruction));
});
test("nearestNode snaps to a real node", () => {
  assert.ok(NODES[nearestNode(49.2668, -123.2528)]);
});
test("unreachable returns null gracefully", () => {
  assert.equal(route("nest", "does_not_exist", ruleBased("x")), null);
});

console.log(`\n${process.exitCode ? "FAILED" : `All ${passed} tests passed`}`);
