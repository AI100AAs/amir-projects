/**
 * Grid-search model params against honest (pre-tournament) backtest.
 * Usage: node tune-model.mjs [runsPerMatch]
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nRuns = parseInt(process.argv[2] || '150', 10);

function loadEngine() {
    const sandbox = {
        window: {}, globalThis: {},
        document: { addEventListener: () => {} },
        navigator: { hardwareConcurrency: 4 },
        console: { log: () => {}, warn: () => {}, error: () => {} },
        URL: global.URL, Blob: global.Blob,
        Worker: class { constructor() { throw new Error('no worker'); } },
        setTimeout, clearTimeout, Math, JSON, Array, Object, Promise
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    const ctx = vm.createContext(sandbox);
    for (const f of ['model-engine.js', 'script.js', 'backtest.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
    }
    return sandbox;
}

function runOnce(env, params) {
    if (params.model) Object.assign(env.window.MODEL, params.model);
    if (params.calibration) Object.assign(env.WC_MODEL.CALIBRATION, params.calibration);
    env.WC_MODEL.setCalibrationMode('pretournament');
    env.WC_MODEL.applyEloPriors(env.db);
    env.WC_MODEL.clearSquadCache();
    const r = env.runModelBacktest(nRuns, { calibrationMode: 'pretournament', skipModeSwitch: true });
    return r;
}

const env = loadEngine();
const baseline = runOnce(env, {});
console.log(`Baseline (${nRuns} runs): acc=${(baseline.accuracy * 100).toFixed(1)}% brier=${baseline.brierScore.toFixed(4)} group=${(baseline.summary.group.accuracy * 100).toFixed(1)}% ko=${(baseline.summary.knockout.accuracy * 100).toFixed(1)}%`);

const grid = [];
for (const dixonExponent of [0.12, 0.22, 0.32, 0.42]) {
    for (const playerExponent of [0.06, 0.14, 0.22]) {
        for (const xgEloBlend of [0.50, 0.60, 0.70]) {
            for (const rho of [-0.08, -0.12, -0.16]) {
                grid.push({ calibration: { dixonExponent, playerExponent }, model: { xgEloBlend, rho } });
            }
        }
    }
}

let best = { acc: baseline.accuracy, brier: baseline.brierScore, params: {}, result: baseline };
const t0 = Date.now();

for (let i = 0; i < grid.length; i++) {
    const r = runOnce(env, grid[i]);
    const score = r.accuracy * 100 - r.brierScore * 10;
    const bestScore = best.result.accuracy * 100 - best.result.brierScore * 10;
    if (score > bestScore || (score === bestScore && r.accuracy > best.result.accuracy)) {
        best = { params: grid[i], result: r };
    }
    if ((i + 1) % 20 === 0) process.stderr.write(`  ${i + 1}/${grid.length} best acc=${(best.result.accuracy * 100).toFixed(1)}%\n`);
}

console.log(`\nSearched ${grid.length} combos in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('Best params:', JSON.stringify(best.params, null, 2));
console.log(`Best: acc=${(best.result.accuracy * 100).toFixed(1)}% brier=${best.result.brierScore.toFixed(4)}`);
console.log(`  group=${(best.result.summary.group.accuracy * 100).toFixed(1)}% ko=${(best.result.summary.knockout.accuracy * 100).toFixed(1)}%`);
console.log('Misses:', best.result.biggestMisses.slice(0, 6).map(r => `${r.team1.name} vs ${r.team2.name}`).join(', '));