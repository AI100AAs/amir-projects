// Lightweight, fully-local figure graphics built from the same stick-figure
// keyframes that power the "how to" demos — so the visual identity is consistent
// and we never ship a stock illustration. Two exports:
//   • <ExerciseGlyph id> — a small static SVG silhouette of an exercise.
//   • <CoachHero />      — an animated canvas cycling through a few moves.
import React, { useEffect, useRef } from "react";
import { DEMOS, BONES, JOINTS } from "../lib/exerciseDemos.js";

// Build the SVG path data for a pose (lines for bones).
function bonesPath(p) {
  return BONES.map(([a, b]) => `M${p[a][0]} ${p[a][1]} L${p[b][0]} ${p[b][1]}`).join(" ");
}

export function ExerciseGlyph({ id, size = 46, phase = "active", className = "" }) {
  const demo = DEMOS[id];
  if (!demo) return null;
  const p = demo[phase] || demo.active;
  const [hx, hy] = p.head;
  return (
    <svg className={`ex-glyph ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path d={bonesPath(p)} fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={hx} cy={hy} r="6.5" fill="currentColor" />
    </svg>
  );
}

// A looping athlete that runs through several exercises — used as the hero art.
const HERO_SEQ = ["squat", "pushup", "jumping_jack", "lunge", "shoulder_press"];

export function CoachHero({ height = 200 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#ff6a2c";
    const accent2 = css.getPropertyValue("--accent-2").trim() || "#ffb43d";
    const start = performance.now();
    const repMs = 1500;          // one rep
    const repsPer = 3;            // reps per exercise before switching
    const lerp = (a, b, t) => a + (b - a) * t;

    const draw = (now) => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);
      const elapsed = now - start;
      const blockMs = repMs * repsPer;
      const seqIndex = Math.floor(elapsed / blockMs) % HERO_SEQ.length;
      const demo = DEMOS[HERO_SEQ[seqIndex]];
      const within = (elapsed % blockMs);
      const repPhase = (within % repMs) / repMs;
      const t = (1 - Math.cos(repPhase * 2 * Math.PI)) / 2;
      // fade in/out at the block edges so exercise swaps aren't jarring
      const edge = 220;
      const fade = Math.min(1, within / edge, (blockMs - within) / edge);

      // layout: figure centered, scaled to height
      const scale = (H * 0.8) / 100;
      const offX = W / 2 - 50 * scale;
      const offY = H * 0.1;
      const sx = (x) => offX + x * scale;
      const sy = (y) => offY + y * scale;

      const cur = {};
      for (const j of JOINTS) cur[j] = [lerp(demo.rest[j][0], demo.active[j][0], t), lerp(demo.rest[j][1], demo.active[j][1], t)];

      // soft glow disc behind the athlete
      const g = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, H * 0.6);
      g.addColorStop(0, hexA(accent, 0.16 * fade));
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.globalAlpha = fade;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(4, scale * 5.5);
      const grad = ctx.createLinearGradient(0, offY, 0, offY + 100 * scale);
      grad.addColorStop(0, accent2);
      grad.addColorStop(1, accent);
      ctx.strokeStyle = grad;
      ctx.beginPath();
      for (const [a, b] of BONES) { ctx.moveTo(sx(cur[a][0]), sy(cur[a][1])); ctx.lineTo(sx(cur[b][0]), sy(cur[b][1])); }
      ctx.stroke();
      ctx.fillStyle = accent2;
      ctx.beginPath();
      ctx.arc(sx(cur.head[0]), sy(cur.head[1]), scale * 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="hero-canvas" style={{ height }} />;
}

// "#rrggbb" + alpha → rgba()
function hexA(hex, a) {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(n.slice(0, 2), 16) || 255, g = parseInt(n.slice(2, 4), 16) || 106, b = parseInt(n.slice(4, 6), 16) || 44;
  return `rgba(${r},${g},${b},${a})`;
}
