import React from "react";
import CoachChat from "./CoachChat.jsx";
import { ExerciseGlyph } from "./Figure.jsx";

function ExMeta({ ex }) {
  if (ex.type === "hold") return <span className="ex-meta">{ex.sets} × {ex.holdSeconds}s hold · {ex.restSeconds}s rest</span>;
  return <span className="ex-meta">{ex.sets} × {ex.reps} reps · {ex.restSeconds}s rest</span>;
}

export default function ProgramView({ program, profile, settings, onStart, onRegenerate }) {
  return (
    <div className="program-grid fade-in">
      <div className="grid">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ marginBottom: 4 }}>{program.name}</h1>
              <p className="muted" style={{ margin: 0 }}>{program.summary}</p>
            </div>
            <button className="ghost" onClick={onRegenerate}>↻ New plan</button>
          </div>
          {program.tips?.length > 0 && (
            <ul style={{ marginTop: 14, color: "var(--muted)", lineHeight: 1.6 }}>
              {program.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </div>

        {program.days.map((day, i) => (
          <div key={i} className="card day-card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ marginBottom: 2 }}>{day.title}</h2>
                {day.focus && <span className="badge">{day.focus}</span>}
              </div>
              <button className="primary" onClick={() => onStart(day)} disabled={!day.exercises?.length}>
                ▶ Start workout
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              {day.exercises.map((ex, j) => (
                <div key={j} className="ex-row">
                  <div className="ex-thumb"><ExerciseGlyph id={ex.id} size={40} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="ex-name">{ex.name}</div>
                    <ExMeta ex={ex} />
                    {ex.notes && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{ex.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ position: "sticky", top: 16, height: "fit-content" }}>
        <h2>Coach chat</h2>
        <CoachChat profile={profile} model={settings.model} fast={settings.fastMode} height={460} />
      </div>
    </div>
  );
}
