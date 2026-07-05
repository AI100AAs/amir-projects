// Offline-capable program builder. Produces the same normalized shape as the
// LLM path so the app is fully usable with no model loaded.
import { EXERCISE_BY_ID } from "./exercises.js";

const repFor = (level, base) => {
  const mult = level === "Advanced" ? 1.4 : level === "Intermediate" ? 1.15 : 1;
  return Math.round(base * mult);
};
const setsFor = (level) => (level === "Advanced" ? 4 : level === "Intermediate" ? 3 : 3);

function ex(id, { reps, hold, rest = 60, notes = "" }, level) {
  const def = EXERCISE_BY_ID[id];
  return {
    id, name: def.name, type: def.type,
    sets: setsFor(level),
    reps: def.type === "hold" ? null : repFor(level, reps ?? 10),
    holdSeconds: def.type === "hold" ? (hold ?? 30) : null,
    restSeconds: rest,
    notes: notes || def.cues[0],
  };
}

export function buildStarterProgram(profile) {
  const level = profile?.level || "Beginner";
  const hasDb = (profile?.equipment || []).some((e) => /dumbbell|kettlebell|band/i.test(e));
  const goal = profile?.goal || "General fitness";

  // Bodyweight vs equipment day templates
  const lower = [ex("squat", { reps: 12, notes: "Sit back, knees tracking over toes." }, level),
                 ex("lunge", { reps: 10, notes: "Drop the back knee, stay tall." }, level),
                 ex("glute_bridge", { reps: 14 }, level),
                 ex("plank", { hold: 30 }, level)];
  const upper = hasDb
    ? [ex("pushup", { reps: 10 }, level), ex("shoulder_press", { reps: 10 }, level),
       ex("bicep_curl", { reps: 12 }, level), ex("lateral_raise", { reps: 12 }, level), ex("crunch", { reps: 15 }, level)]
    : [ex("pushup", { reps: 10 }, level), ex("crunch", { reps: 15 }, level),
       ex("plank", { hold: 40 }, level), ex("glute_bridge", { reps: 15 }, level)];
  const cardio = [ex("jumping_jack", { reps: 30, rest: 40 }, level), ex("squat", { reps: 15, rest: 40 }, level),
                  ex("lunge", { reps: 12, rest: 40 }, level), ex("crunch", { reps: 18, rest: 40 }, level)];

  const templates = [
    { title: "Day 1 · Lower Body", focus: "Legs & glutes", exercises: lower },
    { title: "Day 2 · Upper Body & Core", focus: hasDb ? "Push/pull + core" : "Push & core", exercises: upper },
    { title: "Day 3 · Full Body & Cardio", focus: "Conditioning", exercises: cardio },
  ];

  const n = Math.min(Math.max(profile?.daysPerWeek || 3, 1), 6);
  const days = Array.from({ length: n }, (_, i) => structuredClone(templates[i % templates.length]))
    .map((d, i) => ({ ...d, title: d.title.replace(/Day \d+/, `Day ${i + 1}`) }));

  return {
    name: `${goal} · Starter Plan`,
    summary: `A balanced ${n}-day ${hasDb ? "" : "bodyweight "}plan built in for offline use. Tracks every rep and your form automatically.`,
    daysPerWeek: n,
    days,
    tips: [
      "Warm up 3-5 minutes before starting.",
      "Quality over quantity — full range of motion beats more reps.",
      "Rest as prescribed; progress by adding reps or sets weekly.",
      "Connect LM Studio anytime for a fully personalized AI program.",
    ],
    _offline: true,
  };
}
