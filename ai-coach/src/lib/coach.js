// High-level "coaching brain" built on top of the LLM + exercise catalog.
import { complete, stream, userMessage, extractJson } from "./llm.js";
import { EXERCISE_CATALOG, resolveExercise } from "./exercises.js";

const COACH_PERSONA =
  "You are Coach, an encouraging but no-nonsense personal trainer. You are concise, " +
  "practical, and safety-conscious. You never give medical advice; if the user mentions " +
  "pain or injury you suggest caution and seeing a professional.";

const catalogText = EXERCISE_CATALOG.map((e) => `- ${e.id}: ${e.name} (${e.muscles.join("/")}, ${e.equipment})`).join("\n");
const EXERCISE_IDS = EXERCISE_CATALOG.map((e) => e.id);

const PROGRAM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    daysPerWeek: { type: "integer" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          focus: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", enum: EXERCISE_IDS }, // grammar-forces a trackable exercise
                name: { type: "string" },
                sets: { type: "integer" },
                reps: { type: "integer" },
                holdSeconds: { type: "integer" },
                restSeconds: { type: "integer" },
                notes: { type: "string" },
              },
              required: ["id", "name", "sets"],
            },
          },
        },
        required: ["title", "exercises"],
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["name", "days"],
};

export async function generateProgram(profile, model, fast = true) {
  const sys =
    `${COACH_PERSONA}\n\n` +
    `Design a personalized workout PROGRAM as JSON. You MUST only prescribe exercises ` +
    `from this trackable catalog (use the exact id):\n${catalogText}\n\n` +
    `Rules:\n` +
    `- Respect the user's available equipment; if they have no dumbbells, avoid dumbbell exercises.\n` +
    `- Match volume/intensity to their experience level and goal.\n` +
    `- Provide ${profile.daysPerWeek || 3} workout days. Each day: a title, a focus, and 4-6 exercises.\n` +
    `- For rep exercises set "reps"; for "plank" set "holdSeconds" instead.\n` +
    `- Include restSeconds between sets and a short "notes" coaching cue per exercise.\n` +
    `- Add 2-4 short "tips".\n` +
    `Return ONLY the JSON object, no prose.`;

  const user =
    `Profile:\n` +
    `- Goal: ${profile.goal}\n` +
    `- Experience: ${profile.level}\n` +
    `- Days per week: ${profile.daysPerWeek}\n` +
    `- Session length: ${profile.minutes} min\n` +
    `- Available equipment: ${profile.equipment?.join(", ") || "bodyweight only"}\n` +
    `- Focus areas: ${profile.focus?.join(", ") || "full body"}\n` +
    `- Limitations/injuries: ${profile.limitations || "none"}\n`;

  const text = await complete(
    [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    {
      model,
      temperature: 0.5,
      maxTokens: 2000,
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "workout_program", strict: false, schema: PROGRAM_SCHEMA },
      },
    },
  );

  const program = extractJson(text);
  if (!program || !Array.isArray(program.days)) {
    throw new Error("The model did not return a valid program. Try again or pick a different model.");
  }
  return normalizeProgram(program);
}

// Make sure every prescribed exercise maps to a tracker we actually have.
// Models are inconsistent about field names (reps vs repetitions vs rep_count,
// restSeconds vs rest_seconds) and values ("10-12 reps", "AMRAP"), so we sniff
// the first integer out of any of the likely keys.
function normalizeProgram(program) {
  program.days = (program.days || []).map((day) => {
    day.exercises = (day.exercises || [])
      .map((ex) => {
        const def = resolveExercise(ex.id) || resolveExercise(ex.name);
        if (!def) return null;
        const isHold = def.type === "hold";
        return {
          id: def.id,
          name: def.name,
          type: def.type,
          sets: clamp(pick(ex, ["sets", "setCount", "numSets"]) ?? 3, 1, 8),
          reps: isHold ? null : clamp(pick(ex, ["reps", "repetitions", "rep", "repCount", "count"]) ?? 10, 1, 50),
          holdSeconds: isHold
            ? clamp(pick(ex, ["holdSeconds", "hold_seconds", "duration", "holdTime", "hold", "seconds", "time", "repetitions", "reps"]) ?? 30, 5, 300)
            : null,
          restSeconds: clamp(pick(ex, ["restSeconds", "rest_seconds", "rest", "restTime", "rest_sec", "rest_period"]) ?? 60, 10, 240),
          notes: ex.notes || ex.note || ex.cue || ex.tip || "",
        };
      })
      .filter(Boolean);
    return day;
  }).filter((d) => d.exercises.length);
  if (!program.days.length) throw new Error("Program had no trackable exercises. Try regenerating.");
  return program;
}

const firstInt = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const m = v.match(/\d+/); return m ? Number(m[0]) : null; }
  return null;
};
const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj[k] != null) { const n = firstInt(obj[k]); if (n != null) return n; }
  }
  return null;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(n) || lo)));

// Streamed conversational coaching. `image` optional data URL for "check my form".
export function chatCoach({ history, profile, model, image, fast = true }, onToken, signal) {
  const sys =
    `${COACH_PERSONA}\n` +
    `The user's goal is "${profile?.goal || "general fitness"}" (${profile?.level || "unknown"} level). ` +
    `Answer directly and concisely (1-3 short sentences unless asked for detail). No preamble, no "thinking out loud". ` +
    `If an image is provided, comment on their posture/form.`;
  // Few-shot prime suppresses the reasoning model's hidden chain-of-thought.
  const prime = fast ? [
    { role: "user", content: "How should I breathe during squats?" },
    { role: "assistant", content: "Inhale as you lower, brace your core, and exhale as you drive up." },
  ] : [];
  const messages = [{ role: "system", content: sys }, ...prime, ...history];
  // attach image to the latest user turn if provided
  if (image && messages.length) {
    const last = messages[messages.length - 1];
    if (last.role === "user") {
      messages[messages.length - 1] = userMessage(
        typeof last.content === "string" ? last.content : "Here's a snapshot — how's my form?",
        image,
      );
    }
  }
  return stream(messages, { model, temperature: 0.7, maxTokens: fast ? 600 : 1200, signal }, onToken);
}

// INSTANT, offline, rule-based set feedback derived purely from the pose
// engine's measurements — no LLM needed. This handles the common case so the
// LLM is reserved for things it's actually better at (chat, program design).
const FAULT_LINES = {
  lean: ["Watch the forward lean — chest up next set.", "Keep your torso tall; don't fold forward."],
  line: ["Keep your body in one straight line — brace your core.", "No sagging or piking — tight core throughout."],
  toohigh: ["Control it — stop right at shoulder height.", "Lead with the elbows, no swinging past the shoulders."],
  sag: ["Lift those hips — don't let them drop.", "Squeeze your glutes to keep the hips up."],
  pike: ["Drop your hips a touch to flatten out.", "Lower the hips so you're in a straight line."],
};
const PRAISE_LINES = ["Excellent set — that form was dialed in.", "Beautiful work, really clean reps.", "Strong and controlled — exactly right.", "That's textbook. Keep it up."];
const ENCOURAGE = ["Solid set. Keep that rhythm going.", "Good work — stay focused on control.", "Nice effort. Breathe and reset.", "Well done — let's keep building."];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

export function localSetFeedback(summary) {
  const { reps = 0, holdSeconds = 0, shallowReps = 0, fullRangeReps = 0, formScore = 100, faults = [], type } = summary;
  const topFault = [...(faults || [])].sort((a, b) => b.frames - a.frames)[0];
  if (topFault && FAULT_LINES[topFault.id]) return pickOne(FAULT_LINES[topFault.id]);
  if (type !== "hold" && shallowReps > 0 && shallowReps >= Math.max(2, reps * 0.34))
    return `${fullRangeReps} of ${reps} hit full depth — aim for full range on every rep next set.`;
  if (formScore >= 90) return pickOne(PRAISE_LINES);
  if (type === "hold") return holdSeconds >= 20 ? "Rock-solid hold — great core stability." : "Good hold — try to add a few seconds next round.";
  return pickOne(ENCOURAGE);
}

// One short, spoken-friendly reaction to a completed set (LLM — optional/deeper).
export async function setFeedback(summary, profile, model, fast = true) {
  const sys =
    `${COACH_PERSONA} Respond with ONE or TWO short sentences suitable to be spoken aloud. ` +
    `Be specific about what to improve next set, or celebrate good work. No markdown, no lists.`;
  const user =
    `I just finished a set. Here is the data:\n${JSON.stringify(summary)}\n` +
    `Goal: ${profile?.goal || "general fitness"}. Give me quick coaching.`;
  const prime = fast ? [
    { role: "user", content: 'I just finished a set: {"exercise":"Squat","reps":12,"shallowReps":0,"formScore":95}. Give me quick coaching.' },
    { role: "assistant", content: "Excellent depth on every rep — that's exactly how it's done. Keep it up." },
  ] : [];
  const fallback = summary.shallowReps > summary.fullRangeReps
    ? "Good work — focus on a fuller range of motion next set."
    : "Nice set! Keep that form and take your rest.";
  try {
    const txt = await complete(
      [{ role: "system", content: sys }, ...prime, { role: "user", content: user }],
      { model, temperature: 0.7, maxTokens: fast ? 160 : 500 },
    );
    return txt && txt.trim() ? txt.trim() : fallback;
  } catch {
    return fallback; // offline / model error
  }
}

// Detailed multimodal form critique from a single frame + measured metrics.
export async function analyzeForm({ image, metrics, exerciseName, profile, model, fast = true }) {
  const sys =
    `${COACH_PERSONA} You are reviewing a single photo of the user mid-exercise, plus measured ` +
    `joint metrics. Reply DIRECTLY to the user as their coach (no meta-commentary, no "the user asked"). ` +
    `Give: 1) what looks good, 2) the top 1-2 things to fix, 3) one cue to remember. Under 100 words.`;
  // Text prime nudges the model to answer directly instead of narrating its reasoning.
  const prime = fast ? [
    { role: "user", content: "Exercise: Plank. How's my form?" },
    { role: "assistant", content: "Good news: your back is flat and shoulders stacked. Fix: let your hips drop slightly so you're in one line. Cue: squeeze glutes and brace." },
  ] : [];
  const user = userMessage(
    `Exercise: ${exerciseName}. Measured metrics: ${JSON.stringify(metrics)}. ` +
      `My goal is ${profile?.goal || "general fitness"}. How's my form?`,
    image,
  );
  const txt = await complete([{ role: "system", content: sys }, ...prime, user], { model, temperature: 0.5, maxTokens: fast ? 400 : 700 });
  return txt && txt.trim() ? txt : "I couldn't read that frame clearly — make sure your whole body is lit and in view, then try again.";
}
