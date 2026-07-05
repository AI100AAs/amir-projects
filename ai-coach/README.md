# AI·Coach — your local personal trainer 🏋️

A fully-local web app that acts as a personal trainer. It designs a personalized
workout program, then uses your webcam to **count reps, score your form, and coach
you with voice in real time** — all running on your own machine.

## How it works (architecture)

A **hybrid** design uses the right-sized model for each job — the LLM is the
*exception*, not the default:

| Job | What runs it | Why |
|---|---|---|
| **Rep counting + form correction** | MediaPipe `PoseLandmarker` (small specialized model) + geometry rules, in-browser | Exact joint angles beat an LLM eyeballing video, at ~30 fps with zero latency |
| **Per-set feedback** | Rule engine over the measured pose data (no network) | Instant & offline; the data already says what to fix |
| **Program design + chat** | Local LLM via **LM Studio** | Genuinely needs language reasoning |
| **On-demand "📷 form photo"** | Multimodal LLM (optional, separate vision model) | Only when *you* ask for a natural-language critique |
| **Voice** | Web Speech API (TTS + optional commands) | In-browser |

So a normal workout makes **zero LLM calls** after the one-time program design — the
pose model and rules do the live coaching. The LLM is reserved for chat and (if you opt
in) richer set feedback, **live AI commentary**, and photo analysis.

**Is the coaching realtime?** Yes — rep counting and form correction run on the pose model
per video frame (~16 ms) with instant spoken cues; that's faster *and* more precise than an
LLM, which only ever sees angles it would have to estimate. For a more *conversational* live
coach, enable **Live AI commentary** (Settings): a throttled energetic cue every few reps
from the LLM. On an M4 Pro this lands in ~0.3–0.6 s warm with `gemma-4-e4b` — plenty fast for
commentary layered on top of the precise per-rep cues. (Putting an LLM in the per-rep loop
itself is intentionally avoided: the pose math is both faster and more accurate.)

- **Pose + reps + form correction** happen entirely in JavaScript from the pose
  skeleton — instant spoken cues like *"go deeper"* or *"keep a straight line."*
- **The LLM** designs your program (structured JSON), chats with you, reacts after
  each set, and — because Gemma is multimodal — can **look at a webcam snapshot**
  and critique your form ("📷 Analyze my form").
- No data leaves your computer. After first-time asset download it works offline.

## Prerequisites

1. **LM Studio** running with the local server on (Developer ▸ **Start Server**,
   port `1234`) and a model loaded. Default is `google/gemma-4-e4b` (multimodal +
   reasoning). You can pick any loaded model in **⚙ Settings**.
   - For the "Analyze my form" photo feature, use a **vision-capable** model.
2. **Node 18+** and a **Chromium browser** (Chrome/Edge) — best Web Speech support.
3. A **webcam**.

## Run

```bash
npm install     # also downloads the pose model + WASM into public/ (one time)
npm run dev
```

Then open **http://localhost:5173** — ⚠️ use `localhost`, not the LAN IP: browsers
only grant camera access on a secure context, and `localhost` counts as one.

If asset download was skipped (e.g. offline at install), run it manually:
```bash
npm run setup:assets
```

### Run a production build (to "ship" it)
```bash
npm run build       # outputs dist/
npm run serve       # serve dist/ on http://localhost:4173 (LM Studio proxy included)
npm run serve:lan   # same, over HTTPS for phones on your LAN
```
The preview server proxies `/llm` to LM Studio exactly like the dev server, so a built
app still reaches your local model.

### Browser support
| Feature | Chrome/Edge | Safari (Mac) | iOS Safari |
|---|---|---|---|
| Camera, pose, rep counting, form coaching | ✅ | ✅ | ✅ (tap to enable) |
| Neural voice (Kokoro) | ✅ WebGPU | ✅ WASM | ✅ WASM |
| System voice | ✅ | ✅ | ✅ |
| **Voice commands / talk-back** (speech recognition) | ✅ | ❌ | ❌ |
| Session recording | ✅ (webm) | ✅ (mp4) | ⚠️ varies |

Voice **commands** need a Chromium browser that includes Google's speech service —
plain Chrome/Edge. Brave, Arc, ungoogled-Chromium and Electron wrappers report a
`network` error because they ship without it; everything else still works.

## Use it on your iPhone 📱 (laptop hosts, phone displays)

Phones only allow camera access over **HTTPS** — plain `npm run dev` (http) will *silently*
block the camera with no permission prompt. You **must** use the TLS dev server:

```bash
npm run dev:lan      # serves https on your LAN (self-signed cert)
```

> If your phone shows no certificate warning, you're on the http URL — switch to the
> `https://…:5173` address. The app now detects this and tells you exactly what to do.

1. Make sure the phone is on the **same Wi-Fi** as the laptop.
2. The terminal prints a `Network:` URL like `https://192.168.50.29:5173/`. Open that
   in **Safari** on your iPhone (use the IP shown for your machine).
3. Safari warns about the self-signed certificate → **Show Details → visit this website**.
4. **Allow camera** when prompted, then tap **📷 Enable camera** if the workout asks.
5. LM Studio still runs on your laptop — the phone reaches it automatically through the
   laptop's dev server, so no setup on the phone.

Notes: voice commands (speech recognition) aren't supported in iOS Safari; everything
else — pose tracking, rep counting, voice coaching, recording — works. Prop the phone up
in landscape a few feet away and the **Big HUD** keeps reps readable.

## Using it

1. **Onboarding** — pick goal, level, days/week, equipment, focus, limitations.
   Your coach generates a multi-day program (takes ~10–25 s; Gemma reasons first).
2. **Program** — review your plan and chat with the coach. Hit **▶ Start workout**.
3. **Workout** — stand back so your whole body is in frame. The coach counts you in,
   then counts reps, scores form live, and speaks corrections. Between sets it rests
   you and gives AI feedback.
   - Controls: Pause, Skip set, Next exercise, **📷 Analyze my form**, Exit.
   - Note the suggested **camera view** (front/side) shown on the video for each move.
4. **Voice commands** (Chromium only): say *next, pause, resume, finish, how many,
   record,* or *show me / how to* (opens the demo). If the mic is blocked the workout
   shows a "microphone is blocked" notice so you can fix permissions.

## Tracked exercises (real-time rep counting + form rules)

squat · push-up · bicep curl · overhead press · lateral raise · forward lunge ·
glute bridge · crunch · jumping jacks · plank (timed hold).

The LLM is constrained to prescribe only these, so every exercise in your program
is auto-tracked. Want more? Add an entry to [`src/lib/exercises.js`](src/lib/exercises.js).

## Project layout

```
src/lib/
  pose.js         MediaPipe wrapper + skeleton drawing
  landmarks.js    BlazePose landmark indices
  geometry.js     joint-angle math
  exercises.js    exercise definitions (angles, thresholds, form rules)
  formEngine.js   ExerciseTracker: rep counting, ROM, form scoring
  voice.js        TTS + speech-recognition commands
  llm.js          LM Studio (OpenAI-compatible) client
  coach.js        program generation, chat, set feedback, vision analysis
  store.js        localStorage persistence
src/components/   React UI (Onboarding, ProgramView, Workout, CoachChat, Settings)
```

## Features

- 🎙️ **Live voice coaching** — instant in-browser rep counts, form scoring, and spoken
  corrections (no LLM in the hot path). Two voice engines (Settings → Voice engine):
  **Natural (local AI)** uses **Kokoro-82M** neural TTS running 100% in your browser
  (downloads ~80 MB once, then offline); **System** uses your OS voices instantly. The
  neural voice runs on the WASM backend in Safari/iOS (where WebGPU is unreliable) and on
  WebGPU in Chrome; if it can't run at all, it auto-falls back to the system voice.
- 🎨 **Built-in coach graphics** — an animated athlete on the home screen and a little
  figure for every exercise, all drawn locally from the same pose keyframes the demos use
  (no stock art, no network).
- ⚡ **Fast AI** — "no-think" mode skips the reasoning model's hidden chain-of-thought,
  so coaching replies land in ~1–2s instead of ~5s. Toggle in Settings.
- 🗣️ **Live AI coach** — a continuous conversational trainer that narrates your set out
  loud (reacting to your reps, form, and rest in real time) **and listens** so you can talk
  back ("how many left?", "my shoulder hurts") and get spoken answers. Runs on your local
  LLM (~0.2–0.3s warm on e2b); instant rule-based form corrections stay underneath for
  safety, and it falls back to rule-based coaching if the LLM is unavailable. Two-way voice
  needs a Chromium browser (iOS Safari has no speech recognition; narration still works).
- 📱 **Mobile-friendly** — responsive layout, taller portrait camera framing, big touch
  targets, and HUD that stays readable on a phone.
- 🌗 **Dark / light themes** + **UI scale** (S/M/L/XL) and a **Big HUD** so you can read
  reps and cues from across the room. Plus a **⛶ Focus mode** that maximizes the camera.
- ⏺ **Session recording** — records the camera + skeleton overlay to a WebM that **auto-saves
  to your browser's Downloads folder** when you stop (re-download anytime from the summary).
- ❔ **"How to" demos** — not sure what a move is? Tap **How to** (or say *"show me"*) for an
  animated stick-figure that loops the exercise, numbered steps, a memorable cue, and a one-tap
  link to a real human demo on YouTube. The animation + steps are 100% local (work offline).
- 🎯 **Calibration / system check** — a guided screen (top bar → Calibrate) that verifies your
  camera, pose tracking (FPS + body-visibility readout), rep counting, and audio with a few
  easy moves before you train.
- 📊 **Workout summary + history** — per-session stats (reps, duration, form score, kcal)
  and a progress dashboard across all sessions.
- 🛟 **Works offline** — no LM Studio? A built-in starter program still tracks every rep
  and coaches your form. An error boundary keeps a single bug from blanking the app.
- 📷 **Multimodal form check** — snapshot → Gemma vision critique, on demand.

## Notes & tuning

- **Default model is `gemma-4-e2b-qat`** (fast on Apple Silicon). Gemma-4 e2b/e4b are
  *reasoning* models; the **Fast responses** toggle uses **few-shot priming** to skip the
  hidden chain-of-thought (works on both, ~0.2–0.5s warm). The first call after idle is slow
  only because LM Studio loads the model into RAM. Switch models anytime in Settings.
- **Program exercise ids are grammar-constrained** to the trackable catalog, so any model
  produces a usable plan; if it still can't, the built-in starter program takes over.
- Rep thresholds and form-rule angles live in `exercises.js` — tweak per exercise
  if a movement counts too eagerly or not enough.
- The Vite dev server **proxies** `/llm` → `localhost:1234`, so there are no CORS
  issues. Change the target with `LMSTUDIO_URL` env var.
- This is not medical advice. Stop if anything hurts.
