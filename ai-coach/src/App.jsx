import React, { useEffect, useState } from "react";
import { load, save } from "./lib/store.js";
import { listModels, ping } from "./lib/llm.js";
import { unlockAudio, setVoiceEnabled, setVoiceConfig } from "./lib/voice.js";
import Onboarding from "./components/Onboarding.jsx";
import ProgramView from "./components/ProgramView.jsx";
import Workout from "./components/Workout.jsx";
import Settings from "./components/Settings.jsx";
import History from "./components/History.jsx";
import Calibration from "./components/Calibration.jsx";

export default function App() {
  const [state, setState] = useState(() => load());
  const [screen, setScreen] = useState(state.program ? "program" : "setup");
  const [active, setActive] = useState(null);
  const [conn, setConn] = useState("checking");
  const [models, setModels] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { save(state); }, [state]);

  // Apply theme + UI scale globally.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
    document.documentElement.style.setProperty("--ui-scale", String(state.settings.uiScale || 1));
  }, [state.settings.theme, state.settings.uiScale]);

  // Keep the voice engine in sync app-wide (so preview/calibration respect it).
  useEffect(() => {
    setVoiceEnabled(state.settings.voice);
    setVoiceConfig({
      engine: state.settings.ttsEngine,
      kokoroVoice: state.settings.kokoroVoice,
      voiceName: state.settings.ttsVoice,
      rate: state.settings.ttsRate,
      pitch: state.settings.ttsPitch,
    });
  }, [state.settings.voice, state.settings.ttsEngine, state.settings.kokoroVoice, state.settings.ttsVoice, state.settings.ttsRate, state.settings.ttsPitch]);

  // Unlock speech synthesis on the very first user interaction (required by iOS).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  // Connection + model discovery.
  useEffect(() => {
    let alive = true;
    async function check() {
      const ok = await ping();
      if (!alive) return;
      setConn(ok ? "online" : "offline");
      if (ok) {
        const m = await listModels();
        if (!alive) return;
        setModels(m);
        if (m.length && !m.includes(state.settings.model)) {
          setState((s) => ({ ...s, settings: { ...s.settings, model: m[0] } }));
        }
      }
    }
    check();
    const id = setInterval(check, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []); // eslint-disable-line

  const setSettings = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const toggleTheme = () => setSettings({ theme: state.settings.theme === "dark" ? "light" : "dark" });

  const onProgram = (profile, program) => {
    setState((s) => ({ ...s, profile, program }));
    setScreen("program");
  };

  const startWorkout = (day) => { setActive(day); setScreen("workout"); };

  const onSessionComplete = (session) => {
    setState((s) => ({ ...s, history: [...(s.history || []), session] }));
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">AI<span className="dot">·</span>Coach</div>
        <div className="spacer" />
        <span className="pill" title={conn === "online" ? "LM Studio connected" : "LM Studio offline"}>
          <span className={`led ${conn === "online" ? "on" : conn === "offline" ? "off" : ""}`} />
          <span className="hide-sm">{conn === "online" ? "LM Studio" : conn === "offline" ? "offline" : "connecting…"}</span>
        </span>
        {state.program && screen !== "setup" && (
          <button className="ghost" onClick={() => setScreen("program")} disabled={screen === "program"}>📋<span className="hide-sm"> Program</span></button>
        )}
        {screen !== "workout" && (
          <button className="ghost" onClick={() => setScreen("calibrate")} disabled={screen === "calibrate"}>🎯<span className="hide-sm"> Calibrate</span></button>
        )}
        {(state.history?.length > 0) && (
          <button className="ghost" onClick={() => setScreen("history")} disabled={screen === "history"}>📈<span className="hide-sm"> History</span></button>
        )}
        <button className="ghost icon" title="Toggle theme" onClick={toggleTheme}>
          {state.settings.theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button className="ghost" onClick={() => setShowSettings((v) => !v)}>⚙<span className="hide-sm"> Settings</span></button>
      </div>

      {conn === "offline" && screen !== "workout" && (
        <div className="banner bad" style={{ marginBottom: 16 }}>
          Can't reach LM Studio at <b>localhost:1234</b>. You can still train with a built-in starter
          program — rep counting & form coaching run fully offline. Start LM Studio for a personalized AI plan & chat.
        </div>
      )}

      {showSettings && (
        <Settings
          settings={state.settings}
          models={models}
          onChange={setSettings}
          onReset={() => { setState((s) => ({ ...s, profile: null, program: null })); setScreen("setup"); setShowSettings(false); }}
          onClearHistory={() => setState((s) => ({ ...s, history: [] }))}
          onClose={() => setShowSettings(false)}
        />
      )}

      {screen === "setup" && (
        <Onboarding model={state.settings.model} settings={state.settings} connected={conn === "online"} initial={state.profile} onDone={onProgram} />
      )}

      {screen === "program" && state.program && (
        <ProgramView program={state.program} profile={state.profile} settings={state.settings} onStart={startWorkout} onRegenerate={() => setScreen("setup")} />
      )}

      {screen === "history" && (
        <History history={state.history || []} onBack={() => setScreen(state.program ? "program" : "setup")} />
      )}

      {screen === "calibrate" && (
        <Calibration settings={state.settings} onChange={setSettings} onBack={() => setScreen(state.program ? "program" : "setup")} />
      )}

      {screen === "workout" && active && (
        <Workout day={active} profile={state.profile} settings={state.settings} connected={conn === "online"} onComplete={onSessionComplete} onExit={() => setScreen("program")} />
      )}
    </div>
  );
}
