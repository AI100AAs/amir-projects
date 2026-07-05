import React from "react";

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function fmtDur(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}

export default function History({ history, onBack }) {
  const sessions = [...history].reverse();
  const totals = history.reduce((a, s) => ({
    workouts: a.workouts + 1,
    reps: a.reps + (s.totalReps || 0),
    minutes: a.minutes + Math.round((s.durationSec || 0) / 60),
  }), { workouts: 0, reps: 0, minutes: 0 });
  const avgForm = history.length ? Math.round(history.reduce((a, s) => a + (s.avgForm || 0), 0) / history.length) : 0;

  return (
    <div className="grid fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ margin: 0 }}>Your progress 📈</h1>
          <button className="ghost" onClick={onBack}>← Back</button>
        </div>
        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat"><div className="v">{totals.workouts}</div><div className="k">Workouts</div></div>
          <div className="stat"><div className="v">{totals.reps}</div><div className="k">Total reps</div></div>
          <div className="stat"><div className="v">{totals.minutes}</div><div className="k">Active minutes</div></div>
          <div className="stat"><div className="v">{avgForm}</div><div className="k">Avg form score</div></div>
        </div>
      </div>

      {sessions.length === 0 && <div className="card muted">No sessions yet — finish a workout and it'll show up here.</div>}

      {sessions.map((s, i) => (
        <div key={i} className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <h2 style={{ margin: 0 }}>{s.dayTitle || "Workout"}</h2>
              <div className="muted" style={{ fontSize: "0.82rem" }}>{fmtDate(s.date)} · {fmtDur(s.durationSec || 0)} · ~{s.kcal || 0} kcal</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--accent)" }}>{s.totalReps || 0}</div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>reps · form {s.avgForm || 0}</div>
            </div>
          </div>
          {s.exercises?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {s.exercises.map((e, j) => (
                <div key={j} className="ex-row">
                  <div style={{ flex: 1 }} className="ex-name">{e.name}</div>
                  <div className="ex-meta">
                    {e.sets} sets · {e.holdSec ? `${e.holdSec}s hold` : `${e.reps} reps`} · form {e.bestForm}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
