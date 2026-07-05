import React, { useState } from "react";
import { generateProgram } from "../lib/coach.js";
import { buildStarterProgram } from "../lib/starterPrograms.js";
import { CoachHero } from "./Figure.jsx";

const GOALS = ["Lose fat", "Build muscle", "Get stronger", "General fitness", "Improve mobility", "Endurance"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT = ["Dumbbells", "Resistance bands", "Pull-up bar", "Bench", "Kettlebell"];
const FOCUS = ["Full body", "Upper body", "Lower body", "Core", "Glutes", "Arms"];

function MultiChips({ options, value, onToggle }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <div key={o} className={`chip ${value.includes(o) ? "sel" : ""}`} onClick={() => onToggle(o)}>
          {o}
        </div>
      ))}
    </div>
  );
}

export default function Onboarding({ model, settings, connected, initial, onDone }) {
  const [goal, setGoal] = useState(initial?.goal || "Build muscle");
  const [level, setLevel] = useState(initial?.level || "Beginner");
  const [daysPerWeek, setDays] = useState(initial?.daysPerWeek || 3);
  const [minutes, setMinutes] = useState(initial?.minutes || 30);
  const [equipment, setEquipment] = useState(initial?.equipment || []);
  const [focus, setFocus] = useState(initial?.focus || ["Full body"]);
  const [limitations, setLimitations] = useState(initial?.limitations || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (arr, set, v) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const profileNow = () => ({ goal, level, daysPerWeek: Number(daysPerWeek), minutes: Number(minutes), equipment, focus, limitations });

  async function submit() {
    setError(null);
    if (!connected) {
      useStarter();
      return;
    }
    const profile = profileNow();
    setBusy(true);
    try {
      const program = await generateProgram(profile, model, settings?.fastMode ?? true);
      onDone(profile, program);
    } catch (e) {
      setError((e.message || "Failed to generate program.") + " — using a built-in starter plan instead.");
      const profile2 = profileNow();
      onDone(profile2, buildStarterProgram(profile2));
    } finally {
      setBusy(false);
    }
  }

  function useStarter() {
    const profile = profileNow();
    onDone(profile, buildStarterProgram(profile));
  }

  return (
    <div className="grid fade-in" style={{ maxWidth: 880, margin: "0 auto" }}>
      <div className="hero card">
        <div className="hero-art"><CoachHero height={210} /></div>
        <div className="hero-copy">
          <div className="eyebrow">AI PERSONAL TRAINER</div>
          <h1 className="hero-title">Train with a coach that<br /><span className="grad">watches every rep.</span></h1>
          <p className="muted" style={{ maxWidth: 440 }}>
            Your camera becomes a form coach — it counts your reps, scores your technique,
            and talks you through the set in real time. 100% on your machine.
          </p>
          <div className="hero-feats">
            <div className="feat"><span className="fi">◎</span> Live rep counting &amp; form scoring</div>
            <div className="feat"><span className="fi">◍</span> A coach that speaks &amp; listens</div>
            <div className="feat"><span className="fi">⤓</span> Private &amp; offline — nothing uploaded</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.25rem" }}>Build your program</h2>
        <p className="muted" style={{ marginTop: 0 }}>Tell your coach about your goals — it designs a plan, then
          watches your webcam to count reps and correct form in real time.</p>

        <div className="two-col">
          <div>
            <label>Primary goal</label>
            <div className="chips">
              {GOALS.map((g) => (
                <div key={g} className={`chip ${goal === g ? "sel" : ""}`} onClick={() => setGoal(g)}>{g}</div>
              ))}
            </div>

            <label>Experience level</label>
            <div className="chips">
              {LEVELS.map((l) => (
                <div key={l} className={`chip ${level === l ? "sel" : ""}`} onClick={() => setLevel(l)}>{l}</div>
              ))}
            </div>

            <label>Focus areas</label>
            <MultiChips options={FOCUS} value={focus} onToggle={(v) => toggle(focus, setFocus, v)} />
          </div>

          <div>
            <label>Days per week: <b>{daysPerWeek}</b></label>
            <input type="range" min="1" max="6" value={daysPerWeek} onChange={(e) => setDays(e.target.value)} />

            <label>Session length: <b>{minutes} min</b></label>
            <input type="range" min="10" max="75" step="5" value={minutes} onChange={(e) => setMinutes(e.target.value)} />

            <label>Available equipment</label>
            <MultiChips options={EQUIPMENT} value={equipment} onToggle={(v) => toggle(equipment, setEquipment, v)} />
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>None selected = bodyweight only.</div>

            <label>Injuries / limitations (optional)</label>
            <textarea rows={2} value={limitations} onChange={(e) => setLimitations(e.target.value)}
              placeholder="e.g. bad left knee, avoid jumping" />
          </div>
        </div>

        {error && <div className="banner bad" style={{ marginTop: 16 }}>{error}</div>}

        <div className="row" style={{ marginTop: 18 }}>
          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? <><span className="spin" /> &nbsp;Designing your program…</>
              : connected ? "Generate my program →" : "Use built-in starter plan →"}
          </button>
          {connected && <button className="ghost" onClick={useStarter} disabled={busy}>Quick starter plan</button>}
          {!connected && <span className="muted">LM Studio offline — starter plan still tracks every rep</span>}
        </div>
      </div>
    </div>
  );
}
