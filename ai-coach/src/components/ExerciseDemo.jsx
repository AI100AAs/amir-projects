// A self-contained "how to do it" panel: an animated stick figure looping the
// movement (drawn locally from keyframe poses — no network), the numbered steps,
// a one-line cue, and an optional link to a real human demo on YouTube.
import React, { useEffect, useRef } from "react";
import { demoFor, youtubeUrl, BONES, JOINTS } from "../lib/exerciseDemos.js";

export default function ExerciseDemo({ exercise, onClose }) {
  const demo = demoFor(exercise?.id);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!demo) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#39d98a";
    const start = performance.now();
    // Slower for holds (gentle breathing), a steady tempo for reps.
    const period = demo.isHold ? 4200 : 2300;

    const lerp = (a, b, t) => a + (b - a) * t;
    const draw = (now) => {
      // Ease rest → active → rest with a cosine so the motion accelerates and
      // decelerates naturally at the turnarounds.
      const phase = ((now - start) % period) / period;       // 0..1
      const t = (1 - Math.cos(phase * 2 * Math.PI)) / 2;      // 0→1→0

      ctx.clearRect(0, 0, W, H);
      const sx = (x) => (x / 100) * W;
      const sy = (y) => (y / 100) * H;
      const cur = {};
      for (const j of JOINTS) {
        const a = demo.rest[j], b = demo.active[j];
        cur[j] = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
      }
      // bones
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(3, W * 0.018);
      ctx.beginPath();
      for (const [p, q] of BONES) {
        ctx.moveTo(sx(cur[p][0]), sy(cur[p][1]));
        ctx.lineTo(sx(cur[q][0]), sy(cur[q][1]));
      }
      ctx.stroke();
      // head
      const [hx, hy] = cur.head;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(sx(hx), sy(hy), Math.max(6, W * 0.04), 0, Math.PI * 2);
      ctx.fill();
      // floor line for grounding
      ctx.strokeStyle = "rgba(127,127,127,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H - 4); ctx.lineTo(W, H - 4); ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [demo]);

  if (!demo) return null;

  return (
    <div className="demo-overlay" onClick={onClose}>
      <div className="demo-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>How to: {exercise.name}</h2>
          <button className="ghost" onClick={onClose}>✕ Close</button>
        </div>
        <div className="demo-body">
          <div className="demo-anim">
            <canvas ref={canvasRef} width={240} height={240} />
            <div className="muted" style={{ fontSize: "0.75rem", textAlign: "center", marginTop: 6 }}>
              📷 {demo.view}
            </div>
          </div>
          <div className="demo-text">
            <ol style={{ margin: "0 0 10px", paddingLeft: 20, lineHeight: 1.6 }}>
              {demo.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <div className="demo-cue">💡 {demo.cue}</div>
            <a className="demo-yt" href={youtubeUrl(demo.youtube)} target="_blank" rel="noreferrer">
              ▶ Watch a real demo on YouTube
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
