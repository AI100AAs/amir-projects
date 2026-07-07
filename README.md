Sample projects for **AI 100** at UBC, by **Amir**.

## For AI agents

If you are an LLM agent pulling this repo to run or modify a project, read **[AGENTS.md](AGENTS.md)** first. It has:

- Exact `cd` paths (including folders with spaces)
- Run commands, ports, and LM Studio setup
- Port collision warnings and common failure fixes
- A step-by-step workflow template

Each project may also have its own `README.md` with project-specific detail.

## Projects

| Folder | Description |
|--------|-------------|
| `ai-coach` | Personal-trainer web app with webcam pose tracking, rep counting, and voice coaching via a local LLM. |
| `ai-pet` | Virtual pet companion with chat, mood stats, journal, mini-games, and a Node backend. |
| `bikekitchen` | Interactive bike repair guide with component diagrams, step-by-step guides, and an AI repair assistant. |
| `children-story` | Mac app that generates children's stories and reads them aloud with cloned or neural TTS. |
| `code-tldr` | Codebase explorer that ingests GitHub repos and uses AI for file explanations and chat. |
| `code-translator` | Local-first code migration studio with side-by-side editors, risk scoring, and LLM translation. |
| `code-translator2` | Regex- and LLM-based code translator with compare mode, diff view, history, and PWA support. |
| `eli5` | News app that summarizes articles in plain language, finds related links, and runs ethical analysis. |
| `fake-news` | Fake-news detector that extracts claims, cross-checks them with RAG, and scores credibility. |
| `fridge bad` | Earlier FridgeAI iteration for fridge inventory, meal ideas, shopping lists, and weekly planning. |
| `fridge good` | Polished FridgeAI kitchen assistant with photo scan, expiry tracking, recipes, and meal planner. |
| `fridgeai-prototype` | Standalone single-file FridgeAI meal-planner UI prototype (no build step). |
| `monopoly` | Fortune Avenue — polished 40-space Monopoly-style board game for 2–4 local players. |
| `monopoly-gemma4` | Monopoly experiments (browser + Python CLI). |
| `monopoly-gpt5.5` | Metro Mogul — self-contained browser Monopoly-style property-trading game. |
| `monopoly-qwen3.6` | Monopoly implementations in Python (CLI and GUI) and a modern HTML board-game UI. |
| `music` | Records instrument/voice performances, analyzes audio locally, and generates practice feedback. |
| `outfit-app` | Upload a photo and get locally generated outfit ideas with shoppable links via vision LLM. |
| `room-redesign` | Apple Silicon app that generates room redesign mockups with an MLX image model. |
| `roomba` | Pet-robot simulator with behavior flowcharts, ethics prompts, and a local AI lab. |
| `scheduler` | UBC Vancouver degree-planning prototype with prerequisite validation and multi-scenario schedules. |
| `study-buddy` | Chrome extension study coach with Pomodoro, distraction check-ins, and focus dashboard. |
| `tictactoe` | Override — tic-tac-toe variant where each player gets two overrides to replace an opponent's mark. |
| `tictactoe new rules` | Alternate copy of Override tic-tac-toe with the same override-token rules. |
| `ubc-nav` | Campus navigation that routes by mood and preferences (shade, quiet, scenic) over a walking graph. |
| `wearable-health` | Mobile-style prototype simulating wearable sensors with charts and an AI health assistant. |
| `worldcup2026` | FIFA World Cup 2026 match predictor with a Monte Carlo simulation engine. |

## Quick start (humans)

Most web apps follow one of these patterns:

```bash
# Node / Vite
cd <project> && npm install && npm run dev

# Python
cd <project> && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python server.py   # or: python run.py

# Static HTML
cd <project> && python3 -m http.server 8000
# then open http://localhost:8000
```

For AI features, start **LM Studio** with the local server on port `1234` and load a model (usually `google/gemma-4-e4b`). See [AGENTS.md](AGENTS.md) for per-project requirements and ports.

## Local models

Most LLM projects run through **LM Studio** at `http://localhost:1234` (OpenAI-compatible API).

- **Gemma 4 E4B** (`google/gemma-4-e4b`) — default chat/vision model across most projects
- **Gemma 4 E2B QAT** (`google/gemma-4-e2b-qat`) — ai-coach, room-redesign (prompt helper)
- **Bonsai Image Binary 4B MLX 1-bit** (`prism-ml/bonsai-image-binary-4B-mlx-1bit`) — children-story, room-redesign (image generation)
- **XTTS-v2** — children-story (voice cloning / narration)
- **Kokoro-82M ONNX** — ai-coach (text-to-speech)
- **MediaPipe Pose Landmarker** — ai-coach (pose tracking)
- **all-MiniLM-L6-v2** + **ChromaDB** — fake-news (offline RAG embeddings)