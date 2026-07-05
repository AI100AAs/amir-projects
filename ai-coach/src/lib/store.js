// localStorage-backed persistence for profile, program, settings, history.
const KEY = "ai-coach-v2"; // bumped so new defaults (e2b, live coaching) apply

const defaults = {
  profile: null,
  program: null,
  history: [], // completed sessions
  settings: {
    model: "google/gemma-4-e2b-qat",    // fast default: program design + chat + live cues
    visionModel: "",                    // "" = use main model for vision form checks
    poseModel: "lite",
    voice: true,
    voiceCommands: false,
    mirror: true,
    autoCoach: true,     // speak feedback after each set (instant, rule-based)
    aiSetFeedback: false, // ALSO ask the LLM for richer set feedback (slower)
    liveAICoach: true,   // continuous conversational LLM coach (narrates + listens)
    fastMode: true,      // few-shot priming = instant responses (no hidden reasoning)
    theme: "dark",       // "dark" | "light"
    uiScale: 1,          // 1 | 1.15 | 1.3 | 1.5
    bigHud: true,        // oversized rep counter (readable from far)
    ttsEngine: "kokoro", // "kokoro" (neural, local) | "web" (OS voices)
    kokoroVoice: "af_heart",
    ttsVoice: "",        // system voice name ("" = OS default; used when engine="web")
    ttsRate: 1.0,
    ttsPitch: 1.0,
    spokenReps: true,    // speak each rep number
    countIn: true,       // 3-2-1 count-in before sets
  },
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaults),
      ...parsed,
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      history: parsed.history || [],
    };
  } catch {
    return structuredClone(defaults);
  }
}

export function save(state) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        profile: state.profile,
        program: state.program,
        settings: state.settings,
        history: (state.history || []).slice(-50), // cap stored history
      }),
    );
  } catch {
    /* quota / private mode — ignore */
  }
}
