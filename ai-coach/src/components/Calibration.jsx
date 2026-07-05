import React, { useEffect, useRef, useState } from "react";
import { createPose, detect, drawPose, disposePose } from "../lib/pose.js";
import { LM } from "../lib/landmarks.js";
import { bodyVisibility, kneeAngle, pt, visible } from "../lib/geometry.js";
import { EXERCISE_BY_ID } from "../lib/exercises.js";
import { ExerciseTracker } from "../lib/formEngine.js";
import { speak, setVoiceEnabled, setVoiceConfig, startListening, speechSupported } from "../lib/voice.js";
import { secureContextError, getCameraStream, cameraErrorText } from "../lib/media.js";

// A guided "is it working?" screen: checks camera, pose tracking, a couple of
// easy moves, and audio — then confirms the system is calibrated and ready.
export default function Calibration({ settings, onChange, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const frameRef = useRef(() => {});
  const aliveRef = useRef(true);
  const startedRef = useRef(false);
  const trackerRef = useRef(null);
  const stRef = useRef({ framingSince: 0, lastFps: performance.now(), frames: 0, lastUi: 0 });
  const listenStopRef = useRef(null);

  const supportsVoiceCmd = speechSupported();
  const [err, setErr] = useState(null);
  const [needCamTap, setNeedCamTap] = useState(false);
  const [camBusy, setCamBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [metrics, setMetrics] = useState({ vis: 0, fps: 0, angle: null });
  const [checks, setChecks] = useState({ framing: false, armsUp: false, squat: false, voice: false });
  const [reps, setReps] = useState(0);
  const [micStatus, setMicStatus] = useState(null); // { state, message }
  const [heard, setHeard] = useState(null);
  const [listening, setListening] = useState(false);

  useEffect(() => { setVoiceEnabled(settings.voice); setVoiceConfig({ engine: settings.ttsEngine, kokoroVoice: settings.kokoroVoice, voiceName: settings.ttsVoice, rate: settings.ttsRate, pitch: settings.ttsPitch }); });

  async function initCam() {
    if (startedRef.current || camBusy) return;
    const blocked = secureContextError();
    if (blocked) { setErr(blocked); return; }
    setCamBusy(true);
    try {
      const stream = await getCameraStream();
      if (!aliveRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      const v = videoRef.current;
      v.srcObject = stream; await v.play();
      sizeCanvas();
      await createPose(settings.poseModel || "lite");
      if (!aliveRef.current) return;
      trackerRef.current = new ExerciseTracker(EXERCISE_BY_ID.squat);
      startedRef.current = true;
      setNeedCamTap(false); setReady(true);
      loop();
    } catch (e) {
      if (e?.name === "NotAllowedError" && !startedRef.current) setNeedCamTap(true);
      else setErr(cameraErrorText(e));
    } finally { setCamBusy(false); }
  }

  useEffect(() => {
    aliveRef.current = true;
    initCam();
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      disposePose();
      listenStopRef.current?.();
      videoRef.current?.srcObject?.getTracks?.().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line

  function sizeCanvas() {
    const v = videoRef.current, c = canvasRef.current;
    if (v && c) { c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720; }
  }

  function loop() {
    const tick = (now) => { frameRef.current(now); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
  }

  frameRef.current = (now) => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return;
    if (c.width !== v.videoWidth && v.videoWidth) sizeCanvas();
    const st = stRef.current;
    st.frames++;
    let result = null;
    try { result = detect(v, Math.round(now)); } catch { /* warming */ }
    const ctx = c.getContext("2d");

    let vis = 0, angle = null;
    let inFrame = false;
    if (result) {
      const lm = result.landmarks;
      vis = bodyVisibility(lm);
      inFrame = vis >= 0.8;
      angle = kneeAngle(lm);

      // checks (latch to true once achieved)
      if (vis >= 0.85) {
        if (!st.framingSince) st.framingSince = now;
        if (now - st.framingSince > 800) markCheck("framing");
      } else st.framingSince = 0;

      const ls = pt(lm, LM.leftShoulder), rs = pt(lm, LM.rightShoulder), lw = pt(lm, LM.leftWrist), rw = pt(lm, LM.rightWrist);
      if (visible(lm, LM.leftWrist, 0.5) && visible(lm, LM.rightWrist, 0.5) && ls && rs && lw && rw && lw.y < ls.y && rw.y < rs.y) markCheck("armsUp");

      if (angle != null && angle < 120) markCheck("squat");

      // live rep-count test
      const res = trackerRef.current.update(lm, now);
      if (res?.reps != null && res.reps !== reps) setReps(res.reps);

      drawPose(ctx, lm, { color: inFrame ? "#39d98a" : "#ffb454", mirror: settings.mirror });
    } else {
      ctx.clearRect(0, 0, c.width, c.height);
    }

    // throttled UI update (+ fps)
    if (now - st.lastUi > 150) {
      const dt = now - st.lastFps;
      const fps = dt > 0 ? (st.frames * 1000) / dt : 0;
      st.frames = 0; st.lastFps = now; st.lastUi = now;
      setMetrics({ vis: Math.round(vis * 100), fps: Math.round(fps), angle: angle != null ? Math.round(angle) : null });
    }
  };

  function markCheck(id) {
    setChecks((c) => {
      if (c[id]) return c;
      if (PRAISE[id]) speak(PRAISE[id], { interrupt: true });
      // Free the mic once the speech-recognition check has passed.
      if (id === "voiceCmd") { listenStopRef.current?.(); listenStopRef.current = null; setListening(false); }
      return { ...c, [id]: true };
    });
  }

  function testVoice() {
    speak("Audio check — your coach is loud and clear. You're all set!", { interrupt: true, force: true });
    setChecks((c) => ({ ...c, voice: true }));
  }

  // Mic / speech-recognition check: listen for any spoken word (a command word
  // ideally) and pass the step once we successfully hear something.
  function testMicCommand() {
    if (!supportsVoiceCmd) return;
    if (listenStopRef.current) { // toggle off
      listenStopRef.current(); listenStopRef.current = null;
      setListening(false); setMicStatus(null);
      return;
    }
    setHeard(null);
    speak("Say a command, like next, pause, or how many.", { interrupt: true, force: true });
    setListening(true);
    listenStopRef.current = startListening(
      () => markCheck("voiceCmd"),                 // recognized a real command word
      (txt) => { if (txt && txt.length > 1) { setHeard(txt); markCheck("voiceCmd"); } },
      (state, info) => setMicStatus({ state, message: info?.message }),
    );
  }

  function resetChecks() {
    setChecks({ framing: false, armsUp: false, squat: false, voice: false, voiceCmd: false });
    setReps(0); setHeard(null);
    listenStopRef.current?.(); listenStopRef.current = null; setListening(false); setMicStatus(null);
    stRef.current.framingSince = 0;
    trackerRef.current = new ExerciseTracker(EXERCISE_BY_ID.squat);
  }

  const steps = [
    { id: "framing", label: "Stand back so your whole body is visible" },
    { id: "armsUp", label: "Raise both arms overhead" },
    { id: "squat", label: "Do one slow squat" },
    { id: "voice", label: "Tap “Test voice” to check audio" },
    // Speech recognition is Chromium-only — only require it where it can work.
    ...(supportsVoiceCmd ? [{ id: "voiceCmd", label: "Tap “Test mic”, then say a command" }] : []),
  ];
  const current = steps.find((s) => !checks[s.id]);
  const allDone = steps.every((s) => checks[s.id]);

  if (err) {
    return (
      <div className="card fade-in">
        <h2>Camera / vision problem</h2>
        <div className="banner bad" style={{ whiteSpace: "pre-wrap" }}>{err}</div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="primary" onClick={() => { setErr(null); startedRef.current = false; initCam(); }}>↻ Try again</button>
          <button onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="workout fade-in">
      <div>
        <div className="stage">
          <video ref={videoRef} className={settings.mirror ? "mirror" : ""} playsInline muted />
          <canvas ref={canvasRef} />
          <div className="hud">
            {ready && (
              <>
                <div className="ex-title">Calibration</div>
                <div className="score">
                  <div className="lbl">IN FRAME</div>
                  <div className="num" style={{ color: metrics.vis >= 80 ? "var(--accent)" : "var(--warn)" }}>{metrics.vis}%</div>
                </div>
                {!allDone && current && <div className="cue">{current.label}</div>}
                {allDone && <div className="cue good">✓ All checks passed — you're ready!</div>}
              </>
            )}
            {!ready && (
              <div className="timer-big">
                <div style={{ pointerEvents: "auto", maxWidth: 300 }}>
                  {needCamTap ? (
                    <>
                      <button className="primary" onClick={initCam} disabled={camBusy}>{camBusy ? <span className="spin" /> : "📷 Enable camera"}</button>
                      <div className="muted" style={{ marginTop: 10, fontSize: "0.8rem" }}>Allow camera access. On iPhone, accept the certificate warning first.</div>
                    </>
                  ) : (<><span className="spin" /><div className="muted" style={{ marginTop: 10 }}>Starting camera & vision…</div></>)}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="controls" style={{ marginTop: 12 }}>
          <button onClick={testVoice}>🔊 Test voice</button>
          {supportsVoiceCmd && (
            <button className={listening ? "danger" : ""} onClick={testMicCommand}>
              {listening ? "⏹ Stop mic" : "🎤 Test mic"}
            </button>
          )}
          <button onClick={() => onChange({ mirror: !settings.mirror })}>🪞 Mirror: {settings.mirror ? "on" : "off"}</button>
          <button onClick={resetChecks}>↻ Reset checks</button>
          <button className="primary" onClick={onBack} disabled={!allDone}>{allDone ? "✓ Done" : "Finish checks first"}</button>
          <button className="ghost" onClick={onBack}>Back</button>
        </div>
        {supportsVoiceCmd && (listening || micStatus || heard) && (
          (micStatus?.state === "denied" || micStatus?.state === "error") ? (
            <div className="banner bad" style={{ marginTop: 8, fontSize: "0.8rem" }}>🎤 {micStatus.message}</div>
          ) : micStatus?.state === "network" ? (
            <div className="muted" style={{ marginTop: 8, fontSize: "0.78rem" }}>🎤 {micStatus.message}</div>
          ) : (
            <div className="muted" style={{ marginTop: 8, fontSize: "0.8rem" }}>
              {listening ? "🟢 Listening — " : ""}{heard ? `heard: “${heard}”` : "say “next”, “pause”, or “how many”."}
            </div>
          )
        )}
        {!supportsVoiceCmd && (
          <div className="muted" style={{ marginTop: 8, fontSize: "0.78rem" }}>
            🎤 Voice commands need a Chromium browser (Chrome/Edge); not available here.
          </div>
        )}
      </div>

      <div className="side-panel">
        <div className="card">
          <h2>System check</h2>
          <p className="muted" style={{ marginTop: 0 }}>Follow the moves so we can confirm the camera, pose tracking, rep counting, and audio all work.</p>
          <div>
            {steps.map((s) => (
              <div key={s.id} className="toggle-row">
                <div>{s.label}</div>
                <div style={{ fontSize: "1.2rem", color: checks[s.id] ? "var(--accent)" : "var(--muted)" }}>{checks[s.id] ? "✓" : "○"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Live readout</h2>
          <div className="stat-grid">
            <div className="stat"><div className="v" style={{ color: metrics.vis >= 80 ? "var(--accent)" : "var(--warn)" }}>{metrics.vis}%</div><div className="k">Body visible</div></div>
            <div className="stat"><div className="v">{metrics.fps}</div><div className="k">Tracking FPS</div></div>
            <div className="stat"><div className="v">{metrics.angle ?? "—"}{metrics.angle != null ? "°" : ""}</div><div className="k">Knee angle</div></div>
            <div className="stat"><div className="v">{reps}</div><div className="k">Test squats</div></div>
          </div>
          <div className="muted" style={{ fontSize: "0.8rem", marginTop: 10 }}>
            Aim for <b>Body visible ≥ 80%</b> and smooth FPS. If the skeleton is jumpy, improve lighting,
            step back, or switch the pose model to <b>Full</b> in Settings.
          </div>
        </div>
      </div>
    </div>
  );
}

const PRAISE = {
  framing: "Perfect — I can see your whole body.",
  armsUp: "Arms detected — nice.",
  squat: "Squat detected. Tracking looks great.",
  voice: "",
  voiceCmd: "Got it — I heard you loud and clear.",
};

