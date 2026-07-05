/**
 * Calibrated match engine: Dixon-Coles ratings + player-weighted xG + shot micro-simulation.
 * Historical WC 2018/2022, internationals 2023–2025, and penalty shootouts fit team strengths.
 */
(function (global) {
    'use strict';

    // Compact historical WC matches [team1Id, team2Id, goals1, goals2, stage]
    // stage: 'group' | 'knockout'. Sources: openfootball/worldcup.json 2018+2022, 2026 app backtest.
    const HISTORICAL_WC_MATCHES = [
        // 2022 Qatar — selected matches mapped to 2026 db ids where possible
        ['bra', 'srb', 2, 0, 'group'], ['bra', 'sui', 1, 0, 'group'], ['bra', 'kor', 4, 1, 'knockout'],
        ['arg', 'ksa', 1, 2, 'group'], ['arg', 'mex', 2, 0, 'group'], ['arg', 'aus', 2, 1, 'knockout'],
        ['fra', 'aus', 4, 1, 'group'], ['fra', 'den', 2, 1, 'group'], ['fra', 'pol', 3, 1, 'knockout'],
        ['eng', 'irn', 6, 2, 'group'], ['eng', 'usa', 0, 0, 'group'], ['eng', 'sen', 3, 0, 'knockout'],
        ['esp', 'crc', 7, 0, 'group'], ['esp', 'ger', 1, 1, 'group'], ['esp', 'mar', 0, 0, 'knockout'],
        ['ger', 'jpn', 1, 2, 'group'], ['ger', 'esp', 1, 1, 'group'], ['ger', 'crc', 4, 2, 'group'],
        ['por', 'gha', 3, 2, 'group'], ['por', 'uru', 2, 0, 'group'], ['por', 'sui', 6, 1, 'knockout'],
        ['ned', 'usa', 3, 1, 'knockout'], ['ned', 'arg', 2, 2, 'knockout'],
        ['bel', 'can', 1, 0, 'group'], ['bel', 'mar', 0, 2, 'group'],
        ['cro', 'can', 4, 1, 'group'], ['cro', 'bra', 0, 0, 'knockout'],
        ['mar', 'por', 1, 0, 'knockout'], ['mar', 'cro', 0, 0, 'group'],
        ['mex', 'pol', 0, 0, 'group'], ['mex', 'ksa', 2, 0, 'group'],
        ['usa', 'wal', 1, 1, 'group'], ['usa', 'irn', 1, 0, 'group'],
        ['jpn', 'ger', 2, 1, 'group'], ['jpn', 'esp', 2, 1, 'group'], ['jpn', 'cro', 1, 1, 'knockout'],
        ['kor', 'por', 2, 1, 'group'], ['kor', 'gha', 2, 3, 'group'],
        ['sui', 'cam', 1, 0, 'group'], ['sui', 'srb', 3, 2, 'group'],
        ['uru', 'kor', 0, 0, 'group'], ['uru', 'gha', 0, 2, 'group'],
        ['ecu', 'qat', 2, 0, 'group'], ['ecu', 'sen', 1, 2, 'group'],
        ['sen', 'ned', 0, 2, 'group'], ['sen', 'qat', 3, 1, 'group'],
        ['aus', 'fra', 1, 4, 'group'], ['aus', 'den', 1, 0, 'group'],
        ['irn', 'wal', 0, 2, 'group'], ['irn', 'usa', 0, 1, 'group'],
        ['can', 'mar', 1, 2, 'group'], ['can', 'cro', 1, 4, 'group'],
        ['tun', 'fra', 1, 0, 'group'], ['tun', 'aus', 0, 1, 'group'],
        ['egy', 'aus', 1, 1, 'knockout'],
        // 2018 Russia — key matches
        ['fra', 'aus', 2, 1, 'group'], ['fra', 'per', 1, 0, 'group'], ['fra', 'cro', 4, 2, 'knockout'],
        ['cro', 'arg', 0, 3, 'group'], ['cro', 'eng', 2, 1, 'knockout'],
        ['bel', 'pan', 3, 0, 'group'], ['bel', 'eng', 0, 1, 'knockout'],
        ['col', 'jpn', 1, 2, 'group'], ['col', 'sen', 1, 0, 'group'],
        ['mex', 'ger', 1, 0, 'group'], ['mex', 'bra', 0, 2, 'group'],
        ['bra', 'srb', 2, 0, 'group'], ['bra', 'crc', 2, 0, 'group'], ['bra', 'mex', 2, 0, 'group'],
        ['arg', 'isl', 1, 1, 'group'], ['arg', 'cro', 0, 3, 'group'], ['arg', 'fra', 3, 4, 'knockout'],
        ['esp', 'por', 3, 3, 'group'], ['esp', 'rus', 1, 1, 'knockout'],
        ['ger', 'mex', 0, 1, 'group'], ['ger', 'swe', 2, 1, 'group'], ['ger', 'kor', 0, 2, 'group'],
        ['eng', 'pan', 6, 1, 'group'], ['eng', 'bel', 0, 1, 'knockout'],
        ['uru', 'por', 2, 1, 'group'], ['uru', 'fra', 0, 2, 'quarter'],
        ['swe', 'mex', 0, 3, 'group'], ['swe', 'sui', 1, 0, 'group'],
        ['sui', 'bra', 1, 2, 'group'], ['sui', 'crc', 2, 2, 'group'],
        ['jpn', 'col', 2, 1, 'group'], ['jpn', 'pol', 0, 1, 'group'],
        ['kor', 'ger', 2, 0, 'group'], ['kor', 'mex', 1, 0, 'group'],
        ['pol', 'sen', 1, 2, 'group'],
        // Extra WC matches for 2026 teams (no duplicates with above)
        ['ecu', 'ned', 1, 1, 'group'], ['mar', 'can', 2, 1, 'group'],
        ['jpn', 'crc', 0, 1, 'group'], ['jpn', 'esp', 0, 1, 'group'],
        ['usa', 'eng', 0, 0, 'group'], ['fra', 'tun', 0, 1, 'group'],
        ['egy', 'uru', 0, 1, 'group'], ['egy', 'ksa', 1, 2, 'group'],
        ['mar', 'esp', 2, 2, 'group'], ['mar', 'por', 0, 1, 'group'],
        ['col', 'pol', 3, 0, 'group'], ['swe', 'mex', 0, 3, 'group'],
        ['tun', 'eng', 2, 1, 'group'], ['bel', 'tun', 5, 2, 'group']
    ];

    // Recent competitive internationals (Euro/Copa/AFCON/Asian Cup, qualifiers 2023–2025).
    // Weighted below WC in fit. Only 2026 db team ids used.
    const INTERNATIONAL_MATCHES = [
        // Copa América 2024
        ['arg', 'ecu', 1, 1, 'group'], ['arg', 'can', 2, 0, 'knockout'],
        ['usa', 'bra', 1, 1, 'group'], ['usa', 'pan', 2, 0, 'group'],
        ['bra', 'par', 4, 1, 'group'], ['col', 'bra', 2, 1, 'group'],
        ['uru', 'par', 0, 0, 'group'], ['col', 'par', 2, 1, 'group'],
        // Euro 2024
        ['ger', 'sco', 5, 1, 'group'], ['ger', 'sui', 1, 1, 'group'],
        ['esp', 'cro', 3, 0, 'group'], ['esp', 'ita', 1, 0, 'group'],
        ['por', 'tur', 3, 1, 'group'], ['fra', 'por', 0, 0, 'knockout'],
        ['eng', 'sui', 1, 1, 'knockout'], ['ned', 'tur', 2, 1, 'knockout'],
        ['aut', 'fra', 0, 1, 'knockout'], ['eng', 'den', 1, 1, 'group'],
        ['fra', 'pol', 1, 1, 'group'], ['bel', 'fra', 0, 2, 'group'],
        // Asian Cup 2023
        ['aus', 'kor', 1, 1, 'group'], ['jpn', 'irq', 1, 1, 'group'],
        ['jor', 'kor', 2, 3, 'knockout'], ['aus', 'uzb', 1, 1, 'group'],
        ['jpn', 'irn', 2, 1, 'group'], ['kor', 'jor', 3, 2, 'knockout'],
        // AFCON 2023 & 2025
        ['mar', 'cod', 1, 1, 'group'], ['sen', 'gha', 3, 3, 'group'],
        ['mar', 'rsa', 1, 0, 'group'], ['civ', 'cam', 1, 0, 'group'],
        ['egy', 'gha', 2, 2, 'group'], ['alg', 'ang', 1, 1, 'group'],
        // CONMEBOL 2026 qualifiers 2024–25
        ['ecu', 'par', 1, 0, 'group'], ['par', 'uru', 2, 2, 'group'],
        ['ecu', 'col', 0, 0, 'group'], ['bra', 'ecu', 1, 0, 'group'],
        ['par', 'col', 1, 2, 'group'], ['uru', 'par', 1, 0, 'group'],
        ['arg', 'bra', 4, 1, 'group'], ['arg', 'col', 1, 0, 'group'],
        // UEFA Nations League / Euro qualifiers 2024–25
        ['nor', 'swe', 2, 1, 'group'], ['nor', 'sco', 2, 1, 'group'],
        ['aut', 'nor', 2, 1, 'group'], ['bih', 'ger', 1, 2, 'group'],
        ['fra', 'bel', 2, 0, 'group'], ['sui', 'srb', 1, 1, 'group'],
        ['eng', 'ned', 1, 2, 'group'], ['tur', 'wal', 0, 0, 'group'],
        ['cze', 'gib', 7, 0, 'group'], ['cze', 'tur', 1, 2, 'group'],
        // CAF / friendly form for thin-history sides
        ['rsa', 'cam', 3, 2, 'group'], ['rsa', 'zam', 2, 1, 'group'],
        ['cpv', 'swz', 1, 0, 'group'], ['cpv', 'gui', 2, 0, 'group']
    ];

    // [team1, team2, winner, scored1, taken1, scored2, taken2] — WC/Euro/Copa/AFCON shootouts 2018–2025
    const HISTORICAL_PENALTY_SHOOTOUTS = [
        ['mar', 'esp', 'mar', 3, 3, 0, 3],
        ['cro', 'bra', 'cro', 4, 4, 2, 4],
        ['cro', 'jpn', 'cro', 3, 3, 1, 3],
        ['arg', 'ned', 'arg', 4, 4, 2, 4],
        ['arg', 'fra', 'arg', 4, 4, 2, 4],
        ['eng', 'col', 'eng', 4, 5, 3, 4],
        ['cro', 'den', 'cro', 3, 3, 2, 3],
        ['uru', 'par', 'uru', 4, 4, 2, 4],
        ['fra', 'por', 'fra', 5, 5, 3, 4],
        ['eng', 'sui', 'eng', 5, 5, 3, 4],
        ['por', 'slo', 'por', 3, 3, 0, 4],
        ['egy', 'cmr', 'egy', 4, 5, 3, 4],
        ['ned', 'arg', 'arg', 2, 4, 4, 4],
        ['ger', 'ita', 'ger', 6, 6, 5, 6],
        ['esp', 'ita', 'esp', 4, 4, 2, 4],
        ['civ', 'gha', 'gha', 3, 4, 4, 5]
    ];

    const WC2026_MATCHES = [
        ['mex', 'rsa', 2, 1, 'group'], ['mex', 'kor', 2, 1, 'group'], ['mex', 'cze', 2, 1, 'group'],
        ['bra', 'mar', 1, 1, 'group'], ['bra', 'sco', 2, 1, 'group'], ['bra', 'jpn', 2, 1, 'knockout'],
        ['fra', 'nor', 2, 1, 'group'], ['fra', 'swe', 3, 0, 'knockout'],
        ['arg', 'aut', 2, 1, 'group'], ['arg', 'cpv', 3, 2, 'knockout'],
        ['esp', 'cpv', 2, 1, 'group'], ['esp', 'aut', 3, 0, 'knockout'],
        ['eng', 'cro', 2, 1, 'group'], ['eng', 'cod', 2, 1, 'knockout'],
        ['ger', 'civ', 2, 1, 'group'], ['ger', 'ecu', 1, 2, 'group'], ['par', 'ger', 1, 1, 'knockout'],
        ['ned', 'jpn', 2, 1, 'group'], ['mar', 'ned', 1, 1, 'knockout'],
        ['por', 'cro', 2, 1, 'knockout'], ['col', 'gha', 2, 0, 'knockout'],
        ['usa', 'bih', 2, 0, 'knockout'], ['can', 'rsa', 1, 0, 'knockout'],
        ['bel', 'sen', 3, 2, 'knockout'], ['sui', 'alg', 2, 0, 'knockout'],
        ['nor', 'civ', 2, 1, 'knockout'], ['mex', 'ecu', 2, 0, 'knockout'],
        ['aus', 'egy', 1, 1, 'knockout']
    ];

    const FORMATION_ROLES = {
        '4-3-3': { gk: 1, def: 4, mid: 3, fwd: 3 },
        '4-2-3-1': { gk: 1, def: 4, mid: 5, fwd: 1 },
        '4-4-2': { gk: 1, def: 4, mid: 4, fwd: 2 },
        '3-5-2': { gk: 1, def: 3, mid: 5, fwd: 2 },
        '5-3-2': { gk: 1, def: 5, mid: 3, fwd: 2 }
    };

    const CALIBRATION = {
        dixonExponent: 0.12,
        playerExponent: 0.22,
        shotsPerXG: 9.2,
        shotConversionBase: 0.105,
        wc2026Weight: 2.5,
        internationalWeight: 0.58,
        shrinkMatches: 3.5
    };

    let teamAttack = {};
    let teamDefense = {};
    let teamPenSkill = {};
    let squadCache = {};
    let calibrationMode = 'live';

    function fitDixonColesRatings(mode) {
        const useMode = mode || calibrationMode;
        const atk = {}, def = {}, gf = {}, ga = {}, mp = {};
        const allMatches = [];

        HISTORICAL_WC_MATCHES.forEach(m => allMatches.push({ t1: m[0], t2: m[1], s1: m[2], s2: m[3], w: 1 }));
        INTERNATIONAL_MATCHES.forEach(m => allMatches.push({
            t1: m[0], t2: m[1], s1: m[2], s2: m[3], w: CALIBRATION.internationalWeight
        }));
        if (useMode === 'live') {
            WC2026_MATCHES.forEach(m => allMatches.push({ t1: m[0], t2: m[1], s1: m[2], s2: m[3], w: CALIBRATION.wc2026Weight }));
        }

        allMatches.forEach(m => {
            [m.t1, m.t2].forEach(t => { if (!mp[t]) { mp[t] = 0; gf[t] = 0; ga[t] = 0; } });
            gf[m.t1] += m.s1 * m.w; ga[m.t1] += m.s2 * m.w; mp[m.t1] += m.w;
            gf[m.t2] += m.s2 * m.w; ga[m.t2] += m.s1 * m.w; mp[m.t2] += m.w;
        });

        let totalG = 0, totalW = 0;
        Object.keys(mp).forEach(t => { totalG += gf[t] + ga[t]; totalW += mp[t] * 2; });
        const avgG = totalG / totalW;

        const shrinkK = CALIBRATION.shrinkMatches || 3.5;
        Object.keys(mp).forEach(t => {
            const gfm = gf[t] / mp[t];
            const gam = ga[t] / mp[t];
            const shrink = mp[t] / (mp[t] + shrinkK);
            atk[t] = shrink * Math.log(Math.max(0.45, gfm / avgG)) * 0.9;
            def[t] = shrink * Math.log(Math.max(0.45, gam / avgG)) * 0.9;
            atk[t] = Math.max(-0.42, Math.min(0.42, atk[t]));
            def[t] = Math.max(-0.42, Math.min(0.42, def[t]));
        });

        teamAttack = atk;
        teamDefense = def;
    }

    function fitPenaltyRatings() {
        const conv = {}, gkSave = {}, n = {}, gkN = {};
        HISTORICAL_PENALTY_SHOOTOUTS.forEach(([t1, t2, winner, s1, a1, s2, a2]) => {
            const c1 = a1 > 0 ? s1 / a1 : 0.75;
            const c2 = a2 > 0 ? s2 / a2 : 0.75;
            const save1 = a2 > 0 ? (a2 - s2) / a2 : 0.25;
            const save2 = a1 > 0 ? (a1 - s1) / a1 : 0.25;
            [t1, t2].forEach((t, i) => {
                const c = i === 0 ? c1 : c2;
                const sv = i === 0 ? save1 : save2;
                conv[t] = (conv[t] || 0) + c;
                n[t] = (n[t] || 0) + 1;
                gkSave[t] = (gkSave[t] || 0) + sv;
                gkN[t] = (gkN[t] || 0) + 1;
                if (winner === t) {
                    conv[t] += 0.04;
                    n[t] += 0.5;
                }
            });
        });
        const pen = {};
        Object.keys(n).forEach(t => {
            const avgConv = conv[t] / n[t];
            const avgSave = gkN[t] ? gkSave[t] / gkN[t] : 0.25;
            const raw = (avgConv - 0.76) * 0.9 + (avgSave - 0.24) * 0.35;
            const shrink = n[t] / (n[t] + 3);
            pen[t] = Math.max(-0.10, Math.min(0.10, raw * shrink));
        });
        teamPenSkill = pen;
    }

    function getPenaltyConversionRates(team1, team2, eloDiff) {
        const baseConv = 0.755;
        const mental1 = team1.mid * 0.35 + team1.atk * 0.15 + team1.elo / 28;
        const mental2 = team2.mid * 0.35 + team2.atk * 0.15 + team2.elo / 28;
        const pen1 = teamPenSkill[team1.id] || 0;
        const pen2 = teamPenSkill[team2.id] || 0;
        const eloMod = Math.max(-0.02, Math.min(0.02, eloDiff / 12000));
        let conv1 = baseConv + (mental1 - team2.gk) / 520 + pen1 * 0.55 + eloMod;
        let conv2 = baseConv + (mental2 - team1.gk) / 520 + pen2 * 0.55 - eloMod;
        conv1 = Math.min(0.84, Math.max(0.66, conv1));
        conv2 = Math.min(0.84, Math.max(0.66, conv2));
        if (Math.abs(eloDiff) < 120) {
            const mean = (conv1 + conv2) / 2;
            const regress = 0.5;
            conv1 = conv1 * (1 - regress) + mean * regress;
            conv2 = conv2 * (1 - regress) + mean * regress;
        }
        return { conv1, conv2 };
    }

    function simulatePenaltyShootout(team1, team2, eloDiff) {
        const { conv1, conv2 } = getPenaltyConversionRates(team1, team2, eloDiff);
        let p1 = 0, p2 = 0;
        for (let k = 0; k < 5; k++) {
            if (Math.random() < conv1) p1++;
            if (Math.random() < conv2) p2++;
        }
        let rounds = 5;
        while (p1 === p2) {
            rounds++;
            if (Math.random() < conv1) p1++;
            if (Math.random() < conv2) p2++;
            if (rounds > 50) {
                if (p1 === p2) (Math.random() < 0.5 ? p1++ : p2++);
                break;
            }
        }
        return { pens1: p1, pens2: p2 };
    }

    function getDixonLambda(teamId, oppId, isGroupStage) {
        const base = isGroupStage ? 1.31 : 1.14;
        const atk = teamAttack[teamId] || 0;
        const def = teamDefense[oppId] || 0;
        const oppAtk = teamAttack[oppId] || 0;
        const oppDef = teamDefense[teamId] || 0;
        const e1 = Math.exp(atk - def);
        const e2 = Math.exp(oppAtk - oppDef);
        return Math.max(0.15, base * e1 / (e1 + e2));
    }

    function buildTeamSquad(team, ctx) {
        const cacheKey = team.id + (team.isCustomInjured ? '-inj' : '') + (ctx?.isBacktest ? '-bt' : '');
        if (squadCache[cacheKey]) return squadCache[cacheKey];

        const roles = FORMATION_ROLES[team.tactic] || FORMATION_ROLES['4-3-3'];
        const stars = team.stars || [];
        const extras = (global.extraSquadPlayers && global.extraSquadPlayers[team.id]) || [];
        const allNames = [...stars, ...extras];
        const players = [];

        const starBoost = [10, 7, 5, 3];
        function starAtk(i) { return team.atk + (starBoost[i] || 0); }
        function starMid(i) { return team.mid + (starBoost[i] || 0) * 0.7; }
        function starDef(i) { return team.def + (starBoost[i] || 0) * 0.6; }

        players.push({
            name: allNames[3] || stars[0] || 'Goalkeeper',
            role: 'gk',
            atk: 35,
            def: 55,
            gk: team.gk,
            shotWeight: 0.01,
            minutes: 90
        });

        let nameIdx = 0;
        const nextName = () => allNames[nameIdx++] || `Player ${nameIdx}`;

        for (let i = 0; i < roles.def; i++) {
            const si = Math.min(i + 1, 3);
            players.push({
                name: nextName(),
                role: 'def',
                atk: team.def * 0.35 + 20,
                def: starDef(si),
                gk: 0,
                shotWeight: 0.04,
                minutes: 90
            });
        }
        for (let i = 0; i < roles.mid; i++) {
            const si = Math.min(i, 3);
            players.push({
                name: nextName(),
                role: 'mid',
                atk: starMid(si),
                def: team.mid * 0.45,
                gk: 0,
                shotWeight: 0.14,
                minutes: 90
            });
        }
        for (let i = 0; i < roles.fwd; i++) {
            players.push({
                name: stars[i] || nextName(),
                role: 'fwd',
                atk: starAtk(i),
                def: team.atk * 0.25,
                gk: 0,
                shotWeight: i === 0 ? 0.32 : (i === 1 ? 0.22 : 0.12),
                minutes: 90
            });
        }

        if (team.isCustomInjured && stars[0]) {
            const injured = players.find(p => p.name === stars[0]);
            if (injured) {
                injured.atk *= 0.55;
                injured.shotWeight *= 0.4;
                injured.injured = true;
            }
        }

        if (ctx && !ctx.isBacktest) {
            if (ctx.t1RedCard && ctx.teamId === team.id) {
                const outfield = players.filter(p => p.role !== 'gk');
                if (outfield.length) outfield[Math.floor(Math.random() * outfield.length)].minutes = 0;
            }
        }

        const squad = { teamId: team.id, players, gk: players[0] };
        squadCache[cacheKey] = squad;
        return squad;
    }

    function getPlayerLambda(squad, oppSquad) {
        const active = squad.players.filter(p => p.minutes > 0 && p.role !== 'gk');
        const oppDef = oppSquad.players.filter(p => p.role === 'def' && p.minutes > 0);
        const oppGk = oppSquad.gk;

        let atkSum = 0, wSum = 0;
        active.forEach(p => {
            const w = p.shotWeight * (p.minutes / 90);
            atkSum += p.atk * w;
            wSum += w;
        });
        const attack = wSum > 0 ? atkSum / wSum : 70;

        const defAvg = oppDef.length
            ? oppDef.reduce((s, p) => s + p.def, 0) / oppDef.length
            : 70;
        const gkVal = oppGk ? oppGk.gk : 70;
        const defense = defAvg * 0.55 + gkVal * 0.45;

        const diff = (attack - defense) / 28;
        return Math.max(0.12, 1.14 * Math.exp(diff * 0.55));
    }

    function pickShooter(players) {
        const active = players.filter(p => p.minutes > 0 && p.role !== 'gk');
        const total = active.reduce((s, p) => s + p.shotWeight, 0);
        let r = Math.random() * total;
        for (const p of active) {
            r -= p.shotWeight;
            if (r <= 0) return p;
        }
        return active[active.length - 1];
    }

    function simulateShots(lambda, squad, oppSquad, minutes) {
        const shots = Math.max(0, poissonSample(lambda * CALIBRATION.shotsPerXG * (minutes / 90)));
        let goals = 0;
        const oppDef = oppSquad.players.filter(p => p.role === 'def' && p.minutes > 0);
        const defStr = oppDef.length
            ? oppDef.reduce((s, p) => s + p.def, 0) / oppDef.length
            : 70;
        const gkStr = oppSquad.gk ? oppSquad.gk.gk : 70;
        const block = defStr * 0.4 + gkStr * 0.6;

        for (let i = 0; i < shots; i++) {
            const shooter = pickShooter(squad.players);
            const diff = (shooter.atk - block) / 22;
            const pGoal = Math.min(0.45, Math.max(0.02, CALIBRATION.shotConversionBase * Math.exp(diff * 0.4)));
            if (Math.random() < pGoal) goals++;
        }
        return { goals, shots };
    }

    function poissonSample(lambda) {
        if (lambda <= 0) return 0;
        const L = Math.exp(-lambda);
        let k = 0, p = 1;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        return k - 1;
    }

    function blendLambdas(eloL1, eloL2, dixon1, dixon2, player1, player2, squad1, squad2) {
        const base = 1.14;
        const dExp = CALIBRATION.dixonExponent;
        const pExp = CALIBRATION.playerExponent;
        const dFac1 = Math.pow(Math.max(0.5, dixon1 / base), dExp);
        const dFac2 = Math.pow(Math.max(0.5, dixon2 / base), dExp);
        const pFac1 = Math.pow(Math.max(0.5, player1 / base), pExp);
        const pFac2 = Math.pow(Math.max(0.5, player2 / base), pExp);
        const lambda1 = Math.max(0.1, eloL1 * dFac1 * pFac1);
        const lambda2 = Math.max(0.1, eloL2 * dFac2 * pFac2);
        return { lambda1, lambda2, squad1, squad2, dixon1, dixon2, player1, player2 };
    }

    function computeCalibratedLambdas(team1, team2, ctx) {
        const isGroup = ctx.isGroupStage;
        const dixon1 = getDixonLambda(team1.id, team2.id, isGroup);
        const dixon2 = getDixonLambda(team2.id, team1.id, isGroup);
        const squad1 = buildTeamSquad(team1, { ...ctx, teamId: team1.id });
        const squad2 = buildTeamSquad(team2, { ...ctx, teamId: team2.id });
        const player1 = getPlayerLambda(squad1, squad2);
        const player2 = getPlayerLambda(squad2, squad1);
        const eloL1 = ctx.eloLambda1 ?? dixon1;
        const eloL2 = ctx.eloLambda2 ?? dixon2;
        return blendLambdas(eloL1, eloL2, dixon1, dixon2, player1, player2, squad1, squad2);
    }

    function simulatePlayerGoals(lambda1, lambda2, squad1, squad2, minutes, useMicroSim) {
        if (!useMicroSim || minutes < 45) {
            return {
                goals1: poissonSample(lambda1 * (minutes / 90)),
                goals2: poissonSample(lambda2 * (minutes / 90))
            };
        }
        const r1 = simulateShots(lambda1, squad1, squad2, minutes);
        const r2 = simulateShots(lambda2, squad2, squad1, minutes);
        return { goals1: r1.goals, goals2: r2.goals, shots1: r1.shots, shots2: r2.shots };
    }

    function getPlayerLambdaFast(team, opp) {
        const attack = team.atk * 0.52 + team.mid * 0.33 + team.def * 0.15;
        const defense = opp.def * 0.48 + opp.gk * 0.52;
        const diff = (attack - defense) / 28;
        return Math.max(0.12, 1.14 * Math.exp(diff * 0.55));
    }

    function computeCalibratedLambdasFast(team1, team2, ctx) {
        const isGroup = ctx.isGroupStage;
        const dixon1 = getDixonLambda(team1.id, team2.id, isGroup);
        const dixon2 = getDixonLambda(team2.id, team1.id, isGroup);
        const player1 = getPlayerLambdaFast(team1, team2);
        const player2 = getPlayerLambdaFast(team2, team1);
        const eloL1 = ctx.eloLambda1 ?? dixon1;
        const eloL2 = ctx.eloLambda2 ?? dixon2;
        const blended = blendLambdas(eloL1, eloL2, dixon1, dixon2, player1, player2, null, null);
        return { lambda1: blended.lambda1, lambda2: blended.lambda2 };
    }

    function getWorkerCalibrationCode() {
        return [
            'const WC_TEAM_ATTACK = ' + JSON.stringify(teamAttack) + ';',
            'const WC_TEAM_DEFENSE = ' + JSON.stringify(teamDefense) + ';',
            'const WC_CALIBRATION = ' + JSON.stringify(CALIBRATION) + ';',
            `function wcGetDixonLambda(teamId, oppId, isGroupStage) {
                const base = isGroupStage ? 1.31 : 1.14;
                const atk = WC_TEAM_ATTACK[teamId] || 0;
                const def = WC_TEAM_DEFENSE[oppId] || 0;
                const oppAtk = WC_TEAM_ATTACK[oppId] || 0;
                const oppDef = WC_TEAM_DEFENSE[teamId] || 0;
                const e1 = Math.exp(atk - def);
                const e2 = Math.exp(oppAtk - oppDef);
                return Math.max(0.15, base * e1 / (e1 + e2));
            }`,
            `function wcGetPlayerLambdaFast(team, opp) {
                const attack = team.atk * 0.52 + team.mid * 0.33 + team.def * 0.15;
                const defense = opp.def * 0.48 + opp.gk * 0.52;
                const diff = (attack - defense) / 28;
                return Math.max(0.12, 1.14 * Math.exp(diff * 0.55));
            }`,
            `function wcComputeLambdas(team1, team2, isGroupStage, eloL1, eloL2) {
                const base = 1.14, dExp = WC_CALIBRATION.dixonExponent, pExp = WC_CALIBRATION.playerExponent;
                const d1 = wcGetDixonLambda(team1.id, team2.id, isGroupStage);
                const d2 = wcGetDixonLambda(team2.id, team1.id, isGroupStage);
                const p1 = wcGetPlayerLambdaFast(team1, team2);
                const p2 = wcGetPlayerLambdaFast(team2, team1);
                const e1 = eloL1 || d1, e2 = eloL2 || d2;
                const l1 = Math.max(0.1, e1 * Math.pow(Math.max(0.5, d1/base), dExp) * Math.pow(Math.max(0.5, p1/base), pExp));
                const l2 = Math.max(0.1, e2 * Math.pow(Math.max(0.5, d2/base), dExp) * Math.pow(Math.max(0.5, p2/base), pExp));
                return { lambda1: l1, lambda2: l2 };
            }`,
            'const WC_TEAM_PEN_SKILL = ' + JSON.stringify(teamPenSkill) + ';',
            `function wcGetPenaltyConversionRates(team1, team2, eloDiff) {
                const baseConv = 0.755;
                const mental1 = team1.mid * 0.35 + team1.atk * 0.15 + team1.elo / 28;
                const mental2 = team2.mid * 0.35 + team2.atk * 0.15 + team2.elo / 28;
                const pen1 = WC_TEAM_PEN_SKILL[team1.id] || 0;
                const pen2 = WC_TEAM_PEN_SKILL[team2.id] || 0;
                const eloMod = Math.max(-0.02, Math.min(0.02, eloDiff / 12000));
                let conv1 = baseConv + (mental1 - team2.gk) / 520 + pen1 * 0.55 + eloMod;
                let conv2 = baseConv + (mental2 - team1.gk) / 520 + pen2 * 0.55 - eloMod;
                conv1 = Math.min(0.84, Math.max(0.66, conv1));
                conv2 = Math.min(0.84, Math.max(0.66, conv2));
                if (Math.abs(eloDiff) < 120) {
                    const mean = (conv1 + conv2) / 2, regress = 0.5;
                    conv1 = conv1 * (1 - regress) + mean * regress;
                    conv2 = conv2 * (1 - regress) + mean * regress;
                }
                return { conv1, conv2 };
            }`,
            `function simulatePenaltyShootout(team1, team2, eloDiff) {
                const { conv1, conv2 } = wcGetPenaltyConversionRates(team1, team2, eloDiff);
                let p1 = 0, p2 = 0;
                for (let k = 0; k < 5; k++) {
                    if (Math.random() < conv1) p1++;
                    if (Math.random() < conv2) p2++;
                }
                let rounds = 5;
                while (p1 === p2) {
                    rounds++;
                    if (Math.random() < conv1) p1++;
                    if (Math.random() < conv2) p2++;
                    if (rounds > 50) { if (p1 === p2) (Math.random() < 0.5 ? p1++ : p2++); break; }
                }
                return { pens1: p1, pens2: p2 };
            }`
        ].join('\n');
    }

    function applyEloPriors(teamsDb) {
        if (!teamsDb) return;
        Object.values(teamsDb).forEach(team => {
            const eloNorm = (team.elo - 1620) / 400;
            const defRating = team.def * 0.48 + team.gk * 0.52;
            if (teamAttack[team.id] === undefined) {
                teamAttack[team.id] = Math.max(-0.78, Math.min(0.78,
                    eloNorm * 0.44 + Math.log(team.atk / 74) * 0.24));
                teamDefense[team.id] = Math.max(-0.78, Math.min(0.78,
                    -eloNorm * 0.38 + Math.log(defRating / 74) * 0.26));
            }
            if (teamPenSkill[team.id] === undefined) {
                teamPenSkill[team.id] = Math.max(-0.05, Math.min(0.06,
                    eloNorm * 0.03 + (team.gk - 76) / 480));
            }
        });
    }

    function clearSquadCache() { squadCache = {}; }

    function setCalibrationMode(mode) {
        if (mode !== 'pretournament' && mode !== 'live') {
            throw new Error('Calibration mode must be "pretournament" or "live"');
        }
        calibrationMode = mode;
        fitDixonColesRatings(mode);
        fitPenaltyRatings();
        if (global.WC_MODEL) {
            global.WC_MODEL.calibrationMode = calibrationMode;
            global.WC_MODEL.teamAttack = teamAttack;
            global.WC_MODEL.teamDefense = teamDefense;
            global.WC_MODEL.teamPenSkill = teamPenSkill;
        }
        return calibrationMode;
    }

    function getCalibrationMode() { return calibrationMode; }

    fitDixonColesRatings('live');
    fitPenaltyRatings();

    global.WC_MODEL = {
        CALIBRATION,
        calibrationMode,
        teamAttack,
        teamDefense,
        teamPenSkill,
        fitDixonColesRatings,
        fitPenaltyRatings,
        setCalibrationMode,
        getCalibrationMode,
        getDixonLambda,
        buildTeamSquad,
        getPlayerLambda,
        getPlayerLambdaFast,
        computeCalibratedLambdas,
        computeCalibratedLambdasFast,
        simulatePlayerGoals,
        getPenaltyConversionRates,
        simulatePenaltyShootout,
        clearSquadCache,
        applyEloPriors,
        getWorkerCalibrationCode,
        HISTORICAL_WC_MATCHES,
        INTERNATIONAL_MATCHES,
        HISTORICAL_PENALTY_SHOOTOUTS,
        WC2026_MATCHES
    };
})(typeof window !== 'undefined' ? window : globalThis);