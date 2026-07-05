/**
 * Headless backtest: compare pre-tournament (honest) vs live (leaked) calibration.
 * Usage: node eval-backtest.mjs [runsPerMatch]
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nRuns = parseInt(process.argv[2] || '500', 10);

function loadEngine() {
    const sandbox = {
        window: {},
        globalThis: {},
        document: { addEventListener: () => {} },
        navigator: { hardwareConcurrency: 4 },
        console,
        URL: global.URL,
        Blob: global.Blob,
        Worker: class Worker {
            constructor() { throw new Error('Workers not available in Node eval'); }
        },
        setTimeout,
        clearTimeout,
        Math,
        JSON,
        Array,
        Object,
        Promise
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    const ctx = vm.createContext(sandbox);
    const files = ['model-engine.js', 'script.js', 'backtest.js'];
    for (const file of files) {
        const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
        vm.runInContext(code, ctx, { filename: file });
    }
    return sandbox;
}

function fmtPct(v) { return v == null ? '-' : (v * 100).toFixed(1) + '%'; }
function fmtNum(v, d = 4) { return v == null ? '-' : v.toFixed(d); }

function printReport(label, result) {
    const s = result.summary;
    console.log(`\n=== ${label} (${result.calibrationMode}, ${result.nRuns} runs/match) ===`);
    console.log(`Overall  — Brier: ${fmtNum(result.brierScore)} | Log loss: ${fmtNum(result.avgLogLoss)} | Accuracy: ${fmtPct(result.accuracy)}`);
    console.log(`Group    — Brier: ${fmtNum(s.group.brierScore)} | Accuracy: ${fmtPct(s.group.accuracy)} (${s.group.count} matches)`);
    console.log(`R32      — Brier: ${fmtNum(s.knockout.brierScore)} | Accuracy: ${fmtPct(s.knockout.accuracy)} (${s.knockout.count} matches)`);
    console.log('Top misses:');
    result.biggestMisses.slice(0, 5).forEach((r, i) => {
        const actual = r.match.actual === 0 ? 'Draw' : (r.match.actual === 1 ? r.team1.name : r.team2.name);
        console.log(`  ${i + 1}. ${r.team1.name} vs ${r.team2.name} → ${actual} (${r.match.score1}-${r.match.score2})`);
    });
}

const env = loadEngine();
const honest = env.runModelBacktest(nRuns, { calibrationMode: 'pretournament', skipModeSwitch: true });
const leaked = env.runModelBacktest(nRuns, { calibrationMode: 'live', skipModeSwitch: true });

printReport('HONEST (pre-tournament)', honest);
printReport('LEAKED (includes 2026 results)', leaked);

console.log('\n=== Delta (leaked − honest) ===');
console.log(`Brier:    ${(leaked.brierScore - honest.brierScore >= 0 ? '+' : '')}${(leaked.brierScore - honest.brierScore).toFixed(4)} (negative = honest is better)`);
console.log(`Accuracy: ${fmtPct(leaked.accuracy - honest.accuracy)} absolute`);