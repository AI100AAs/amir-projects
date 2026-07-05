# StoryWhisper — Stories That Sound Like You

Type a topic, a local AI writes a children's story, and then reads it aloud in a voice that sounds like yours. Everything runs on your Mac — no cloud, no API keys.

## Features

- **Real LLM story generation** via LM Studio with live token-by-token streaming
- **Real voice cloning** using XTTS-v2 (Coqui) — zero-shot cloning from a 6-second sample
- **Story revision** — give plain-language feedback and the model rewrites
- **Story options** — theme, age range, length, character name
- **Neural TTS fallback** — edge-tts with pitch-matched voices if you don't want cloning
- **Story library** — save, reload, and delete stories (stored locally)
- **Copy & download** — copy story text or download as .txt
- **Dark mode** — toggle in the navbar or press `D`
- **Keyboard shortcuts** — `D` (dark mode), `H` (library), `Space` (play/pause), `Esc` (close)
- **Privacy** — voice samples and stories never leave your computer
- **Safety** — consent checkbox, voice-cloning risk warning, AI-generated disclosure

## AI methods used

| Step | Method | Tool |
|------|--------|------|
| Story generation & revision | Large language model (streaming) | LM Studio (`google/gemma-4-e4b`) |
| Voice cloning | Zero-shot voice cloning | XTTS-v2 (Coqui TTS, PyTorch) |
| Voice analysis | Pitch detection (autocorrelation) | Web Audio API (browser) |
| Backup narration | Neural text-to-speech | edge-tts (Microsoft Edge neural voices) |

## Quick start

### 1. Set up LM Studio

1. Open **LM Studio** and download/load a model (e.g. `google/gemma-4-e4b`).
2. Go to the **Developer** (Local Server) tab → **Start Server**.
3. Confirm the server is at `http://localhost:1234/v1`.

### 2. Install ffmpeg (for voice cloning audio conversion)

```bash
brew install ffmpeg
```

### 3. Set up and run

```bash
cd children-story
./setup.sh
./run.sh
```

Then open **http://127.0.0.1:8765**.

The first time you use voice cloning, the XTTS-v2 model (~1.8 GB) will download automatically. This takes a few minutes depending on your connection. Subsequent uses load from cache.

## Using Ollama instead of LM Studio

```bash
ollama serve
ollama pull llama3.2
LLM_BACKEND=ollama LLM_MODEL=llama3.2 ./run.sh
```

## Configuration (environment variables)

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_BACKEND` | `lmstudio` | `lmstudio` or `ollama` |
| `LLM_BASE_URL` | `http://localhost:1234/v1` | Backend base URL |
| `LLM_MODEL` | `google/gemma-4-e4b` | Model name |
| `LLM_TIMEOUT` | `300` | LLM request timeout (seconds) |
| `PORT` | `8765` | Server port |

## Project layout

```
children-story/
├── server.py          # FastAPI backend (LLM + XTTS-v2 cloning + edge-tts)
├── requirements.txt
├── setup.sh           # create venv + install deps
├── run.sh             # start uvicorn
├── .gitignore
└── static/
    ├── index.html     # main UI
    ├── style.css      # styles + dark mode
    ├── app.js         # all frontend logic
    └── audio/         # generated narration audio
```

## Safety notes

- Only clone a voice you own or have permission to use.
- Voice cloning can be misused to impersonate people — never clone someone else's voice without consent.
- Every narration is labeled as AI-generated.
