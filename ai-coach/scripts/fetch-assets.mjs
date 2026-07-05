// Downloads everything the app needs to run FULLY OFFLINE:
//  - MediaPipe tasks-vision WASM runtime (copied from node_modules)
//  - The pose-landmarker model files
// Safe to run repeatedly; it skips files that already exist.
import { existsSync, mkdirSync, cpSync, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const pub = join(root, "public");

function ensure(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// 1) Copy the WASM runtime out of node_modules into /public/mediapipe/wasm
const wasmSrc = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const wasmDst = join(pub, "mediapipe/wasm");
if (existsSync(wasmSrc)) {
  ensure(dirname(wasmDst));
  cpSync(wasmSrc, wasmDst, { recursive: true });
  console.log("✓ MediaPipe wasm runtime copied to public/mediapipe/wasm");
} else {
  console.warn("! node_modules/@mediapipe/tasks-vision/wasm not found yet (run after npm install)");
}

// 2) Download pose model(s)
const models = [
  {
    name: "pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  },
  {
    name: "pose_landmarker_full.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  },
];

const modelsDir = join(pub, "models");
ensure(modelsDir);

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const file = createWriteStream(dest);
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    file.write(Buffer.from(value));
  }
  await new Promise((r) => file.end(r));
}

for (const m of models) {
  const dest = join(modelsDir, m.name);
  if (existsSync(dest)) {
    console.log(`✓ ${m.name} already present`);
    continue;
  }
  try {
    process.stdout.write(`… downloading ${m.name} `);
    await download(m.url, dest);
    console.log("done");
  } catch (e) {
    console.warn(`\n! could not download ${m.name}: ${e.message}`);
    console.warn("  You can place the .task file in public/models/ manually.");
  }
}

console.log("Asset setup complete.");
