// Voice output with TWO engines:
//  • "kokoro" — Kokoro-82M neural TTS running 100% locally in the browser
//    (transformers.js / ONNX, WebGPU or WASM). Plays via Web Audio, which is far
//    more reliable than speechSynthesis and sounds natural. Model downloads once
//    (then cached by the browser).
//  • "web" — the OS speechSynthesis voices. Instant, no download. Robust fallback.
// Plus speech-recognition for hands-free commands (web only).

let enabled = true;
let lastSpokenAt = 0;
let lastPhrase = "";
let cfg = { engine: "kokoro", voiceName: "", kokoroVoice: "af_heart", rate: 1.0, pitch: 1.0 };

export function setVoiceEnabled(on) { enabled = on; if (!on) stopSpeaking(); }
export function voiceEnabled() { return enabled; }
export function setVoiceConfig(patch = {}) {
  for (const k of ["engine", "voiceName", "kokoroVoice", "rate", "pitch"]) {
    if (patch[k] !== undefined) cfg[k] = patch[k];
  }
  if (patch.engine === "kokoro") preloadVoice();
}
export function getEngine() { return cfg.engine; }

// ---------------- shared Web Audio context ----------------
let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx?.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Must run inside a user gesture (iOS/Safari) to allow any audio at all.
let unlocked = false;
export function unlockAudio() {
  try {
    const ctx = getCtx();
    if (ctx) {
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
  } catch { /* noop */ }
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      const u = new SpeechSynthesisUtterance(" "); u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch { /* noop */ }
  unlocked = true;
  if (cfg.engine === "kokoro") preloadVoice();
}
export function audioUnlocked() { return unlocked; }

// ---------------- voice status (for the Settings UI) ----------------
let status = "idle"; // idle | loading | ready | error
let statusInfo = {};
let statusListeners = [];
export function voiceStatus() { return { status, ...statusInfo }; }
export function onVoiceStatus(fn) { statusListeners.push(fn); return () => { statusListeners = statusListeners.filter((f) => f !== fn); }; }
function setStatus(s, info = {}) { status = s; statusInfo = info; statusListeners.forEach((f) => f(s, info)); }

// ---------------- Kokoro neural engine ----------------
// Curated to the best-graded Kokoro voices (per the model's own quality grades).
export const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart — US female (warm) ★" },
  { id: "af_bella", label: "Bella — US female (energetic) ★" },
  { id: "af_nicole", label: "Nicole — US female (soft)" },
  { id: "am_fenrir", label: "Fenrir — US male (energetic)" },
  { id: "am_michael", label: "Michael — US male" },
  { id: "am_puck", label: "Puck — US male (upbeat)" },
  { id: "bf_emma", label: "Emma — UK female" },
  { id: "bm_george", label: "George — UK male" },
];

let kokoro = null;
let kokoroLoading = null;
let kokoroFails = 0; // runtime generate() failures → give up and use the system voice
const bufCache = new Map(); // `${voice}|${text}` -> AudioBuffer

// Safari (incl. iOS) exposes navigator.gpu but ONNX Runtime's WebGPU backend is
// unreliable there — it loads but throws on inference, which used to silently
// drop us to the system voice. Force the WASM backend on Safari/iOS so the
// neural voice actually runs; only use WebGPU on Chromium where it's solid.
function isSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const safariUA = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const iOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return safariUA || iOS;
}
function pickDevice() {
  if (isSafari()) return "wasm";
  return (typeof navigator !== "undefined" && navigator.gpu) ? "webgpu" : "wasm";
}

async function ensureKokoro() {
  if (kokoro) return kokoro;
  if (!kokoroLoading) {
    setStatus("loading", { progress: 0 });
    kokoroLoading = (async () => {
      const { KokoroTTS } = await import("kokoro-js");
      const device = pickDevice();
      const model = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: device === "webgpu" ? "fp32" : "q8",
        device,
        progress_callback: (p) => {
          const pct = p?.progress != null ? Math.round(p.progress) : null;
          if (pct != null) setStatus("loading", { progress: pct });
        },
      });
      return model;
    })();
  }
  try {
    kokoro = await kokoroLoading;
    setStatus("ready");
    warmup();
    return kokoro;
  } catch (e) {
    kokoroLoading = null;
    setStatus("error", { message: String(e?.message || e) });
    throw e;
  }
}

export function preloadVoice() {
  if (cfg.engine === "kokoro" && !kokoro && status !== "loading") ensureKokoro().catch(() => {});
}

// Serialize generate() calls — transformers.js models aren't safe to run
// multiple inferences at once.
let genChain = Promise.resolve();
async function genBuffer(text, voice) {
  const key = `${voice}|${text}`;
  if (bufCache.has(key)) return bufCache.get(key);
  const model = await ensureKokoro();
  const run = genChain.then(() => model.generate(text, { voice }));
  genChain = run.then(() => {}, () => {});
  const raw = await run;
  const ctx = getCtx();
  const samples = raw.audio instanceof Float32Array ? raw.audio : new Float32Array(raw.audio);
  const buf = ctx.createBuffer(1, samples.length, raw.sampling_rate || 24000);
  buf.copyToChannel(samples, 0);
  if (bufCache.size > 80) bufCache.delete(bufCache.keys().next().value);
  bufCache.set(key, buf);
  return buf;
}

// Pre-generate the most-spoken short phrases so live counting isn't laggy.
let warmedUp = false;
async function warmup() {
  if (warmedUp) return; warmedUp = true;
  const phrases = ["Go!", ...COUNT_WORDS.slice(1), ...PRAISE.slice(0, 4)];
  for (const p of phrases) { try { await genBuffer(p, cfg.kokoroVoice); } catch { break; } }
}

let queue = [];
let draining = false;
let currentSrc = null;
function stopKokoro() {
  try { currentSrc?.stop(); } catch { /* noop */ }
  currentSrc = null;
  queue.forEach((i) => (i.dropped = true));
  queue = [];
}
function playBuffer(buf) {
  return new Promise((resolve) => {
    const ctx = getCtx();
    if (!ctx) return resolve();
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination);
    currentSrc = src;
    src.onended = () => { if (currentSrc === src) currentSrc = null; resolve(); };
    try { src.start(); } catch { resolve(); }
  });
}
async function drainKokoro() {
  draining = true;
  while (queue.length) {
    const item = queue.shift();
    if (item.dropped) continue;
    try {
      const buf = await genBuffer(item.text, cfg.kokoroVoice);
      if (item.dropped) continue;
      await playBuffer(buf);
      kokoroFails = 0;
    } catch {
      webSpeak(item.text, item.opts); // speak this line with the system voice
      // If the neural engine keeps throwing (e.g. an unsupported GPU backend),
      // stop trying and use the reliable system voice for the rest of the session.
      if (++kokoroFails >= 2) { setStatus("error", { message: "Neural voice unavailable on this device — using system voice." }); queue = []; }
    }
  }
  draining = false;
}
function kokoroEnqueue(text, opts) {
  if (opts.interrupt) stopKokoro();
  queue.push({ text, opts, dropped: false });
  if (!draining) drainKokoro();
}

// ---------------- Web Speech engine (fallback) ----------------
let cachedVoices = [];
function loadVoices() { cachedVoices = window.speechSynthesis?.getVoices() || []; return cachedVoices; }
export function refreshVoices() { return loadVoices(); }
export function listVoices() {
  const v = cachedVoices.length ? cachedVoices : loadVoices();
  return [...v].sort((a, b) => score(b) - score(a));
}
function score(v) {
  let s = 0;
  if (/^en/i.test(v.lang)) s += 50;
  if (/en[-_]US/i.test(v.lang)) s += 10;
  if (/(natural|neural|premium|enhanced|siri)/i.test(v.name)) s += 30;
  if (/(samantha|alex|daniel|karen|google)/i.test(v.name)) s += 8;
  if (v.localService) s += 5; // prefer offline voices (more reliable)
  return s;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}
function webSpeak(text, opts = {}) {
  if (!window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  if (opts.interrupt) synth.cancel();
  try { if (synth.paused) synth.resume(); } catch { /* noop */ }
  const u = new SpeechSynthesisUtterance(text);
  // Only override the voice if the user explicitly picked one — leaving it unset
  // uses the OS default voice, which is the most reliable (always audible).
  if (cfg.voiceName) {
    const v = (cachedVoices.length ? cachedVoices : loadVoices()).find((x) => x.name === cfg.voiceName);
    if (v) { u.voice = v; u.lang = v.lang; }
  }
  u.rate = opts.rate ?? cfg.rate ?? 1.0;
  u.pitch = opts.pitch ?? cfg.pitch ?? 1.0;
  u.volume = opts.volume ?? 1.0;
  synth.speak(u);
}

// ---------------- unified API ----------------
function sanitizeSpeech(t) {
  return String(t)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>~|]+/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text, opts = {}) {
  if ((!enabled && !opts.force) || !text) return;
  text = sanitizeSpeech(text);
  if (!text) return;
  const now = Date.now();
  if (!opts.interrupt && now - lastSpokenAt < (opts.minGapMs ?? 0)) return;
  if (text === lastPhrase && now - lastSpokenAt < 2500) return;
  lastSpokenAt = now; lastPhrase = text;
  if (cfg.engine === "kokoro" && status !== "error") {
    if (kokoro) {
      kokoroEnqueue(text, opts);            // neural model ready
    } else {
      preloadVoice();                       // kick off the one-time download
      webSpeak(text, opts);                 // ...and use the instant OS voice meanwhile
    }
  } else {
    webSpeak(text, opts);
  }
}

export function stopSpeaking() {
  stopKokoro();
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}

export function previewVoice() {
  lastPhrase = "";
  speak("Nice work — let's keep that form sharp.", { interrupt: true, force: true });
}

const PRAISE = ["Nice rep!", "Good one!", "Clean rep.", "Looking strong!", "That's it!", "Perfect.", "Great depth!", "Keep it up!", "Beautiful.", "Strong work!"];
export function praise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export function sayNumber(n) { return n >= 0 && n < COUNT_WORDS.length ? COUNT_WORDS[n] : String(n); }

// ---------------- Speech recognition (commands; web only) ----------------
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export function speechSupported() { return !!SR; }

// Only one recognizer can run at a time per page (a second .start() throws and
// can wedge the engine). We track the active instance so React StrictMode's
// double-invoke / rapid re-mounts don't leave two fighting recognizers.
let activeRec = null;

// onStatus(state, info?) — state ∈ "listening" | "denied" | "error" | "stopped".
// Lets the UI tell the user *why* the mic isn't working (e.g. permission blocked).
export function startListening(onCommand, onText, onStatus) {
  if (!SR) { onStatus?.("error", { message: "Speech recognition isn't supported in this browser." }); return () => {}; }
  if (activeRec) { try { activeRec._stopped = true; activeRec.stop(); } catch { /* noop */ } activeRec = null; }

  const rec = new SR();
  activeRec = rec;
  rec.continuous = true; rec.interimResults = false; rec.lang = "en-US";
  let backoff = 400;
  let netErrors = 0;       // consecutive "network" errors (Chrome's cloud STT unreachable)
  let lastState = null;    // dedupe status emissions so the UI never flickers
  const emit = (state, info) => {
    const key = state + (info?.message || "");
    if (key === lastState) return;
    lastState = key;
    onStatus?.(state, info);
  };

  rec.onstart = () => {
    backoff = 400;
    // Don't bounce back to "listening" while we're in a sustained network outage,
    // or the banner would blink on every retry. We re-announce on a real result.
    if (netErrors < 3) emit("listening");
  };
  rec.onresult = (e) => {
    netErrors = 0;          // a result means recognition is actually working
    emit("listening");
    const phrase = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
    if (!phrase) return;
    const intent = parseIntent(phrase);
    onText?.(phrase, intent); // intent is null for free-form conversation
    if (intent) onCommand?.(intent, phrase);
  };
  rec.onerror = (e) => {
    const err = e?.error;
    // Permission problems are fatal — restarting just loops.
    if (err === "not-allowed" || err === "service-not-allowed") {
      rec._stopped = true;
      emit("denied", { message: "Microphone is blocked. Allow mic access for this site, then reopen the workout." });
    } else if (err === "audio-capture") {
      rec._stopped = true;
      emit("error", { message: "No microphone found." });
    } else if (err === "network") {
      // The browser streams speech to a cloud service; "network" = it couldn't
      // reach it. This is usually NOT the user's internet — common causes are a
      // non-Google Chromium build (Brave, Arc, ungoogled, Electron) that lacks
      // the speech backend, a VPN/firewall, or a corporate network. Retry slowly
      // and, once clearly persistent, show ONE stable (non-blinking) notice.
      netErrors++;
      backoff = Math.min(15000, 1500 * netErrors);
      if (netErrors >= 3) emit("network", { message: "Voice recognition couldn't reach the browser's speech service. This usually means a Chromium build without it (Brave, Arc, ungoogled) or a VPN/firewall — try Google Chrome. Everything else still works." });
    }
    // no-speech / aborted → ignore; onend restarts.
  };
  rec.onend = () => {
    if (rec._stopped) { if (activeRec === rec) activeRec = null; emit("stopped"); return; }
    // Auto-restart with a small backoff so a flapping engine doesn't busy-loop.
    setTimeout(() => {
      if (rec._stopped) return;
      try { rec.start(); } catch { /* already starting */ }
    }, backoff);
    if (netErrors === 0) backoff = Math.min(4000, backoff * 1.6);
  };
  try { rec.start(); } catch { /* will retry via onend */ }
  return () => { rec._stopped = true; try { rec.stop(); } catch { /* noop */ } if (activeRec === rec) activeRec = null; };
}

function parseIntent(p) {
  if (/\b(show me|how to|how do i|demo|demonstrate|teach me)\b/.test(p)) return "demo";
  if (/\b(next|skip|next exercise|move on)\b/.test(p)) return "next";
  if (/\b(pause|hold on|wait|stop for a sec)\b/.test(p)) return "pause";
  if (/\b(resume|continue|keep going|unpause|go again)\b/.test(p)) return "resume";
  if (/\b(start|begin|let's go|lets go|ready)\b/.test(p)) return "start";
  if (/\b(repeat|again|say again)\b/.test(p)) return "repeat";
  if (/\b(finish|end workout|i'm done|im done|stop workout|that's it)\b/.test(p)) return "finish";
  if (/\b(how many|reps left|status|count|rep count)\b/.test(p)) return "status";
  if (/\b(record|recording)\b/.test(p)) return "record";
  return null;
}
