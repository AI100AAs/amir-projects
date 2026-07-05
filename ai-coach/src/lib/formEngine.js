// Stateful per-exercise tracker. Feed it landmarks each frame; it counts reps,
// measures range of motion, grades form, and surfaces the single most useful
// coaching cue at any moment (debounced so the voice layer can speak it).
import { bodyVisibility } from "./geometry.js";

export class ExerciseTracker {
  constructor(exercise) {
    this.ex = exercise;
    this.reset();
  }

  reset() {
    this.reps = 0;
    this.phase = "rest"; // "rest" | "active"
    this.extreme = null; // most-active angle reached in the current rep
    this.repHistory = []; // { romOk, depth }
    this.issueCounts = {}; // id -> total frames seen (for the post-set summary)
    this._issueStreak = {}; // id -> consecutive frames (for debounced surfacing)
    this.holdMs = 0;
    this.inGoodHold = false;
    this._lastT = null;
    this.prevAngle = null; // for motion (descending/ascending) detection
    this.smooth = null;    // EMA-smoothed rep angle (kills per-frame jitter)
    this._activeT0 = null; // when the current rep entered the active phase
    this.score = 100;
    this.lastRep = null; // info about the most recently completed rep
    this.lastFeedback = null;
  }

  // Returns a frame result describing the current state.
  update(landmarks, tNow) {
    const ex = this.ex;
    const dt = this._lastT == null ? 0 : tNow - this._lastT;
    this._lastT = tNow;

    const vis = bodyVisibility(landmarks);
    if (vis < 0.55) {
      return { visible: false, reps: this.reps, holdSeconds: this.holdSeconds(), feedback: "Step back so I can see your whole body.", phase: this.phase, score: this.score };
    }

    // Collect active form issues (debounced — must persist ~6 frames to surface).
    const rawIssues = ex.formChecks ? ex.formChecks(landmarks) : [];
    const activeNow = new Set(rawIssues.map((i) => i.id));
    for (const i of rawIssues) {
      this.issueCounts[i.id] = (this.issueCounts[i.id] || 0) + 1;
      this._issueStreak[i.id] = (this._issueStreak[i.id] || 0) + 1;
    }
    for (const id of Object.keys(this._issueStreak)) {
      if (!activeNow.has(id)) this._issueStreak[id] = 0;
    }
    const surfaced = rawIssues.filter((i) => this._issueStreak[i.id] >= 6);

    if (ex.type === "hold") return this._updateHold(landmarks, dt, surfaced);
    return this._updateReps(landmarks, surfaced, tNow);
  }

  // Reps shorter than this are almost certainly tracking jitter, not real reps.
  static MIN_REP_MS = 350;

  _updateReps(landmarks, surfaced, tNow) {
    const ex = this.ex;
    const raw = ex.getAngle(landmarks);
    const cfg = ex.rep;
    let repCompleted = false;

    // Smooth the angle (exponential moving average) before any threshold logic —
    // a single noisy frame should never trip a rep on or off.
    let angle = null;
    if (raw != null) {
      this.smooth = this.smooth == null ? raw : this.smooth + 0.45 * (raw - this.smooth);
      angle = this.smooth;
    }

    if (angle != null) {
      const isActive = cfg.activeIsLow ? angle <= cfg.active : angle >= cfg.active;
      const isRest = cfg.activeIsLow ? angle >= cfg.rest : angle <= cfg.rest;

      if (this.phase === "rest" && isActive) {
        this.phase = "active";
        this.extreme = angle;
        this._activeT0 = tNow;
      } else if (this.phase === "active") {
        // track the most-active angle reached
        this.extreme =
          this.extreme == null
            ? angle
            : cfg.activeIsLow
              ? Math.min(this.extreme, angle)
              : Math.max(this.extreme, angle);
        if (isRest) {
          const longEnough = this._activeT0 == null || tNow - this._activeT0 >= ExerciseTracker.MIN_REP_MS;
          if (longEnough) {
            // rep complete — evaluate range of motion
            const romOk = cfg.activeIsLow ? this.extreme <= cfg.romTarget : this.extreme >= cfg.romTarget;
            this.reps += 1;
            this.repHistory.push({ romOk, depth: this.extreme });
            this.lastRep = { index: this.reps, romOk, depth: Math.round(this.extreme) };
            if (!romOk) this.score = Math.max(40, this.score - 4);
            else this.score = Math.min(100, this.score + 1);
            repCompleted = true;
          }
          // Whether or not it counted, the movement returned to rest.
          this.phase = "rest";
          this.extreme = null;
          this._activeT0 = null;
        }
      }
    }

    // Priority: a persistent form fault > a shallow last rep > encouragement.
    let feedback = null;
    if (surfaced.length) {
      feedback = surfaced[0].msg;
      this.score = Math.max(40, this.score - 0.2);
    } else if (repCompleted && !this.lastRep.romOk) {
      feedback = ex.romMessage;
    } else if (repCompleted && this.lastRep.romOk) {
      feedback = "good"; // sentinel — UI turns this into varied praise
    }
    this.lastFeedback = feedback;

    // ---- live coaching state from the current motion ----
    // "go" = moving into the rep but not deep enough; "deep" = at the bottom/peak;
    // "up" = returning; "correct" = active form fault.
    let liveKind = null;
    const prev = this.prevAngle;
    if (angle != null) this.prevAngle = angle;
    if (surfaced.length) {
      liveKind = "correct";
    } else if (angle != null && prev != null) {
      const V = 1.2; // degrees/frame to count as moving
      const toActive = cfg.activeIsLow ? angle < prev - V : angle > prev + V;
      const toRest = cfg.activeIsLow ? angle > prev + V : angle < prev - V;
      const span = Math.abs(cfg.rest - cfg.romTarget) || 1;
      const depth = cfg.activeIsLow ? cfg.rest - angle : angle - cfg.rest;
      const progress = Math.max(0, Math.min(1.3, depth / span)); // 0=rest, 1=target
      if (progress >= 0.9) liveKind = "deep";
      else if (toActive && progress < 0.85) liveKind = "go";
      else if (toRest && progress > 0.35) liveKind = "up";
    }

    return {
      visible: true,
      angle: angle != null ? Math.round(angle) : null,
      phase: this.phase,
      reps: this.reps,
      repCompleted,
      lastRep: this.lastRep,
      issues: surfaced,
      feedback,
      liveKind,
      faultId: surfaced[0]?.id || null,
      score: Math.round(this.score),
    };
  }

  _updateHold(landmarks, dt, surfaced) {
    const ex = this.ex;
    const angle = ex.getAngle(landmarks);
    const good = angle != null && angle >= ex.hold.goodMin && angle <= ex.hold.goodMax;
    this.inGoodHold = good;
    if (good) this.holdMs += dt;
    else if (surfaced.length) this.score = Math.max(40, this.score - 0.3);

    let feedback = null;
    if (surfaced.length) feedback = surfaced[0].msg;
    else if (good) feedback = null; // silence = good while holding
    this.lastFeedback = feedback;

    return {
      visible: true,
      angle: angle != null ? Math.round(angle) : null,
      phase: good ? "good" : "fix",
      holdSeconds: this.holdSeconds(),
      issues: surfaced,
      feedback,
      liveKind: surfaced.length ? "correct" : good ? "hold" : null,
      faultId: surfaced[0]?.id || null,
      score: Math.round(this.score),
    };
  }

  holdSeconds() {
    return Math.floor(this.holdMs / 1000);
  }

  // A short machine summary of the set for the LLM coach to react to.
  setSummary() {
    const total = this.reps;
    const goodRom = this.repHistory.filter((r) => r.romOk).length;
    const faults = Object.entries(this.issueCounts)
      .filter(([, c]) => c > 8)
      .map(([id, c]) => ({ id, frames: c }));
    return {
      exercise: this.ex.name,
      type: this.ex.type,
      reps: total,
      holdSeconds: this.holdSeconds(),
      fullRangeReps: goodRom,
      shallowReps: total - goodRom,
      formScore: Math.round(this.score),
      faults,
    };
  }
}
