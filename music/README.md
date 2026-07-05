# CritiqueFlow — Music Performance Critique

**Vibecoded prototype** of an app that lets students record an instrument (or voice) performance, performs local audio analysis, and delivers structured, specific feedback to help them improve between lessons.

Inspired by the full brief: record → AI processes audio (and optionally video) → structured critique (timing, pitch, dynamics, technique) with specific observations like “your tempo rushed in bar 4”.

## Features (current prototype)

- **Browser-native recording**: Mic + optional webcam (video recorded locally)
- **Live waveform** during recording
- **Fully local audio analysis**:
  - Loudness / dynamics envelope (visualized)
  - Pitch detection via autocorrelation (client-side)
  - Note onset detection + tempo estimation + variance
- **Instant structured feedback** generated in-browser using realistic heuristics (vibecoded “LLM”)
- **Three feedback styles**: Encouraging / Balanced / Detailed
- **High-quality LLM prompt export**: One click copies a rich, engineered prompt containing all objective metrics + preliminary critique — ready to paste into Claude, GPT, Grok, etc.
- **Sample performances** (no mic needed) — realistic pre-baked cases
- **Playback** of your actual recording (or synthetic reconstruction for samples)
- **Downloadable Markdown report**
- **Storyboard + Ethics views** built into the app
- **Zero server calls** for audio — maximum privacy for this prototype

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173

Works great on desktop Chrome / Safari / Firefox. Microphone permissions will be requested.

## Storyboard (as implemented)

1. **Record** — Enter context (instrument, piece, level, target BPM). Big red record button. Live waveform. Optional video. Timer. Stop.
2. **Analyze** (client-side) — Progress steps: decode → loudness → pitch → onsets/tempo → feedback. All happens instantly locally.
3. **Feedback screen** — Score + categorized cards with prose + specific callouts. Strengths + actionable practice tips. Playback synced side panel. Regenerate, tweak style, copy LLM prompt, download report.
4. **Iterate** — Re-record or load another sample instantly.

See the in-app **Storyboard** tab for the full narrative + lo-fi notes.

## Prompting an LLM (mid-fi prototype step)

The app contains a `buildLLMPrompt(...)` function that produces a high-signal prompt containing:
- All extracted metrics (duration, estimated BPM, tempo variance, pitch stability samples, dynamics, onset times, etc.)
- The current context and preliminary heuristic feedback
- Clear output format instructions

Click **"COPY PROMPT FOR LLM"** on the feedback screen to use frontier models for even richer or more personalized critique.

**Local LLM support**: The app now has a first-class integration with **LM Studio**. If you are running `google/gemma-4-e4b` (or any OpenAI-compatible model) locally:

1. In LM Studio, load the model and start the local server (default: `http://localhost:1234`).
2. Go to Settings (gear icon) → set the Base URL and Model name if different from defaults.
3. On any feedback screen, click **"Generate with Gemma"**.

The exact same rich prompt used for cloud models is sent to your local Gemma. The response is displayed beautifully below the heuristic critique. Perfect for private, offline, or low-cost high-quality feedback.

## Higher-fi directions (not yet implemented)

- Real video posture / hand-position analysis (MediaPipe / MoveNet)
- More accurate onset + beat tracking (WebAssembly + aubio / Essentia)
- Actual audio feature extraction via heavier libraries or server worker
- Note-by-note transcription + alignment to sheet music
- Voice-only language pronunciation mode

## Ethical Topics (embedded in the app)

The in-app **Ethics & Impact** view summarizes the points from the original brief:
- Reliability & autonomy (stylistic choices misflagged, cultural bias, overconfident output)
- Direct effects on students & teachers (over-reliance vs democratization)
- Privacy (recordings of minors are especially sensitive)
- Economic effects on independent music teachers
- Data commodification risks
- Policy & future speculation (AI teachers as luxury good? expressive flatness?)

This prototype deliberately keeps everything local to model responsible defaults.

## Tech notes

- Vite + React 19 + TypeScript + Tailwind v4
- Pure client-side DSP (no heavy deps): autocorrelation pitch, RMS windowing, simple onset detection
- Framer Motion + Sonner for polish
- Fully self-contained — great for quick demos and further vibecoding

Built to explore the full request: storyboard + lo-fi concepts + real vibecoded interface with recording + analysis + LLM prompting integration.

Enjoy practicing!