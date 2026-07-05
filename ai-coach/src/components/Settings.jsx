import React, { useEffect, useState } from "react";
import { speechSupported, listVoices, setVoiceConfig, previewVoice, KOKORO_VOICES, voiceStatus, onVoiceStatus, preloadVoice } from "../lib/voice.js";

function Toggle({ label, hint, on, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <div>{label}</div>
        {hint && <div className="muted" style={{ fontSize: "0.75rem" }}>{hint}</div>}
      </div>
      <div className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}><div className="knob" /></div>
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export default function Settings({ settings, models, onChange, onReset, onClearHistory, onClose }) {
  const [voices, setVoices] = useState([]);
  const [vstatus, setVstatus] = useState(voiceStatus());

  useEffect(() => {
    const refresh = () => setVoices(listVoices());
    refresh();
    const id = setInterval(refresh, 600);
    const stop = setTimeout(() => clearInterval(id), 3500);
    return () => { clearInterval(id); clearTimeout(stop); };
  }, []);

  // subscribe to neural-voice load status
  useEffect(() => onVoiceStatus((s, info) => setVstatus({ status: s, ...info })), []);

  // keep voice engine in sync with settings live
  useEffect(() => {
    setVoiceConfig({ engine: settings.ttsEngine, kokoroVoice: settings.kokoroVoice, voiceName: settings.ttsVoice, rate: settings.ttsRate, pitch: settings.ttsPitch });
  }, [settings.ttsEngine, settings.kokoroVoice, settings.ttsVoice, settings.ttsRate, settings.ttsPitch]);

  const kokoro = settings.ttsEngine === "kokoro";
  const statusText = vstatus.status === "loading" ? `Loading neural voice… ${vstatus.progress ?? 0}%`
    : vstatus.status === "ready" ? "✓ Neural voice ready"
    : vstatus.status === "error" ? "⚠ Neural voice failed — using system voice" : "";

  return (
    <div className="card fade-in" style={{ marginBottom: 16 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>

      <div className="two-col" style={{ marginTop: 8 }}>
        <div>
          <label>Appearance</label>
          <div className="row">
            <Seg value={settings.theme} onChange={(v) => onChange({ theme: v })}
              options={[{ value: "dark", label: "🌙 Dark" }, { value: "light", label: "☀️ Light" }]} />
          </div>

          <label>UI size (readable from far)</label>
          <Seg value={settings.uiScale} onChange={(v) => onChange({ uiScale: v })}
            options={[{ value: 1, label: "S" }, { value: 1.15, label: "M" }, { value: 1.3, label: "L" }, { value: 1.5, label: "XL" }]} />

          <label>Coach model (LM Studio)</label>
          {models.length ? (
            <select value={settings.model} onChange={(e) => onChange({ model: e.target.value })}>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input value={settings.model} onChange={(e) => onChange({ model: e.target.value })} />
          )}

          <label>Vision model (form photo analysis)</label>
          <select value={settings.visionModel} onChange={(e) => onChange({ visionModel: e.target.value })}>
            <option value="">Same as coach model</option>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="muted" style={{ fontSize: "0.72rem", marginTop: 4 }}>
            Pick a dedicated vision model (e.g. a *-v / vl model) for the 📷 form check.
          </div>

          <label>Pose model — your real-time form tracker</label>
          <Seg value={settings.poseModel} onChange={(v) => onChange({ poseModel: v })}
            options={[{ value: "lite", label: "Lite (fast)" }, { value: "full", label: "Full (accurate)" }]} />
        </div>

        <div>
          <label>Voice engine</label>
          <Seg value={settings.ttsEngine} onChange={(v) => { onChange({ ttsEngine: v }); if (v === "kokoro") preloadVoice(); }}
            options={[{ value: "kokoro", label: "🧠 Natural (local AI)" }, { value: "web", label: "⚡ System" }]} />

          {kokoro ? (
            <>
              <label>Coach voice (Kokoro)</label>
              <select value={settings.kokoroVoice} onChange={(e) => onChange({ kokoroVoice: e.target.value })}>
                {KOKORO_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
              {statusText && <div className="muted" style={{ fontSize: "0.75rem", marginTop: 6 }}>{statusText}</div>}
              <div className="muted" style={{ fontSize: "0.72rem", marginTop: 4 }}>
                ~80&nbsp;MB model downloads once on first use, then runs fully offline.
              </div>
            </>
          ) : (
            <>
              <label>Coach voice (system)</label>
              <select value={settings.ttsVoice} onChange={(e) => onChange({ ttsVoice: e.target.value })}>
                <option value="">OS default (most reliable)</option>
                {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
              <label>Speed: <b>{settings.ttsRate.toFixed(2)}×</b></label>
              <input type="range" min="0.7" max="1.3" step="0.05" value={settings.ttsRate} onChange={(e) => onChange({ ttsRate: Number(e.target.value) })} />
              <label>Pitch: <b>{settings.ttsPitch.toFixed(2)}</b></label>
              <input type="range" min="0.7" max="1.3" step="0.05" value={settings.ttsPitch} onChange={(e) => onChange({ ttsPitch: Number(e.target.value) })} />
            </>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary" onClick={previewVoice}>🔊 Test voice</button>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 6 }}>
        <div>
          <Toggle label="Fast responses" hint="Few-shot priming — instant coaching, no hidden reasoning (recommended)" on={settings.fastMode} onChange={(v) => onChange({ fastMode: v })} />
          <Toggle label="Spoken set feedback" hint="Instant feedback from pose data (no LLM)" on={settings.autoCoach} onChange={(v) => onChange({ autoCoach: v })} />
          <Toggle label="AI set feedback" hint="Also ask the LLM after each set (slower)" on={settings.aiSetFeedback} onChange={(v) => onChange({ aiSetFeedback: v })} />
          <Toggle label="Live AI coach" hint="Talks to you continuously & answers when you speak (needs LM Studio)" on={settings.liveAICoach} onChange={(v) => onChange({ liveAICoach: v })} />
          <Toggle label="Coach voice" hint="Spoken cues & rep feedback" on={settings.voice} onChange={(v) => onChange({ voice: v })} />
          <Toggle label="Speak rep counts" on={settings.spokenReps} onChange={(v) => onChange({ spokenReps: v })} />
        </div>
        <div>
          <Toggle label="3-2-1 count-in" on={settings.countIn} onChange={(v) => onChange({ countIn: v })} />
          <Toggle label="Big HUD" hint="Oversized rep counter" on={settings.bigHud} onChange={(v) => onChange({ bigHud: v })} />
          <Toggle label="Mirror camera" hint="Selfie view" on={settings.mirror} onChange={(v) => onChange({ mirror: v })} />
          <Toggle label="Voice commands" hint={speechSupported() ? "Say: next, pause, resume, record, finish, how to" : "Not supported in this browser (try Chrome/Edge)"} on={settings.voiceCommands && speechSupported()} onChange={(v) => onChange({ voiceCommands: v })} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 16, justifyContent: "space-between" }}>
        <button className="danger" onClick={onReset}>Reset profile & program</button>
        {onClearHistory && <button className="ghost" onClick={onClearHistory}>Clear history</button>}
      </div>
    </div>
  );
}
