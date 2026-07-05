// Exercise library. Each entry defines how to read the rep angle, where the
// "rest" and "active" zones are, the full-range-of-motion target, the right
// camera view, and rule-based form checks that produce coaching cues.
import {
  kneeAngle, frontKneeAngle, elbowAngle, shoulderAbduction, hipAngle,
  bodyLineAngle, torsoLean,
} from "./geometry.js";

// severity: "info" (good), "warn" (fix this), "good" (positive reinforcement)
const issue = (id, msg, severity = "warn") => ({ id, msg, severity });

export const EXERCISES = [
  {
    id: "squat",
    name: "Bodyweight Squat",
    type: "reps",
    view: "front",
    muscles: ["quads", "glutes", "core"],
    equipment: "none",
    cues: ["Feet shoulder-width", "Sit back and down", "Chest up", "Drive through heels"],
    getAngle: kneeAngle,
    rep: { rest: 160, active: 110, activeIsLow: true, romTarget: 95 },
    romMessage: "Go deeper — aim to get your thighs parallel to the floor.",
    formChecks: (lm) => {
      const out = [];
      const lean = torsoLean(lm);
      if (lean != null && lean > 55) out.push(issue("lean", "Keep your chest up — you're leaning too far forward."));
      return out;
    },
  },
  {
    id: "pushup",
    name: "Push-up",
    type: "reps",
    view: "side",
    muscles: ["chest", "triceps", "shoulders", "core"],
    equipment: "none",
    cues: ["Hands under shoulders", "Body in a straight line", "Lower until elbows ~90°", "Push the floor away"],
    getAngle: elbowAngle,
    rep: { rest: 155, active: 100, activeIsLow: true, romTarget: 95 },
    romMessage: "Lower further — bend your elbows to about 90 degrees.",
    formChecks: (lm) => {
      const out = [];
      const body = bodyLineAngle(lm);
      if (body != null && body < 158) out.push(issue("line", "Keep a straight line — don't let your hips sag or pike."));
      return out;
    },
  },
  {
    id: "bicep_curl",
    name: "Bicep Curl",
    type: "reps",
    view: "front",
    muscles: ["biceps"],
    equipment: "dumbbells",
    cues: ["Elbows tucked at your sides", "Curl all the way up", "Lower under control", "Full extension at the bottom"],
    getAngle: elbowAngle,
    rep: { rest: 150, active: 60, activeIsLow: true, romTarget: 55 },
    romMessage: "Squeeze higher at the top and fully extend at the bottom.",
    formChecks: () => [],
  },
  {
    id: "shoulder_press",
    name: "Overhead Shoulder Press",
    type: "reps",
    view: "front",
    muscles: ["shoulders", "triceps"],
    equipment: "dumbbells",
    cues: ["Start at shoulder height", "Press straight overhead", "Don't flare elbows", "Lower with control"],
    getAngle: elbowAngle,
    rep: { rest: 160, active: 95, activeIsLow: true, romTarget: 150 },
    romMessage: "Press all the way up until your arms are straight overhead.",
    formChecks: () => [],
  },
  {
    id: "lateral_raise",
    name: "Lateral Raise",
    type: "reps",
    view: "front",
    muscles: ["shoulders"],
    equipment: "dumbbells",
    cues: ["Arms slightly bent", "Raise out to your sides", "Stop at shoulder height", "Lower slowly"],
    getAngle: shoulderAbduction,
    rep: { rest: 30, active: 75, activeIsLow: false, romTarget: 70 },
    romMessage: "Raise your arms up to shoulder height.",
    formChecks: (lm) => {
      const out = [];
      const ab = shoulderAbduction(lm);
      if (ab != null && ab > 115) out.push(issue("toohigh", "Don't swing too high — stop at shoulder height."));
      return out;
    },
  },
  {
    id: "lunge",
    name: "Forward Lunge",
    type: "reps",
    view: "side",
    muscles: ["quads", "glutes"],
    equipment: "none",
    cues: ["Step forward", "Drop your back knee toward the floor", "Front knee over ankle", "Push back to start"],
    getAngle: frontKneeAngle,
    rep: { rest: 155, active: 110, activeIsLow: true, romTarget: 100 },
    romMessage: "Drop lower — aim for a 90-degree bend in your front knee.",
    formChecks: () => [],
  },
  {
    id: "glute_bridge",
    name: "Glute Bridge",
    type: "reps",
    view: "side",
    muscles: ["glutes", "hamstrings"],
    equipment: "none",
    cues: ["Lie on your back, knees bent", "Drive hips up", "Squeeze your glutes at the top", "Lower with control"],
    getAngle: hipAngle,
    rep: { rest: 130, active: 165, activeIsLow: false, romTarget: 160 },
    romMessage: "Drive your hips higher and squeeze your glutes at the top.",
    formChecks: () => [],
  },
  {
    id: "crunch",
    name: "Crunch",
    type: "reps",
    view: "side",
    muscles: ["abs"],
    equipment: "none",
    cues: ["Lie back, knees bent", "Curl your shoulders up", "Don't pull your neck", "Lower slowly"],
    getAngle: hipAngle,
    rep: { rest: 150, active: 120, activeIsLow: true, romTarget: 125 },
    romMessage: "Curl up a little higher to fully engage your abs.",
    formChecks: () => [],
  },
  {
    id: "jumping_jack",
    name: "Jumping Jacks",
    type: "reps",
    view: "front",
    muscles: ["full body", "cardio"],
    equipment: "none",
    cues: ["Jump feet out", "Arms overhead", "Stay light on your feet", "Find a rhythm"],
    getAngle: shoulderAbduction,
    rep: { rest: 40, active: 120, activeIsLow: false, romTarget: 110 },
    romMessage: "Bring your arms all the way up overhead.",
    formChecks: () => [],
  },
  {
    id: "plank",
    name: "Plank",
    type: "hold",
    view: "side",
    muscles: ["core"],
    equipment: "none",
    cues: ["Forearms under shoulders", "Straight line head to heels", "Brace your abs", "Breathe"],
    getAngle: bodyLineAngle,
    hold: { goodMin: 165, goodMax: 195 },
    formChecks: (lm) => {
      const out = [];
      const body = bodyLineAngle(lm);
      if (body != null && body < 162) out.push(issue("sag", "Lift your hips — don't let them sag.", "warn"));
      else if (body != null && body > 198) out.push(issue("pike", "Drop your hips a bit — you're piking up.", "warn"));
      return out;
    },
  },
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

// Compact catalog handed to the LLM so it only prescribes exercises we can track.
export const EXERCISE_CATALOG = EXERCISES.map((e) => ({
  id: e.id,
  name: e.name,
  muscles: e.muscles,
  equipment: e.equipment,
}));

// Resolve an exercise the LLM referenced, by id first then fuzzy name match.
export function resolveExercise(ref) {
  if (!ref) return null;
  const key = String(ref).toLowerCase().trim();
  if (EXERCISE_BY_ID[key]) return EXERCISE_BY_ID[key];
  const norm = key.replace(/[^a-z]/g, "");
  return (
    EXERCISES.find((e) => e.id.replace(/[^a-z]/g, "") === norm) ||
    EXERCISES.find((e) => e.name.toLowerCase().replace(/[^a-z]/g, "") === norm) ||
    EXERCISES.find((e) => e.name.toLowerCase().includes(key) || key.includes(e.id)) ||
    null
  );
}
