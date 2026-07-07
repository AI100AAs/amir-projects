/**
 * World Cup 2026 Prediction Model Backtesting & Accuracy Verification
 */

const knownMatches = [
    // --- Group A ---
    { t1: 'mex', t2: 'rsa', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'mex', t2: 'kor', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'mex', t2: 'cze', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'rsa', t2: 'kor', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'rsa', t2: 'cze', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'kor', t2: 'cze', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group B ---
    { t1: 'sui', t2: 'can', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'sui', t2: 'bih', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'sui', t2: 'qat', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'can', t2: 'bih', type: 'group', score1: 1, score2: 2, actual: 2 },
    { t1: 'can', t2: 'qat', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'bih', t2: 'qat', type: 'group', score1: 1, score2: 1, actual: 0 },

    // --- Group C ---
    { t1: 'bra', t2: 'mar', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'bra', t2: 'sco', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'bra', t2: 'hai', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'mar', t2: 'sco', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'mar', t2: 'hai', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'sco', t2: 'hai', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group D ---
    { t1: 'usa', t2: 'aus', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'usa', t2: 'par', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'usa', t2: 'tur', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'aus', t2: 'par', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'aus', t2: 'tur', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'par', t2: 'tur', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group E ---
    { t1: 'ger', t2: 'civ', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'ger', t2: 'ecu', type: 'group', score1: 1, score2: 2, actual: 2 },
    { t1: 'ger', t2: 'cuw', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'civ', t2: 'ecu', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'civ', t2: 'cuw', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'ecu', t2: 'cuw', type: 'group', score1: 1, score2: 1, actual: 0 },

    // --- Group F ---
    { t1: 'ned', t2: 'jpn', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'ned', t2: 'swe', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'ned', t2: 'tun', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'jpn', t2: 'swe', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'jpn', t2: 'tun', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'swe', t2: 'tun', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group G ---
    { t1: 'bel', t2: 'egy', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'bel', t2: 'irn', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'bel', t2: 'nzl', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'egy', t2: 'irn', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'egy', t2: 'nzl', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'irn', t2: 'nzl', type: 'group', score1: 1, score2: 1, actual: 0 },

    // --- Group H ---
    { t1: 'esp', t2: 'cpv', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'esp', t2: 'uru', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'esp', t2: 'ksa', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'cpv', t2: 'uru', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'cpv', t2: 'ksa', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'uru', t2: 'ksa', type: 'group', score1: 1, score2: 1, actual: 0 },

    // --- Group I ---
    { t1: 'fra', t2: 'nor', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'fra', t2: 'sen', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'fra', t2: 'irq', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'nor', t2: 'sen', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'nor', t2: 'irq', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'sen', t2: 'irq', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group J ---
    { t1: 'arg', t2: 'aut', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'arg', t2: 'alg', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'arg', t2: 'jor', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'aut', t2: 'alg', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'aut', t2: 'jor', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'alg', t2: 'jor', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group K ---
    { t1: 'col', t2: 'por', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'col', t2: 'cod', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'col', t2: 'uzb', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'por', t2: 'cod', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'por', t2: 'uzb', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'cod', t2: 'uzb', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Group L ---
    { t1: 'eng', t2: 'cro', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'eng', t2: 'gha', type: 'group', score1: 1, score2: 1, actual: 0 },
    { t1: 'eng', t2: 'pan', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'cro', t2: 'gha', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'cro', t2: 'pan', type: 'group', score1: 2, score2: 1, actual: 1 },
    { t1: 'gha', t2: 'pan', type: 'group', score1: 2, score2: 1, actual: 1 },

    // --- Round of 32 (Knockout: actual results) ---
    // Note: for knockouts, actual result is: 1 = team1 wins (regular, ET, or pens), 2 = team2 wins
    { t1: 'can', t2: 'rsa', type: 'knockout', score1: 1, score2: 0, actual: 1 },
    { t1: 'bra', t2: 'jpn', type: 'knockout', score1: 2, score2: 1, actual: 1 },
    { t1: 'par', t2: 'ger', type: 'knockout', score1: 1, score2: 1, pens1: 4, pens2: 3, actual: 1 }, // Paraguay wins on pens
    { t1: 'mar', t2: 'ned', type: 'knockout', score1: 1, score2: 1, pens1: 3, pens2: 2, actual: 1 }, // Morocco wins on pens
    { t1: 'nor', t2: 'civ', type: 'knockout', score1: 2, score2: 1, actual: 1 },
    { t1: 'fra', t2: 'swe', type: 'knockout', score1: 3, score2: 0, actual: 1 },
    { t1: 'mex', t2: 'ecu', type: 'knockout', score1: 2, score2: 0, actual: 1 },
    { t1: 'eng', t2: 'cod', type: 'knockout', score1: 2, score2: 1, actual: 1 },
    { t1: 'bel', t2: 'sen', type: 'knockout', score1: 3, score2: 2, actual: 1 }, // Belgium wins
    { t1: 'usa', t2: 'bih', type: 'knockout', score1: 2, score2: 0, actual: 1 },
    { t1: 'esp', t2: 'aut', type: 'knockout', score1: 3, score2: 0, actual: 1 },
    { t1: 'por', t2: 'cro', type: 'knockout', score1: 2, score2: 1, actual: 1 },
    { t1: 'sui', t2: 'alg', type: 'knockout', score1: 2, score2: 0, actual: 1 },
    { t1: 'aus', t2: 'egy', type: 'knockout', score1: 1, score2: 1, pens1: 2, pens2: 4, actual: 2 }, // Egypt wins on pens
    { t1: 'arg', t2: 'cpv', type: 'knockout', score1: 3, score2: 2, actual: 1 },
    { t1: 'col', t2: 'gha', type: 'knockout', score1: 2, score2: 0, actual: 1 }
];

function reinitModelCalibration() {
    if (typeof WC_MODEL !== 'undefined') {
        WC_MODEL.applyEloPriors(window.db);
        WC_MODEL.clearSquadCache();
    }
    if (typeof window.initWorkerPool === 'function') window.initWorkerPool();
}

function withCalibrationMode(mode, fn) {
    const prev = (typeof WC_MODEL !== 'undefined') ? WC_MODEL.getCalibrationMode() : 'live';
    if (typeof WC_MODEL !== 'undefined') WC_MODEL.setCalibrationMode(mode);
    reinitModelCalibration();
    try {
        return fn();
    } finally {
        if (typeof WC_MODEL !== 'undefined') WC_MODEL.setCalibrationMode(prev);
        reinitModelCalibration();
    }
}

function summarizeMatchResults(matchResults) {
    const group = matchResults.filter(r => r.match.type === 'group');
    const knockout = matchResults.filter(r => r.match.type === 'knockout');

    function sliceMetrics(rows) {
        if (!rows.length) return { count: 0, brierScore: null, avgLogLoss: null, accuracy: null };
        const brierScore = rows.reduce((s, r) => s + r.matchBrier, 0) / rows.length;
        const avgLogLoss = rows.reduce((s, r) => s + r.matchLogLoss, 0) / rows.length;
        const accuracy = rows.filter(r => r.isCorrect).length / rows.length;
        return { count: rows.length, brierScore, avgLogLoss, accuracy };
    }

    const overallBrier = matchResults.reduce((s, r) => s + r.matchBrier, 0) / matchResults.length;
    const overallLogLoss = matchResults.reduce((s, r) => s + r.matchLogLoss, 0) / matchResults.length;
    const overallAccuracy = matchResults.filter(r => r.isCorrect).length / matchResults.length;

    return {
        overall: {
            count: matchResults.length,
            brierScore: overallBrier,
            avgLogLoss: overallLogLoss,
            accuracy: overallAccuracy
        },
        group: sliceMetrics(group),
        knockout: sliceMetrics(knockout)
    };
}

function findBiggestMisses(matchResults, limit = 8) {
    const misses = matchResults
        .filter(r => !r.isCorrect)
        .map(r => {
            const pActual = r.match.type === 'group'
                ? (r.match.actual === 1 ? r.p1 : (r.match.actual === 0 ? r.pDraw : r.p2))
                : (r.match.actual === 1 ? r.p1 / (r.p1 + r.p2 || 1) : r.p2 / (r.p1 + r.p2 || 1));
            return { ...r, confidenceGap: 1 - pActual };
        })
        .sort((a, b) => b.confidenceGap - a.confidenceGap || b.matchBrier - a.matchBrier);

    return misses.slice(0, limit);
}

function scoreMatchResult(match, team1, team2, p1, pDraw, p2) {
    let matchBrier = 0;
    let matchLogLoss = 0;
    let predictedOutcome = 0;

    if (match.type === 'group') {
        const o1 = match.actual === 1 ? 1 : 0;
        const oDraw = match.actual === 0 ? 1 : 0;
        const o2 = match.actual === 2 ? 1 : 0;

        matchBrier = Math.pow(p1 - o1, 2) + Math.pow(pDraw - oDraw, 2) + Math.pow(p2 - o2, 2);
        const pActual = match.actual === 1 ? p1 : (match.actual === 0 ? pDraw : p2);
        matchLogLoss = -Math.log(Math.max(0.001, Math.min(0.999, pActual)));

        if (p1 > pDraw && p1 > p2) predictedOutcome = 1;
        else if (p2 > p1 && p2 > pDraw) predictedOutcome = 2;
        else predictedOutcome = 0;
    } else {
        const o1 = match.actual === 1 ? 1 : 0;
        const o2 = match.actual === 2 ? 1 : 0;
        const sumP = p1 + p2;
        const p1Norm = p1 / (sumP || 1);
        const p2Norm = p2 / (sumP || 1);

        matchBrier = Math.pow(p1Norm - o1, 2) + Math.pow(p2Norm - o2, 2);
        const pActual = match.actual === 1 ? p1Norm : p2Norm;
        matchLogLoss = -Math.log(Math.max(0.001, Math.min(0.999, pActual)));
        predictedOutcome = p1Norm > p2Norm ? 1 : 2;
    }

    return {
        match,
        team1,
        team2,
        p1,
        pDraw,
        p2,
        matchBrier,
        matchLogLoss,
        isCorrect: predictedOutcome === match.actual
    };
}

function buildBacktestReport(matchResults, calibrationMode, nRuns) {
    const summary = summarizeMatchResults(matchResults);
    return {
        calibrationMode,
        nRuns,
        brierScore: summary.overall.brierScore,
        avgLogLoss: summary.overall.avgLogLoss,
        accuracy: summary.overall.accuracy,
        summary,
        biggestMisses: findBiggestMisses(matchResults),
        matchResults
    };
}

function runModelBacktest(nRuns = 1000, options = {}) {
    if (!window.db || !window.simulateMatchStats) {
        console.error("Simulation engine or database not loaded");
        return null;
    }

    const calibrationMode = options.calibrationMode || 'pretournament';
    const skipModeSwitch = options.skipModeSwitch === true;

    const runInner = () => {
        const matchResults = [];

        for (const match of knownMatches) {
            const team1 = window.db[match.t1];
            const team2 = window.db[match.t2];
            if (!team1 || !team2) {
                console.warn(`Missing team data for backtest match: ${match.t1} vs ${match.t2}`);
                continue;
            }

            let t1Wins = 0;
            let draws = 0;
            let t2Wins = 0;

            for (let i = 0; i < nRuns; i++) {
                const stats = window.simulateMatchStats(team1, team2, null, 'Fair (Pierluigi Collina)', 0, match.type === 'group', 0, 0, true);

                if (match.type === 'group') {
                    if (stats.score1 > stats.score2) t1Wins++;
                    else if (stats.score1 === stats.score2) draws++;
                    else t2Wins++;
                } else {
                    const isT1Winner = (stats.score1 > stats.score2) || (stats.pens1 !== null && stats.pens1 > stats.pens2);
                    if (isT1Winner) t1Wins++;
                    else t2Wins++;
                }
            }

            matchResults.push(scoreMatchResult(match, team1, team2, t1Wins / nRuns, draws / nRuns, t2Wins / nRuns));
        }

        return buildBacktestReport(matchResults, calibrationMode, nRuns);
    };

    if (skipModeSwitch) {
        if (typeof WC_MODEL !== 'undefined') WC_MODEL.setCalibrationMode(calibrationMode);
        reinitModelCalibration();
        return runInner();
    }

    return withCalibrationMode(calibrationMode, runInner);
}

async function runModelBacktestAsync(nRuns = 1000, progressCb, options = {}) {
    if (!window.db || !window.simulateMonteCarlo) {
        console.error("Simulation engine or database not loaded");
        return null;
    }

    const calibrationMode = options.calibrationMode || 'pretournament';
    const skipModeSwitch = options.skipModeSwitch === true;

    const runInner = async () => {
        const matchResults = [];
        let currentMatchIdx = 0;

        for (const match of knownMatches) {
            const team1 = window.db[match.t1];
            const team2 = window.db[match.t2];
            if (!team1 || !team2) {
                console.warn(`Missing team data for backtest match: ${match.t1} vs ${match.t2}`);
                continue;
            }

            const result = await window.simulateMonteCarlo(team1, team2, null, nRuns, 'Fair (Pierluigi Collina)', 0, match.type === 'group', 0, 0, true);
            const p1 = result.t1Wins / result.totalRuns;
            const pDraw = result.draws / result.totalRuns;
            const p2 = result.t2Wins / result.totalRuns;

            matchResults.push(scoreMatchResult(match, team1, team2, p1, pDraw, p2));

            currentMatchIdx++;
            if (progressCb) progressCb((currentMatchIdx / knownMatches.length) * 100);
        }

        return buildBacktestReport(matchResults, calibrationMode, nRuns);
    };

    if (skipModeSwitch) {
        if (typeof WC_MODEL !== 'undefined') WC_MODEL.setCalibrationMode(calibrationMode);
        reinitModelCalibration();
        return runInner();
    }

    const prev = (typeof WC_MODEL !== 'undefined') ? WC_MODEL.getCalibrationMode() : 'live';
    if (typeof WC_MODEL !== 'undefined') WC_MODEL.setCalibrationMode(calibrationMode);
    reinitModelCalibration();
    try {
        return await runInner();
    } finally {
        if (typeof WC_MODEL !== 'undefined') WC_MODEL.setCalibrationMode(prev);
        reinitModelCalibration();
    }
}

async function runBacktestComparison(nRuns = 1000, progressCb) {
    const honest = await runModelBacktestAsync(nRuns, progressCb, { calibrationMode: 'pretournament' });
    const leaked = await runModelBacktestAsync(nRuns, null, { calibrationMode: 'live', skipModeSwitch: true });
    return { honest, leaked };
}

window.runModelBacktest = runModelBacktest;
window.runModelBacktestAsync = runModelBacktestAsync;
window.runBacktestComparison = runBacktestComparison;
window.knownMatches = knownMatches;
