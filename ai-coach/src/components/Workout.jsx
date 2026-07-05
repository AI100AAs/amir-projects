import React, { useEffect, useRef, useState } from "react";
import { createPose, detect, drawPose, disposePose } from "../lib/pose.js";
import { EXERCISE_BY_ID, resolveExercise } from "../lib/exercises.js";
import { ExerciseTracker } from "../lib/formEngine.js";
import { setFeedback, analyzeForm, localSetFeedback } from "../lib/coach.js";
import { pickLiveCue } from "../lib/liveCues.js";
import { LiveCoach } from "../lib/liveCoach.js";
import {
  speak, stopSpeaking, praise, sayNumber, setVoiceEnabled, setVoiceConfig,
  startListening, speechSupported,
} from "../lib/voice.js";
import { SessionRecorder, recordingSupported, downloadBlob } from "../lib/recorder.js";
import { secureContextError, getCameraStream, cameraErrorText } from "../lib/media.js";
import CoachChat from "./CoachChat.jsx";
import ExerciseDemo from "./ExerciseDemo.jsx";
import { ExerciseGlyph } from "./Figure.jsx";

const REST_WARN_AT = 4;

export default function Workout({ day, profile, settings, connected, onComplete, onExit }) {
  const exercises = day.exercises;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recordCanvasRef = useRef(null);
  const snapRef = useRef(null);

  const trackerRef = useRef(null);
  const sessRef = useRef({
    exIndex: 0, setIndex: 0, phase: "init",
    clock: 0, phaseStart: 0, lastCount: null,
    completing: false, lastHudAt: 0, restTotal: 0, lastDetectTs: 0,
    session: { startedAt: 0, sets: [] },
  });
  const rafRef = useRef(0);
  const frameRef = useRef(() => {});
  const lastTickRef = useRef(0);
  const pausedRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // recording
  const recordingRef = useRef(false);
  const recorderRef = useRef(null);
  // continuous rule-based coaching throttle
  const coachRef = useRef({ at: 0, kind: null, correctAt: 0, encourageAt: 0 });
  const cueTimer = useRef(0);
  // continuous conversational LLM coach
  const liveCoachRef = useRef(null);
  const liveCtxRef = useRef({ active: false });
  const connectedRef = useRef(connected);
  connectedRef.current = connected;
  const llmCoachOn = () => settingsRef.current.liveAICoach && connectedRef.current && liveCoachRef.current?.healthy;

  // render state
  const [phase, setPhase] = useState("init");
  const [pos, setPos] = useState({ exIndex: 0, setIndex: 0 });
  const [hud, setHud] = useState({ reps: 0, score: 100, holdSeconds: 0, feedback: null, kind: null, visible: true, angle: null, progress: 0 });
  const [countdown, setCountdown] = useState(3);
  const [restLeft, setRestLeft] = useState(0);
  const [coachMsg, setCoachMsg] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState(null);
  const [heard, setHeard] = useState(null);
  const [micStatus, setMicStatus] = useState(null); // { state, message }
  const [focus, setFocus] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [recSaved, setRecSaved] = useState(null);
  const [coachCue, setCoachCue] = useState(null); // { text, kind } shown on the HUD
  const [summary, setSummary] = useState(null);
  const [demoEx, setDemoEx] = useState(null); // exercise def shown in the "how to" modal
  const [needCamTap, setNeedCamTap] = useState(false);
  const [camBusy, setCamBusy] = useState(false);
  const aliveRef = useRef(true);
  const startedRef = useRef(false);

  const curEx = () => exercises[sessRef.current.exIndex];
  const curDef = () => EXERCISE_BY_ID[curEx()?.id];

  useEffect(() => { setVoiceEnabled(settings.voice); }, [settings.voice]);
  useEffect(() => {
    setVoiceConfig({
      engine: settings.ttsEngine, kokoroVoice: settings.kokoroVoice,
      voiceName: settings.ttsVoice, rate: settings.ttsRate, pitch: settings.ttsPitch,
    });
  }, [settings.ttsEngine, settings.kokoroVoice, settings.ttsVoice, settings.ttsRate, settings.ttsPitch]);

  // The continuous conversational coach.
  useEffect(() => {
    const lc = new LiveCoach({
      model: settingsRef.current.model,
      profile,
      speak: (text, opts) => emitCue(text, "say", opts),
    });
    lc.setContextProvider(() => liveCtxRef.current);
    liveCoachRef.current = lc;
    return () => { lc.stop(); liveCoachRef.current = null; };
  }, []); // eslint-disable-line
  useEffect(() => { liveCoachRef.current?.setModel(settings.model); }, [settings.model]);

  // ---------- setup (re-callable so iOS can start the camera from a tap) ----------
  async function initSession() {
    if (startedRef.current || camBusy) return;
    const blocked = secureContextError();
    if (blocked) { setErr(blocked); return; }
    setCamBusy(true);
    try {
      const stream = await getCameraStream();
      if (!aliveRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      sizeCanvas();
      setVoiceConfig({
        engine: settingsRef.current.ttsEngine, kokoroVoice: settingsRef.current.kokoroVoice,
        voiceName: settingsRef.current.ttsVoice, rate: settingsRef.current.ttsRate, pitch: settingsRef.current.ttsPitch,
      });
      await createPose(settingsRef.current.poseModel || "lite");
      if (!aliveRef.current) return;
      startedRef.current = true;
      setNeedCamTap(false);
      sessRef.current.phase = "ready";
      setPhase("ready");
      startLoop();
    } catch (e) {
      // NotAllowedError on first auto-attempt usually just means iOS wants a
      // user gesture → show the tap button. Anything else → show the reason.
      if (e?.name === "NotAllowedError" && !startedRef.current) setNeedCamTap(true);
      else setErr(cameraErrorText(e));
    } finally {
      setCamBusy(false);
    }
  }

  useEffect(() => {
    aliveRef.current = true;
    initSession();
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(cueTimer.current);
      stopSpeaking();
      disposePose();
      try { recorderRef.current?.stop(); } catch { /* noop */ }
      const s = videoRef.current?.srcObject;
      s?.getTracks?.().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line

  // ---------- voice commands ----------
  useEffect(() => {
    const wantListen = (settings.voiceCommands || settings.liveAICoach) && speechSupported();
    if (!wantListen) return;
    const stop = startListening(
      (intent) => {
        const s = sessRef.current;
        if (intent === "pause") doPause(true);
        else if (intent === "resume") doPause(false);
        else if (intent === "next") jumpToExercise(s.exIndex + 1);
        else if (intent === "finish") finish();
        else if (intent === "start" && s.phase === "ready") beginExercise(0);
        else if (intent === "record") toggleRecording();
        else if (intent === "demo") setDemoEx(curDef());
        else if (intent === "status" && !llmCoachOn()) speak(`${trackerRef.current?.reps || 0} reps so far.`, { interrupt: true });
      },
      (txt, intent) => {
        setHeard(txt);
        // Free-form speech (not a command) → talk to the AI coach.
        if (!intent && llmCoachOn() && txt.length > 2) {
          stopSpeaking();
          liveCoachRef.current.userSay(txt);
        }
      },
      (state, info) => setMicStatus({ state, message: info?.message }),
    );
    return () => { stop(); setMicStatus(null); };
  }, [settings.voiceCommands, settings.liveAICoach]); // eslint-disable-line

  function sizeCanvas() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
  }

  // ---------- loop ----------
  function startLoop() {
    lastTickRef.current = performance.now();
    const tick = (now) => { frameRef.current(now); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }

  frameRef.current = (now) => {
    const sess = sessRef.current;
    const dtReal = now - lastTickRef.current;
    lastTickRef.current = now;
    const isPaused = pausedRef.current;
    if (!isPaused) sess.clock += dtReal;

    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return;
    if (c.width !== v.videoWidth && v.videoWidth) sizeCanvas();
    const mirror = settingsRef.current.mirror;

    const ts = Math.max((sess.lastDetectTs || 0) + 1, Math.round(now));
    sess.lastDetectTs = ts;
    let result = null;
    try { result = detect(v, ts); } catch { /* warming up */ }
    const ctx = c.getContext("2d");
    let strokeColor = isPaused ? "#4aa8ff" : "#39d98a";

    if (!isPaused) {
      if (sess.phase === "countdown") {
        const elapsed = sess.clock - sess.phaseStart;
        const remaining = 3 - Math.floor(elapsed / 1000);
        if (remaining !== sess.lastCount) {
          sess.lastCount = remaining;
          if (remaining > 0) { setCountdown(remaining); speak(sayNumber(remaining), { interrupt: true, rate: 1.1 }); }
        }
        if (elapsed >= 3000) enterActive();
      } else if (sess.phase === "active" && result) {
        const res = trackerRef.current.update(result.landmarks, sess.clock);
        handleActive(res);
        if (res.issues?.length) strokeColor = "#ffb454";
        else if (!res.visible) strokeColor = "#ff6b6b";
      } else if (sess.phase === "rest") {
        const elapsed = (sess.clock - sess.phaseStart) / 1000;
        const left = Math.max(0, Math.ceil(sess.restTotal - elapsed));
        if (left !== sess.lastCount) {
          sess.lastCount = left;
          setRestLeft(left);
          if (left === REST_WARN_AT) speak("Get ready.", { interrupt: true });
        }
        if (elapsed >= sess.restTotal) advanceAfterRest();
      }
    }

    if (result) drawPose(ctx, result.landmarks, { color: strokeColor, mirror });
    else ctx.clearRect(0, 0, c.width, c.height);

    // composite for recording (video + skeleton on one canvas)
    if (recordingRef.current) {
      const rc = recordCanvasRef.current;
      if (rc.width !== c.width || rc.height !== c.height) { rc.width = c.width; rc.height = c.height; }
      const rctx = rc.getContext("2d");
      rctx.save();
      if (mirror) { rctx.translate(rc.width, 0); rctx.scale(-1, 1); }
      rctx.drawImage(v, 0, 0, rc.width, rc.height);
      rctx.restore();
      if (result) drawPose(rctx, result.landmarks, { color: strokeColor, mirror, clear: false });
    }
  };

  function handleActive(res) {
    const sess = sessRef.current;
    const ex = curEx();
    const def = curDef();
    const target = def.type === "hold" ? (ex.holdSeconds || 30) : (ex.reps || 10);
    const cur = def.type === "hold" ? (res.holdSeconds ?? 0) : (res.reps ?? 0);

    const nowMs = sess.clock;
    if (res.repCompleted || nowMs - sess.lastHudAt > 110) {
      sess.lastHudAt = nowMs;
      setHud({
        reps: res.reps ?? 0, score: res.score ?? 100, holdSeconds: res.holdSeconds ?? 0,
        feedback: res.feedback === "good" ? null : res.feedback,
        kind: res.issues?.length ? "warn" : res.feedback === "good" ? "good" : null,
        visible: res.visible, angle: res.angle, progress: Math.min(100, (cur / target) * 100),
      });
    }

    // Keep the live coach's situational awareness fresh.
    liveCtxRef.current = {
      active: true, exercise: def.name,
      reps: def.type === "hold" ? res.holdSeconds ?? 0 : res.reps ?? 0,
      target, form: res.score ?? 100, fault: res.faultId || null,
    };

    // Continuous coaching: the LLM coach narrates; rule engine handles instant
    // safety corrections + on-screen cues. Without the LLM, rules do everything.
    speakCoaching(res, def);
    if (llmCoachOn()) {
      const lc = liveCoachRef.current;
      lc.tick(performance.now());
      if (res.repCompleted) {
        if (res.lastRep && !res.lastRep.romOk) lc.event("shallow");
        else if (res.reps > 0 && res.reps % 5 === 0) lc.event("milestone", { reps: res.reps, target, form: res.score });
      }
    }

    if (!sess.completing && cur >= target) completeSet();
  }

  // Shows a cue on the HUD and (if voice on) speaks it. This is the single voice
  // funnel during a set, so cues never talk over each other.
  function emitCue(text, kind, opts = {}) {
    setCoachCue({ text, kind });
    clearTimeout(cueTimer.current);
    cueTimer.current = setTimeout(() => setCoachCue(null), 2600);
    if (settingsRef.current.voice) speak(text, opts);
  }

  // Decide the single most useful thing to say right now, by priority.
  function speakCoaching(res, def) {
    const now = performance.now();
    const S = coachRef.current;
    const exId = def.id;

    if (!res.visible) {
      if (now - S.at > 3000) { S.at = now; emitCue("Step back so I can see your whole body.", "correct", { minGapMs: 2500 }); }
      return;
    }
    // 1) form correction — highest priority (always rule-based for speed/accuracy)
    if (res.liveKind === "correct" && res.faultId) {
      if (now - S.correctAt > 2600) { S.correctAt = now; S.at = now; emitCue(pickLiveCue(exId, "correct", res.faultId), "correct", { interrupt: true }); }
      return;
    }
    // When the LLM coach is talking, let it own the narration; rules only do the
    // instant safety corrections above.
    if (llmCoachOn()) return;
    // 2) a rep just completed — quick acknowledgement / count
    if (res.repCompleted) {
      S.at = now;
      if (res.lastRep && !res.lastRep.romOk) emitCue(pickLiveCue(exId, "go", null), "go", { interrupt: true });
      else if (settingsRef.current.spokenReps) emitCue(sayNumber(res.reps), "deep", { minGapMs: 250 });
      else emitCue(praise(), "deep", { minGapMs: 1200 });
      return;
    }
    // 3) motion cues through the rep (go / deep / up)
    if (res.liveKind === "go" || res.liveKind === "deep" || res.liveKind === "up") {
      if (res.liveKind !== S.kind || now - S.at > 1600) {
        S.kind = res.liveKind; S.at = now;
        emitCue(pickLiveCue(exId, res.liveKind, null), res.liveKind, { minGapMs: 1100 });
      }
      return;
    }
    // 4) isometric hold cues
    if (res.liveKind === "hold") {
      if (now - S.at > 4500) { S.at = now; emitCue(pickLiveCue(exId, "hold", null), "hold", { minGapMs: 4000 }); }
      return;
    }
    // 5) idle → periodic encouragement
    if (now - S.encourageAt > 6500 && now - S.at > 2500) {
      S.encourageAt = now; S.at = now; emitCue(pickLiveCue(exId, "encourage", null), "encourage", { minGapMs: 4000 });
    }
  }

  // ---------- transitions ----------
  function beginExercise(exIndex) {
    const sess = sessRef.current;
    if (!sess.session.startedAt) sess.session.startedAt = Date.now();
    sess.exIndex = exIndex;
    sess.setIndex = 0;
    setPos({ exIndex, setIndex: 0 });
    setCoachMsg(null);
    setAnalysis(null);
    beginSet();
  }

  function beginSet() {
    const sess = sessRef.current;
    const ex = curEx();
    const def = curDef();
    trackerRef.current = new ExerciseTracker(def);
    sess.completing = false;
    sess.lastCount = null;
    coachRef.current = { at: 0, kind: null, correctAt: 0, encourageAt: 0 };
    liveCtxRef.current = { active: false };
    setCoachCue(null);
    setHud({ reps: 0, score: 100, holdSeconds: 0, feedback: null, kind: null, visible: true, angle: null, progress: 0 });
    if (llmCoachOn()) {
      liveCoachRef.current.event("set_start", { exercise: def.name, set: sess.setIndex + 1, sets: ex.sets, target: def.type === "hold" ? ex.holdSeconds : ex.reps, type: def.type });
    } else {
      speak(`${def.name}. Set ${sess.setIndex + 1}.`, { interrupt: true });
    }
    if (settingsRef.current.countIn) {
      sess.phase = "countdown";
      sess.phaseStart = sess.clock;
      setCountdown(3);
      setPhase("countdown");
    } else {
      enterActive();
    }
  }

  function enterActive() {
    sessRef.current.phase = "active";
    setPhase("active");
    speak("Go!", { interrupt: true, rate: 1.12 });
  }

  function completeSet() {
    const sess = sessRef.current;
    sess.completing = true;
    const def = curDef();
    const ex = curEx();
    const setSum = trackerRef.current.setSummary();
    sess.session.sets.push(setSum);
    liveCtxRef.current = { active: false };

    const hasMoreSets = sess.setIndex + 1 < ex.sets;
    const hasMoreEx = sess.exIndex + 1 < exercises.length;
    const last = !hasMoreSets && !hasMoreEx;

    if (llmCoachOn()) {
      // The conversational coach reacts to the completed set itself.
      liveCoachRef.current.event("set_done", { reps: setSum.reps, holdSeconds: setSum.holdSeconds, form: setSum.formScore, type: def.type });
    } else {
      speak(def.type === "hold" ? "Time! Nice hold." : "Set complete! Great work.", { interrupt: true });
      if (settingsRef.current.autoCoach) {
        const local = localSetFeedback(setSum);
        setCoachMsg(local);
        speak(local, { minGapMs: 0 });
        if (settingsRef.current.aiSetFeedback) {
          setFeedback(setSum, profile, settingsRef.current.model, settingsRef.current.fastMode)
            .then((txt) => { if (txt) setCoachMsg(txt); })
            .catch(() => {});
        }
      }
    }

    if (last) { finish(); return; }

    sess.restTotal = ex.restSeconds || 60;
    sess.phase = "rest";
    sess.phaseStart = sess.clock;
    sess.lastCount = null;
    setRestLeft(sess.restTotal);
    setPhase("rest");
    if (llmCoachOn()) {
      liveCoachRef.current.event("rest", { seconds: sess.restTotal, next: nextLabel(exercises, sess) });
    }
  }

  function advanceAfterRest() {
    const sess = sessRef.current;
    const ex = curEx();
    if (sess.setIndex + 1 < ex.sets) {
      sess.setIndex += 1;
      setPos({ exIndex: sess.exIndex, setIndex: sess.setIndex });
      beginSet();
    } else {
      beginExercise(sess.exIndex + 1);
    }
  }

  function jumpToExercise(idx) {
    if (idx >= exercises.length) { finish(); return; }
    beginExercise(idx);
  }

  function skipSet() {
    const p = sessRef.current.phase;
    if (p === "active") completeSet();
    else if (p === "rest") advanceAfterRest();
  }
  function addRest(sec) {
    const sess = sessRef.current;
    if (sess.phase !== "rest") return;
    sess.restTotal += sec;
    setRestLeft(Math.max(0, Math.ceil(sess.restTotal - (sess.clock - sess.phaseStart) / 1000)));
  }

  function doPause(p) {
    pausedRef.current = p;
    setPaused(p);
    if (p) { stopSpeaking(); speak("Paused.", { interrupt: true }); }
    else speak("Back to it.", { interrupt: true });
  }

  function finish() {
    const sess = sessRef.current;
    // capture an in-progress set if finishing mid-exercise
    if (sess.phase === "active" && trackerRef.current && !sess.completing && (trackerRef.current.reps > 0 || trackerRef.current.holdSeconds() > 0)) {
      sess.session.sets.push(trackerRef.current.setSummary());
    }
    sess.phase = "done";
    setPhase("done");
    liveCtxRef.current = { active: false };
    const built = buildSession();
    stopSpeaking();
    if (llmCoachOn()) {
      liveCoachRef.current.event("finish", { totalReps: built.totalReps, form: built.avgForm });
      liveCoachRef.current.stop();
    } else {
      speak("Workout complete! Awesome effort today.", { interrupt: true });
    }
    if (recordingRef.current) toggleRecording();
    setSummary(built);
    onComplete?.(built);
  }

  function buildSession() {
    const sets = sessRef.current.session.sets;
    const durationSec = Math.max(1, Math.round((Date.now() - (sessRef.current.session.startedAt || Date.now())) / 1000));
    const byName = {};
    let totalReps = 0, totalHold = 0, formSum = 0;
    for (const st of sets) {
      totalReps += st.reps || 0; totalHold += st.holdSeconds || 0; formSum += st.formScore || 0;
      const e = (byName[st.exercise] ||= { name: st.exercise, sets: 0, reps: 0, holdSec: 0, bestForm: 0 });
      e.sets++; e.reps += st.reps || 0; e.holdSec += st.holdSeconds || 0; e.bestForm = Math.max(e.bestForm, st.formScore || 0);
    }
    return {
      date: new Date().toISOString(), dayTitle: day.title, durationSec,
      totalReps, totalHoldSec: totalHold,
      avgForm: sets.length ? Math.round(formSum / sets.length) : 0,
      kcal: Math.round((durationSec / 60) * 6),
      exercises: Object.values(byName),
    };
  }

  // ---------- recording ----------
  function toggleRecording() {
    if (!recordingSupported()) return;
    if (!recordingRef.current) {
      const rc = recordCanvasRef.current;
      rc.width = canvasRef.current?.width || 1280;
      rc.height = canvasRef.current?.height || 720;
      recordingRef.current = true;
      try {
        recorderRef.current = new SessionRecorder(rc, { fps: 30 });
        recorderRef.current.start();
        setRecording(true);
        speak("Recording.", { interrupt: true });
      } catch (e) {
        recordingRef.current = false;
        setErr("Recording failed: " + e.message);
      }
    } else {
      const r = recorderRef.current;
      recordingRef.current = false;
      setRecording(false);
      r?.stop().then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const name = `aicoach-${day.title.replace(/\W+/g, "-")}-${Date.now()}.${r.extension}`;
        setRecordings((list) => [...list, { url, name, durationSec: r.durationSec, blob }]);
        // Auto-save to the browser's Downloads folder so it isn't lost.
        downloadBlob(blob, name);
        setRecSaved(name);
        setTimeout(() => setRecSaved((n) => (n === name ? null : n)), 7000);
        speak("Recording saved.", { interrupt: true });
      });
    }
  }

  // ---------- snapshot + analysis ----------
  function snapshot() {
    const v = videoRef.current;
    if (!v) return null;
    const c = snapRef.current || (snapRef.current = document.createElement("canvas"));
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  }
  async function runAnalysis() {
    const def = curDef();
    if (!def) return;
    setAnalyzing(true); setAnalysis(null);
    try {
      const txt = await analyzeForm({
        image: snapshot(),
        metrics: { jointAngle: hud.angle, reps: hud.reps, formScore: hud.score },
        exerciseName: def.name, profile, fast: settingsRef.current.fastMode,
        model: settingsRef.current.visionModel || settingsRef.current.model,
      });
      setAnalysis(txt);
      speak(txt, { interrupt: true });
    } catch (e) {
      setAnalysis("⚠ " + (e.message || "Couldn't analyze right now."));
    } finally {
      setAnalyzing(false);
    }
  }

  // ---------- render ----------
  if (err) {
    return (
      <div className="card fade-in">
        <h2>Camera / vision problem</h2>
        <div className="banner bad" style={{ whiteSpace: "pre-wrap" }}>{err}</div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="primary" onClick={() => { setErr(null); startedRef.current = false; initSession(); }}>↻ Try again</button>
          <button onClick={onExit}>← Back to program</button>
        </div>
      </div>
    );
  }

  if (phase === "done" && summary) {
    return <SummaryView summary={summary} recordings={recordings} onExit={onExit} />;
  }

  const ex = exercises[pos.exIndex];
  const def = ex ? EXERCISE_BY_ID[ex.id] : null;

  return (
    <div className={`workout fade-in ${focus ? "focus" : ""}`}>
      <div>
        <div className={`stage ${focus ? "focus" : ""}`}>
          <video ref={videoRef} className={settings.mirror ? "mirror" : ""} playsInline muted />
          <canvas ref={canvasRef} />
          <canvas ref={recordCanvasRef} style={{ display: "none" }} />
          <div className={`hud ${settings.bigHud ? "big" : ""}`}>
            {def && phase !== "init" && (
              <>
                <div className="ex-title">{def.name}</div>
                <div className="ex-sub">Set {pos.setIndex + 1} / {ex.sets} · {def.view} view</div>
                <div className="score">
                  <div className="lbl">FORM</div>
                  <div className="num" style={{ color: hud.score >= 80 ? "var(--accent)" : hud.score >= 60 ? "var(--warn)" : "var(--bad)" }}>{hud.score}</div>
                </div>
                {phase === "active" && <div className="progressbar"><i style={{ width: `${hud.progress}%` }} /></div>}
              </>
            )}
            {recording && <div className="rec-dot" style={{ top: phase !== "init" ? 64 : 18 }}><span className="blink" />REC</div>}

            {phase === "active" && (
              <div className="rep-count">
                {def?.type === "hold" ? <>{hud.holdSeconds}<small>s / {ex.holdSeconds}s</small></> : <>{hud.reps}<small> / {ex.reps}</small></>}
              </div>
            )}
            {phase === "countdown" && <div className="timer-big"><div className="t">{countdown}</div></div>}
            {phase === "rest" && (
              <div className="timer-big">
                <div>
                  <div className="muted">REST</div>
                  <div className={`t ${restLeft <= REST_WARN_AT ? "warn" : ""}`}>{restLeft}</div>
                  <div className="muted">Next: {nextLabel(exercises, sessRef.current)}</div>
                </div>
              </div>
            )}
            {phase === "init" && (
              <div className="timer-big">
                <div style={{ pointerEvents: "auto", maxWidth: 300 }}>
                  {needCamTap ? (
                    <>
                      <button className="primary" onClick={initSession} disabled={camBusy}>
                        {camBusy ? <span className="spin" /> : "📷 Enable camera"}
                      </button>
                      <div className="muted" style={{ marginTop: 10, fontSize: "0.8rem" }}>
                        Allow camera access when prompted. On iPhone, accept the certificate warning first.
                      </div>
                    </>
                  ) : (
                    <><span className="spin" /><div className="muted" style={{ marginTop: 10 }}>Starting camera & vision…</div></>
                  )}
                </div>
              </div>
            )}

            {coachCue && phase === "active" && (
              <div className={`cue ${cueClass(coachCue.kind)}`}>{coachCue.text}</div>
            )}
            {paused && <div className="timer-big"><div className="t" style={{ color: "var(--accent-2)" }}>❚❚</div></div>}
          </div>
        </div>

        <div className="controls" style={{ marginTop: 12 }}>
          {phase === "ready" && <button className="primary" onClick={() => beginExercise(0)}>▶ Start workout</button>}
          {(phase === "active" || phase === "rest" || phase === "countdown") && (
            <>
              <button onClick={() => doPause(!paused)}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
              <button onClick={skipSet}>⏭ Skip set</button>
              <button onClick={() => jumpToExercise(sessRef.current.exIndex + 1)}>Next ex →</button>
              {phase === "rest" && <button onClick={() => addRest(20)}>+20s rest</button>}
              <button onClick={runAnalysis} disabled={analyzing}>{analyzing ? <span className="spin" /> : "📷 Analyze form"}</button>
            </>
          )}
          {def && phase !== "init" && phase !== "done" && (
            <button onClick={() => setDemoEx(def)}>❔ How to</button>
          )}
          {recordingSupported() && phase !== "done" && (
            <button className={recording ? "danger" : ""} onClick={toggleRecording}>{recording ? "⏹ Stop rec" : "⏺ Record"}</button>
          )}
          <button onClick={() => setFocus((f) => !f)}>{focus ? "🔳 Show panel" : "⛶ Focus"}</button>
          <button className="danger" onClick={finish}>Finish</button>
        </div>
        {recSaved && <div className="banner ok" style={{ marginTop: 10 }}>💾 Saved “{recSaved}” to your browser’s Downloads folder.</div>}
        {(settings.liveAICoach || settings.voiceCommands) && speechSupported() && (
          (micStatus?.state === "denied" || micStatus?.state === "error") ? (
            <div className="banner bad" style={{ marginTop: 8, fontSize: "0.8rem" }}>🎤 {micStatus.message}</div>
          ) : micStatus?.state === "network" ? (
            <div className="muted" style={{ marginTop: 6, fontSize: "0.75rem", opacity: 0.85 }}>🎤 {micStatus.message}</div>
          ) : (
            <div className="muted" style={{ marginTop: 6, fontSize: "0.75rem" }}>
              {micStatus?.state === "listening" ? "🟢" : "🎤"} {heard ? `heard: “${heard}”` : "Talk to your coach — say “next”, “pause”, “how to”, or ask anything."}
            </div>
          )
        )}
      </div>

      {!focus && (
        <div className="side-panel">
          <div className="card">
            <h2 style={{ marginBottom: 6 }}>Today · {day.title}</h2>
            <div className="set-dots" style={{ marginBottom: 10 }}>
              {ex && Array.from({ length: ex.sets }).map((_, i) => (
                <div key={i} className={`d ${i < pos.setIndex ? "done" : ""} ${i === pos.setIndex ? "cur" : ""}`} />
              ))}
            </div>
            <div className="ex-plan">
              {exercises.map((e, i) => {
                const d = EXERCISE_BY_ID[e.id];
                const st = i === pos.exIndex ? "cur" : i < pos.exIndex ? "done" : "";
                return (
                  <div key={i} className={`plan-row ${st}`}>
                    <div className="ex-thumb sm"><ExerciseGlyph id={e.id} size={28} /></div>
                    <div className="plan-name">{d?.name}</div>
                    <div className="muted plan-meta">{e.type === "hold" ? `${e.sets}×${e.holdSeconds}s` : `${e.sets}×${e.reps}`}</div>
                  </div>
                );
              })}
            </div>
            {def && (
              <button className="ghost" style={{ marginTop: 12, width: "100%" }} onClick={() => setDemoEx(def)}>
                ❔ Show me how to do {def.name}
              </button>
            )}
            {def?.cues && (
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ fontSize: "0.72rem", marginBottom: 4 }}>FORM CUES</div>
                <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: "0.9rem" }}>
                  {def.cues.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>

          {(coachMsg || analysis) && (
            <div className="card fade-in">
              <div className="muted" style={{ fontSize: "0.72rem", marginBottom: 6 }}>{analysis ? "FORM ANALYSIS" : "COACH"}</div>
              <div style={{ lineHeight: 1.5 }}>{analysis || coachMsg}</div>
            </div>
          )}

          <div className="card" style={{ flex: 1 }}>
            <h2>Ask your coach</h2>
            <CoachChat profile={profile} model={settings.model} fast={settings.fastMode} snapshot={snapshot} height={240} />
          </div>
        </div>
      )}

      {demoEx && <ExerciseDemo exercise={demoEx} onClose={() => setDemoEx(null)} />}
    </div>
  );
}

function SummaryView({ summary, recordings, onExit }) {
  const mins = Math.floor(summary.durationSec / 60), secs = summary.durationSec % 60;
  return (
    <div className="grid fade-in" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <h1 style={{ marginBottom: 2 }}>Workout complete! 🎉</h1>
        <p className="muted">{summary.dayTitle}</p>
        <div className="ring" style={{ "--p": summary.avgForm }}>
          <div className="inner"><div><b>{summary.avgForm}</b><div className="muted" style={{ fontSize: "0.7rem" }}>form</div></div></div>
        </div>
        <div className="stat-grid" style={{ marginTop: 18 }}>
          <div className="stat"><div className="v">{summary.totalReps}</div><div className="k">Reps</div></div>
          <div className="stat"><div className="v">{mins}:{String(secs).padStart(2, "0")}</div><div className="k">Duration</div></div>
          <div className="stat"><div className="v">{summary.exercises.length}</div><div className="k">Exercises</div></div>
          <div className="stat"><div className="v">~{summary.kcal}</div><div className="k">kcal</div></div>
        </div>
      </div>

      <div className="card">
        <h2>Breakdown</h2>
        {summary.exercises.map((e, i) => (
          <div key={i} className="ex-row">
            <div className="ex-thumb sm"><ExerciseGlyph id={idForName(e.name)} size={26} /></div>
            <div style={{ flex: 1 }} className="ex-name">{e.name}</div>
            <div className="ex-meta">{e.sets} sets · {e.holdSec ? `${e.holdSec}s hold` : `${e.reps} reps`} · form {e.bestForm}</div>
          </div>
        ))}
      </div>

      {recordings.length > 0 && (
        <div className="card">
          <h2>Recordings</h2>
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
            Saved to your browser’s Downloads folder. Tap Save to download again.
          </div>
          <div className="rec-list">
            {recordings.map((r, i) => (
              <div key={i} className="rec-item">
                <video src={r.url} controls />
                <div style={{ flex: 1 }}>
                  <div>Session {i + 1}</div>
                  <div className="muted" style={{ fontSize: "0.78rem" }}>{r.durationSec}s</div>
                </div>
                <button onClick={() => downloadBlob(r.blob, r.name)}>⬇ Save</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: "center" }}>
        <button className="primary" onClick={onExit}>← Back to program</button>
      </div>
    </div>
  );
}

function idForName(name) {
  return resolveExercise(name)?.id || "squat";
}

function cueClass(kind) {
  if (kind === "correct") return "warn";
  if (kind === "deep" || kind === "encourage") return "good";
  return "";
}

function nextLabel(exercises, sess) {
  const ex = exercises[sess.exIndex];
  if (!ex) return "—";
  if (sess.setIndex + 1 < ex.sets) return `${EXERCISE_BY_ID[ex.id]?.name} (set ${sess.setIndex + 2})`;
  const nxt = exercises[sess.exIndex + 1];
  return nxt ? EXERCISE_BY_ID[nxt.id]?.name : "Finish 🎉";
}

