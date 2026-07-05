// A continuous, conversational LLM coach. It narrates the workout out loud as
// things happen (set starts, reps, form, rest, finish) and answers when the user
// talks to it — keeping a short rolling transcript so it stays coherent and
// doesn't repeat itself. Speaking is delegated to a callback (Kokoro/Web Speech).
import { complete } from "./llm.js";

const PERSONA =
  "You are an upbeat, motivating personal trainer talking OUT LOUD to your client DURING their workout. " +
  "Reply with ONE short spoken sentence (occasionally two). Be natural, varied, specific to the moment, and encouraging. " +
  "When they ask a question, answer it directly and briefly. " +
  "No markdown, no lists, no emojis, no stage directions, no quotes. Never repeat your previous line.";

// Few-shot priming both sets the style and skips the reasoning model's hidden
// chain-of-thought (so replies are fast on e2b/e4b).
const FEWSHOT = [
  { role: "user", content: "[set_start] Squat, set 1 of 3, target 12 reps." },
  { role: "assistant", content: "Alright, opening with squats — twelve clean reps, I'm watching that depth. Let's go!" },
  { role: "user", content: "[mid] Squat, rep 6 of 12, form 88, depth good." },
  { role: "assistant", content: "Halfway there and looking strong — keep sitting into those heels." },
  { role: "user", content: "[user] how many reps do I have left" },
  { role: "assistant", content: "Six more to go — stay with me." },
  { role: "user", content: "[rest] resting 60 seconds, next up Push-up." },
  { role: "assistant", content: "Great set. Catch your breath — push-ups are up next." },
];

export class LiveCoach {
  constructor({ model, profile, speak }) {
    this.model = model;
    this.profile = profile;
    this.speak = speak;          // (text, opts) => void
    this.getContext = null;      // () => { active, exercise, reps, target, form, fault }
    this.transcript = [];
    this.busy = false;
    this.healthy = true;         // flips false if the LLM is unreachable
    this.enabled = true;
    this.lastLineAt = 0;
    this.tickMs = 9000;          // narrate roughly every 9s during a set
  }

  setModel(m) { this.model = m; }
  setContextProvider(fn) { this.getContext = fn; }
  reset() { this.transcript = []; this.lastLineAt = 0; }
  stop() { this.enabled = false; }

  async _turn(userContent, { interrupt = false, minGapMs = 0 } = {}) {
    if (!this.enabled || this.busy) return;
    const now = performance.now();
    if (!interrupt && now - this.lastLineAt < minGapMs) return;
    this.busy = true;
    this.lastLineAt = now;
    this.transcript.push({ role: "user", content: userContent });
    if (this.transcript.length > 12) this.transcript = this.transcript.slice(-12);
    try {
      const messages = [{ role: "system", content: PERSONA }, ...FEWSHOT, ...this.transcript];
      const txt = await complete(messages, { model: this.model, temperature: 0.85, maxTokens: 90, signal: AbortSignal.timeout(12000) });
      const clean = (txt || "").replace(/<\/?think>/gi, "").replace(/[*_`#>~|]/g, "").replace(/^["'\s]+|["'\s]+$/g, "").trim();
      if (clean) {
        this.transcript.push({ role: "assistant", content: clean });
        this.healthy = true;
        if (this.enabled) this.speak(clean, { interrupt });
      }
    } catch {
      // Transient failure → fall back to rule-based coaching, retry after a bit.
      this.healthy = false;
      clearTimeout(this._recover);
      this._recover = setTimeout(() => { this.healthy = true; }, 20000);
    } finally {
      this.busy = false;
    }
  }

  // Called frequently; emits a narration line at most every tickMs while active.
  tick(now) {
    if (!this.enabled || this.busy || now - this.lastLineAt < this.tickMs) return;
    const c = this.getContext?.();
    if (!c || !c.active) return;
    const fault = c.fault ? ` Issue: ${c.fault}.` : "";
    this._turn(`[mid] ${c.exercise}, rep ${c.reps} of ${c.target}, form ${c.form}.${fault}`, { minGapMs: this.tickMs });
  }

  event(kind, d = {}) {
    switch (kind) {
      case "set_start":
        this._turn(`[set_start] ${d.exercise}, set ${d.set} of ${d.sets}, target ${d.target} ${d.type === "hold" ? "seconds" : "reps"}.`);
        break;
      case "milestone":
        this._turn(`[milestone] ${d.reps} reps of ${d.target} done, form ${d.form}.`, { minGapMs: 4000 });
        break;
      case "shallow":
        this._turn(`[shallow] that rep was short of full range of motion.`, { minGapMs: 5000 });
        break;
      case "set_done":
        this._turn(`[set_done] finished ${d.type === "hold" ? d.holdSeconds + " second hold" : d.reps + " reps"}, form ${d.form}.`);
        break;
      case "rest":
        this._turn(`[rest] resting ${d.seconds} seconds, next up ${d.next}.`);
        break;
      case "finish":
        this._turn(`[finish] workout complete — ${d.totalReps} total reps, average form ${d.form}. Congratulate me.`, { interrupt: true });
        break;
      default:
        break;
    }
  }

  // The user spoke to the coach (free-form). Respond conversationally.
  userSay(text) {
    const c = this.getContext?.();
    const ctx = c && c.active ? ` (currently ${c.exercise}, rep ${c.reps} of ${c.target})` : "";
    this._turn(`[user]${ctx} ${text}`, { interrupt: true });
  }
}
