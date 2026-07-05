// Soft-constraint interpreter.
//
// Turns a free-text request like "I want a calming walk that stays in the shade"
// into structured navigation parameters the router understands.
//
// Backends (selected via LLM_PROVIDER env, default "auto"):
//   - lmstudio : an OpenAI-compatible local server (LM Studio, Ollama, etc.)
//   - claude   : the Anthropic Messages API
//   - rules    : a deterministic keyword interpreter (always available)
//
// "auto" tries lmstudio, then claude, then rules — so a local model is used
// when present, and the app still works with no model at all.
//
// Shared output schema (the contract with the router), produced by normalize():
//   preferences: { scenic, shade, quiet, accessible, avoidBusy }  // 0..1 strengths
//   efficiency:  0..1   // 1 = "just get me there", 0 = "take all the time you want"
//   mood:        short label
//   rationale:   one-sentence explanation shown to the user
//   warnings:    [string]  // honesty about the limits of soft constraints (ethics)
//   source:      which backend produced it
//   model:       model id, when an LLM was used

const PREF_KEYS = ["scenic", "shade", "quiet", "accessible", "avoidBusy"];

const ATTRIBUTE_GLOSSARY = `Available soft constraints (each a strength from 0 to 1):
- scenic:     prefer paths past gardens, ocean/forest views, landmarks.
- shade:      prefer tree-lined / covered paths (sun or rain protection).
- quiet:      prefer calm, low-traffic, peaceful paths.
- accessible: prefer step-free, gentle-grade, wheelchair/mobility-friendly paths.
- avoidBusy:  actively steer away from crowded plazas and vehicle roads.
efficiency (0 to 1): how much the user wants the SHORTEST route.
  1.0 = "fastest, I'm in a hurry"; 0.2 = "wander, I have time".`;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function lmstudioConfig() {
  return {
    baseUrl: (process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1").replace(/\/$/, ""),
    model: process.env.LMSTUDIO_MODEL || "google/gemma-4-e4b",
    apiKey: process.env.LMSTUDIO_API_KEY || "lm-studio",
  };
}
function claudeConfig() {
  return {
    baseUrl: (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, ""),
    model: process.env.INTERPRET_MODEL || "claude-haiku-4-5-20251001",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  };
}

// Ordered list of backends to attempt, based on LLM_PROVIDER.
function backendOrder() {
  const p = (process.env.LLM_PROVIDER || "auto").toLowerCase();
  if (p === "lmstudio") return ["lmstudio"];
  if (p === "claude") return ["claude"];
  if (p === "rules" || p === "rule-based" || p === "none") return [];
  // auto
  const order = ["lmstudio"];
  if (claudeConfig().apiKey) order.push("claude");
  return order;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp01(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Robustly pull a JSON object out of a model's reply (handles code fences,
// trailing commas, and surrounding prose — common with small local models).
function extractJson(text) {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  let candidate = s.slice(start, end + 1);
  for (const attempt of [candidate, candidate.replace(/,\s*([}\]])/g, "$1")]) {
    try {
      return JSON.parse(attempt);
    } catch {
      /* try next */
    }
  }
  return null;
}

// Coerce any partial / messy object into the strict schema the router expects.
function normalize(raw, meta) {
  const prefsIn = (raw && raw.preferences) || {};
  const preferences = {};
  for (const k of PREF_KEYS) preferences[k] = clamp01(prefsIn[k]);

  const efficiency =
    raw && typeof raw.efficiency === "number" ? clamp01(raw.efficiency) : 0.5;

  const warnings = Array.isArray(raw && raw.warnings)
    ? raw.warnings.filter((w) => typeof w === "string" && w.trim()).slice(0, 4)
    : [];

  // Ethics-aware safety note: a strong "quiet" preference can route people
  // through isolated areas. Surface that tension instead of hiding it.
  if (preferences.quiet >= 0.6 && !warnings.some((w) => /isolat|alone|night|safe|lit/i.test(w))) {
    warnings.push(
      "Quiet paths can also be isolated. After dark or if you'd rather not be alone, prefer a busier, well-lit route."
    );
  }

  return {
    preferences,
    efficiency,
    mood: typeof (raw && raw.mood) === "string" ? raw.mood.slice(0, 40) : "balanced",
    rationale:
      typeof (raw && raw.rationale) === "string" && raw.rationale.trim()
        ? raw.rationale.slice(0, 240)
        : "Balancing distance with your stated preferences.",
    warnings,
    source: meta.source,
    model: meta.model || null,
  };
}

async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildSystemPrompt() {
  return `You translate a person's free-text walking request on a university campus into structured navigation parameters.
${ATTRIBUTE_GLOSSARY}

Respond with ONLY a JSON object, no prose, of exactly this shape:
{
  "preferences": { "scenic": 0-1, "shade": 0-1, "quiet": 0-1, "accessible": 0-1, "avoidBusy": 0-1 },
  "efficiency": 0-1,
  "mood": "<2-3 word label>",
  "rationale": "<one short sentence to show the user>",
  "warnings": ["<optional honesty note about ambiguity or safety>"]
}
Be conservative: only raise a preference well above 0 when the text genuinely implies it. Soft constraints are subjective, so if the request is vague, add a warning saying so.`;
}

// ---------------------------------------------------------------------------
// Rule-based fallback
// ---------------------------------------------------------------------------
const KEYWORDS = {
  scenic: ["scenic", "scenery", "view", "views", "beautiful", "pretty", "garden", "gardens", "ocean", "sea", "sunset", "nice walk", "rose", "flowers", "nature", "nice route", "sightsee"],
  shade: ["shade", "shady", "shaded", "tree", "trees", "cover", "covered", "out of the sun", "rain", "sheltered", "sunny day", "hot", "sunburn"],
  quiet: ["quiet", "calm", "calming", "peaceful", "relax", "relaxing", "chill", "serene", "tranquil", "decompress", "anxious", "anxiety", "stress", "destress", "de-stress", "clear my head", "alone", "think", "meditat"],
  accessible: ["accessible", "accessibility", "wheelchair", "step-free", "stepfree", "no stairs", "avoid stairs", "without stairs", "flat", "ramp", "mobility", "crutches", "stroller", "elevator", "gentle", "knee", "cane"],
  avoidBusy: ["avoid crowds", "not busy", "less busy", "avoid busy", "no crowds", "crowd", "crowded", "avoid people", "fewer people", "skip the crowds", "empty", "away from traffic", "no cars"],
};
const HURRY = ["fast", "fastest", "quick", "quickest", "hurry", "asap", "late", "shortest", "direct", "in a rush", "rush", "running late", "straight there", "soon"];
const WANDER = ["wander", "no rush", "no hurry", "take my time", "scenic route", "long way", "stroll", "explore", "meander", "leisurely"];

function ruleBased(text) {
  const t = " " + (text || "").toLowerCase() + " ";
  const preferences = { scenic: 0, shade: 0, quiet: 0, accessible: 0, avoidBusy: 0 };
  const hits = [];
  for (const [key, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      if (t.includes(w)) {
        preferences[key] = Math.min(1, preferences[key] + 0.7);
        hits.push(key);
        break;
      }
    }
  }
  if (preferences.quiet > 0) {
    preferences.scenic = Math.max(preferences.scenic, 0.4);
    preferences.avoidBusy = Math.max(preferences.avoidBusy, 0.5);
  }
  if (preferences.accessible > 0) preferences.avoidBusy = Math.max(preferences.avoidBusy, 0.3);

  let efficiency = 0.5;
  if (HURRY.some((w) => t.includes(w))) efficiency = 0.95;
  if (WANDER.some((w) => t.includes(w))) efficiency = 0.2;
  if (hits.length && efficiency === 0.5) efficiency = 0.35;

  const labelMap = { scenic: "scenic", shade: "shaded", quiet: "calm", accessible: "step-free", avoidBusy: "uncrowded" };
  const active = Object.entries(preferences).filter(([, v]) => v > 0).map(([k]) => k);
  const mood = active.length ? labelMap[active[0]] : "balanced";
  const rationale = active.length
    ? `Detected a preference for ${active.map((k) => labelMap[k]).join(", ")} paths; weighting the route accordingly.`
    : "No strong soft constraints detected — optimizing mostly for a short, comfortable route.";

  return normalize({ preferences, efficiency, mood, rationale, warnings: [] }, { source: "rule-based" });
}

// ---------------------------------------------------------------------------
// OpenAI-compatible backend (LM Studio / Ollama / etc.)
// ---------------------------------------------------------------------------
async function callOpenAICompatible(text) {
  const cfg = lmstudioConfig();
  try {
    const res = await fetchWithTimeout(
      `${cfg.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: text },
          ],
        }),
      },
      30000
    );
    if (!res.ok) {
      console.warn(`[interpret] LM Studio ${res.status}; trying next backend.`);
      return null;
    }
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(out);
    if (!parsed) return null;
    return normalize(parsed, { source: "lmstudio", model: cfg.model });
  } catch (err) {
    if (err.name !== "AbortError" && err.code !== "ECONNREFUSED") {
      console.warn(`[interpret] LM Studio call failed (${err.message}); trying next backend.`);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Claude (Anthropic Messages API)
// ---------------------------------------------------------------------------
async function callClaude(text) {
  const cfg = claudeConfig();
  if (!cfg.apiKey) return null;
  try {
    const res = await fetchWithTimeout(
      `${cfg.baseUrl}/v1/messages`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: cfg.model,
          max_tokens: 500,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content: text }],
        }),
      },
      15000
    );
    if (!res.ok) {
      console.warn(`[interpret] Claude API ${res.status}; trying next backend.`);
      return null;
    }
    const data = await res.json();
    const out = (data.content || []).map((b) => b.text || "").join("");
    const parsed = extractJson(out);
    if (!parsed) return null;
    return normalize(parsed, { source: "claude", model: cfg.model });
  } catch (err) {
    console.warn(`[interpret] Claude call failed (${err.message}); trying next backend.`);
    return null;
  }
}

const BACKEND_FNS = { lmstudio: callOpenAICompatible, claude: callClaude };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function interpret(text) {
  const trimmed = (text || "").trim().slice(0, 500);
  if (!trimmed) {
    return normalize(
      { rationale: "No constraint given — optimizing for the shortest comfortable route.", efficiency: 0.7 },
      { source: "default" }
    );
  }
  for (const name of backendOrder()) {
    const fn = BACKEND_FNS[name];
    if (!fn) continue;
    const result = await fn(trimmed);
    if (result) return result;
  }
  return ruleBased(trimmed);
}

// Report which backend is live, for the UI badge and /api/health.
export async function health() {
  const order = backendOrder();
  const out = { provider: process.env.LLM_PROVIDER || "auto", active: "rule-based", model: null, backends: [] };

  for (const name of order) {
    if (name === "lmstudio") {
      const cfg = lmstudioConfig();
      let available = false;
      let detail = "";
      try {
        const res = await fetchWithTimeout(
          `${cfg.baseUrl}/models`,
          { headers: { authorization: `Bearer ${cfg.apiKey}` } },
          1500
        );
        available = res.ok;
        detail = res.ok ? "reachable" : `HTTP ${res.status}`;
      } catch (err) {
        detail = err.code === "ECONNREFUSED" ? "not running" : "not reachable";
      }
      out.backends.push({ name: "lmstudio", model: cfg.model, baseUrl: cfg.baseUrl, available, detail });
      if (available && out.active === "rule-based") {
        out.active = "lmstudio";
        out.model = cfg.model;
      }
    } else if (name === "claude") {
      const cfg = claudeConfig();
      const available = Boolean(cfg.apiKey);
      out.backends.push({ name: "claude", model: cfg.model, available, detail: available ? "key set" : "no API key" });
      if (available && out.active === "rule-based") {
        out.active = "claude";
        out.model = cfg.model;
      }
    }
  }
  return out;
}

export { ruleBased, normalize, extractJson };
