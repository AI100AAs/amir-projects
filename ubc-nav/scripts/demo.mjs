// Records a short walkthrough of UBC Soft-Nav and (if ffmpeg is present)
// converts it to a GIF for the README.
//
// Prereqs:
//   npm i -D playwright && npx playwright install chromium
//   ffmpeg on PATH (optional, for the .gif; otherwise you get a .webm)
//
// Usage:
//   node server.js            # in one terminal (or let this script start it)
//   node scripts/demo.mjs     # in another
//
// Output: docs/demo.webm and (with ffmpeg) docs/demo.gif
import { createRequire } from "node:module";
import { execSync, spawn } from "node:child_process";
import { mkdirSync, existsSync, renameSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DOCS = join(ROOT, "docs");
const URL = process.env.DEMO_URL || "http://localhost:3000";
const require = createRequire(import.meta.url);

// --- resolve Playwright from local or global node_modules -------------------
function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    try {
      const globalRoot = execSync("npm root -g").toString().trim();
      return require(join(globalRoot, "playwright"));
    } catch {
      console.error("Playwright not found. Install it with:\n  npm i -D playwright && npx playwright install chromium");
      process.exit(1);
    }
  }
}

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function serverUp() {
  try {
    const res = await fetch(URL + "/api/health");
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const { chromium } = loadPlaywright();
  mkdirSync(DOCS, { recursive: true });

  // Start the server ourselves if it isn't already running.
  let child = null;
  if (!(await serverUp())) {
    console.log("Starting server…");
    child = spawn("node", ["server.js"], { cwd: ROOT, stdio: "ignore" });
    for (let i = 0; i < 20 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 300));
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: DOCS, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const pause = (ms) => page.waitForTimeout(ms);

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await pause(1500);

  // 1) A calming, shaded, uncrowded walk.
  await page.fill("#constraint", "I want a calming walk in the shade, away from crowds");
  await pause(600);
  await page.click("#go");
  await page.waitForSelector("#route-summary:not(.hidden)", { timeout: 8000 });
  await pause(1800);

  // 2) Show the fastest-route comparison.
  await page.check("#show-fastest");
  await pause(1800);

  // 3) Fine-tune with a slider.
  await page.fill("#slider-scenic", "1");
  await page.dispatchEvent("#slider-scenic", "input");
  await pause(1600);

  // 4) Switch destination.
  await page.selectOption("#dest", "moa");
  await pause(1800);

  // 5) An accessibility request.
  await page.fill("#constraint", "wheelchair friendly, no stairs please");
  await page.click("#go");
  await page.waitForSelector("#route-summary:not(.hidden)");
  await pause(1800);

  // 6) Light theme.
  await page.click("#theme-toggle");
  await pause(1600);

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  if (child) child.kill();

  const webm = join(DOCS, "demo.webm");
  if (videoPath !== webm) renameSync(videoPath, webm);
  console.log("Saved", webm);

  if (hasFfmpeg()) {
    const gif = join(DOCS, "demo.gif");
    const palette = join(DOCS, "_palette.png");
    console.log("Converting to GIF with ffmpeg…");
    const fps = 12, width = 900;
    execSync(`ffmpeg -y -i "${webm}" -vf "fps=${fps},scale=${width}:-1:flags=lanczos,palettegen" "${palette}"`, { stdio: "ignore" });
    execSync(`ffmpeg -y -i "${webm}" -i "${palette}" -lavfi "fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse" "${gif}"`, { stdio: "ignore" });
    if (existsSync(palette)) execSync(`rm -f "${palette}"`);
    console.log("Saved", gif);
  } else {
    console.log("ffmpeg not found — skipping GIF. The .webm above is your recording.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
