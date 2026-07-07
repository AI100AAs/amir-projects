# Agent instructions

This file is for **LLM coding agents** (Cursor, Codex, Claude Code, etc.) that clone this repo and need to run, debug, or extend a specific project without human hand-holding.

Humans: start with [README.md](README.md) for an overview. Use this file when you need exact commands, ports, and failure modes.

---

## Before you touch any project

1. **Identify the target folder** from the table in [README.md](README.md) or ask the user which app they mean.
2. **Read that project's own `README.md`** if it exists — it overrides generic notes here.
3. **Check port conflicts** before starting servers. Many projects default to `5173` or `8000`. Only one process can bind a port.
4. **Quote paths with spaces** when using the shell:
   ```bash
   cd "fridge bad/fridge-meal-planner"
   cd "fridge good"
   cd "tictactoe new rules"
   ```
5. **Do not commit** `.env`, `node_modules/`, `venv/`, `*.db`, large media, or downloaded models. They are gitignored.

---

## Shared prerequisites

| Tool | When needed |
|------|-------------|
| **Node 18+** | Vite/React apps (`ai-coach`, `music`, `code-translator2`, `wearable-health`, etc.) |
| **Python 3** | FastAPI/Flask apps (`fake-news`, `outfit-app`, `scheduler`, `room-redesign`, etc.) |
| **LM Studio** | Most AI features. Start server on **port 1234**. Load a model before testing LLM features. |
| **Chromium browser** | Web apps; required for `ai-coach` voice commands and `study-buddy`-style flows |
| **Apple Silicon Mac** | **Required** for `room-redesign` and `children-story` MLX/image pipelines |
| **ffmpeg** | **Required** for `children-story` audio export |

### LM Studio (default for most projects)

```
URL:   http://localhost:1234
API:   http://localhost:1234/v1/chat/completions   (OpenAI-compatible)
Model: google/gemma-4-e4b                          (chat + vision)
Alt:   google/gemma-4-e2b-qat                      (faster; ai-coach, room-redesign prompts)
```

**Enable CORS** in LM Studio (Developer settings) when the app calls LM Studio **directly from the browser** — not through a backend proxy. Projects that typically need CORS:

- `code-tldr`, `code-translator2`, `wearable-health`, `fridgeai-prototype`, `study-buddy`

### Image / voice models (special cases)

| Model | Projects |
|-------|----------|
| `prism-ml/bonsai-image-binary-4B-mlx-1bit` | `room-redesign`, `children-story` |
| XTTS-v2 (~1.8 GB download) | `children-story` voice cloning |
| Kokoro-82M (browser, ~80 MB) | `ai-coach` neural TTS |
| `all-MiniLM-L6-v2` + ChromaDB | `fake-news` (offline RAG; not LM Studio) |

---

## How to run a project (decision tree)

```
Is there a package.json with a "dev" or "start" script?
  YES → cd <project> && npm install && npm run dev   (or npm start)
  NO  ↓

Is there requirements.txt + app.py / server.py / run.py?
  YES → python3 -m venv venv && source venv/bin/activate
        pip install -r requirements.txt
        python server.py  OR  python run.py  OR  uvicorn app:app --reload
  NO  ↓

Is it a single index.html or static folder?
  YES → python3 -m http.server 8000   (then open http://localhost:8000)
        OR open the HTML file directly (file://) if no fetch/CORS issues
  NO  ↓

Is it a Chrome extension (manifest.json)?
  YES → chrome://extensions → Developer mode → Load unpacked → select folder
```

Always `cd` into the **actual app root** (see nested paths below).

---

## Project run reference

| Folder | App root | Run | URL | LLM required? |
|--------|----------|-----|-----|---------------|
| `ai-coach` | `ai-coach/` | `npm install && npm run dev` | http://localhost:5173 | Optional (offline rep counting works) |
| `ai-pet` | `ai-pet/` | `npm install && npm install --prefix backend && npm install --prefix frontend && npm start` | UI :5173, API :3001 | Optional (rule fallback) |
| `bikekitchen` | `bikekitchen/fix-me/` | `npm install && npm run dev` | http://localhost:3000 | Yes, for repair assistant |
| `children-story` | `children-story/` | `./setup.sh && ./run.sh` | http://127.0.0.1:8765 | Yes |
| `code-tldr` | `code-tldr/` | `python3 -m http.server 8000` | http://localhost:8000 | Yes (+ CORS) |
| `code-translator` | `code-translator/` | `python3 server.py` | http://127.0.0.1:8017 | Optional |
| `code-translator2` | `code-translator2/` | `npm install && npm run dev` | http://localhost:5173 | Optional (regex mode offline) |
| `eli5` | `eli5/` | `pip install -r requirements.txt && cp .env.example .env && python app.py` | http://localhost:5000 | Optional |
| `fake-news` | `fake-news/` | `pip install -r requirements.txt && python run.py` | http://localhost:8000 | No (local RAG); OpenRouter optional |
| `fridge bad` | `fridge bad/fridge-meal-planner/` | `npm install && npm run dev` | UI :5173, API :3001 | Yes, for AI features |
| `fridge good` | `fridge good/` | venv + `pip install -r requirements.txt` + `frontend/npm install` + `./start.sh` | UI :5173, API :8000 | Optional (OpenRouter or LM Studio) |
| `fridgeai-prototype` | `fridgeai-prototype/` | Open `fridgeai_claude_web.html` | file:// or static server | Yes (+ CORS) |
| `monopoly` | `monopoly/` | Open `index.html` or static server | :8000 | No |
| `monopoly-gemma4` | `monopoly-gemma4/` | Open `monopoly.html` or `python3 monopoly.py` | static / CLI | No |
| `monopoly-gpt5.5` | `monopoly-gpt5.5/` | Open `index.html` | static | No |
| `monopoly-qwen3.6` | `monopoly-qwen3.6/` | `python3 monopoly.py` or `monopoly_gui.py` or open `monopoly.html` | CLI/GUI/static | No |
| `music` | `music/` | `npm install && npm run dev` | http://localhost:5173 | Optional |
| `outfit-app` | `outfit-app/` | venv + `pip install -r requirements.txt` + `uvicorn app:app --reload` | http://localhost:8000 | Yes (vision) |
| `room-redesign` | `room-redesign/` | venv + `pip install -r requirements.txt` + `uvicorn app:app --host 127.0.0.1 --port 8000` | http://127.0.0.1:8000 | Image model required; prompt LLM optional |
| `roomba` | `roomba/` | `python3 server.py` | http://127.0.0.1:8017 | Optional |
| `scheduler` | `scheduler/` | `python3 server.py` | http://127.0.0.1:4173 | Optional |
| `study-buddy` | `study-buddy/` | Load unpacked in Chrome | extension UI | Yes, for AI check-ins |
| `tictactoe` | `tictactoe/` | Open `index.html` | file:// | No |
| `tictactoe new rules` | `tictactoe new rules/` | Open `index.html` | file:// | No |
| `ubc-nav` | `ubc-nav/` | `npm install && node server.js` | http://localhost:3000 | Optional |
| `wearable-health` | `wearable-health/` | `npm install && npm run dev` | http://localhost:5173 | Optional |
| `worldcup2026` | `worldcup2026/` | Open `index.html` or static server | :8000 | No |

### Nested / non-obvious roots

- **`bikekitchen`** — code lives in `bikekitchen/fix-me/`, not the parent folder.
- **`fridge bad`** — code lives in `fridge bad/fridge-meal-planner/`.
- **`fridge good`** — use `./start.sh` from `fridge good/` after venv + frontend deps.
- **`scheduler`** — use `python3 server.py`, **not** `python3 -m http.server`. The Python server proxies `/api/lmstudio` to LM Studio.
- **`worldcup2026`** — World Cup predictor (moved from `monopoly-gemma4/worldcup2026/`). Tuning scripts: `node tune-model.mjs`, `node eval-backtest.mjs`.

---

## Port collision map

Stop conflicting processes before starting a new project.

| Port | Projects |
|------|----------|
| 3000 | `bikekitchen`, `ubc-nav` |
| 3001 | `ai-pet` API, `fridge bad` API |
| 4173 | `ai-coach` preview, `scheduler` |
| 5000 | `eli5` |
| 5173 | `ai-coach`, `code-translator2`, `music`, `wearable-health`, `fridge bad`, `fridge good`, `ai-pet` |
| 8000 | `fake-news`, `outfit-app`, `room-redesign`, `fridge good` API |
| 8017 | `code-translator`, `roomba` |
| 8765 | `children-story` |

---

## Verification checklist (after starting)

Run these checks before declaring success:

1. **Process is listening** — `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>` returns `200` (or expected redirect).
2. **LLM features** — if the project uses LM Studio, confirm the server is up:
   ```bash
   curl -s http://localhost:1234/v1/models | head -c 200
   ```
3. **Browser apps** — open the URL in a browser; check the devtools console for CORS or 404 errors.
4. **Python apps** — watch terminal for import errors; first run may download models (sentence-transformers, etc.).
5. **Node apps** — if `npm install` fails, check Node version (`node -v` ≥ 18).

---

## Common failures and fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `EADDRINUSE` on port | Another project still running | Kill the old process or pick a different `PORT` env var |
| CORS error in browser console | LM Studio blocking browser origin | Enable CORS in LM Studio; or use the project's backend proxy |
| Camera blocked (`ai-coach`) | Not on secure context | Use `http://localhost:5173`, not LAN IP; or `npm run dev:lan` for HTTPS |
| Empty LLM responses | Model not loaded in LM Studio | Load model → Start Server → retry |
| `repository not found` on git fetch | Wrong GitHub account for `AI100AAs` remote | Use `gh auth token --user AI100AAs` for one-off fetch/push without switching default account |
| `room-redesign` import errors | Not Apple Silicon or missing Metal toolchain | Apple Silicon only; may need Xcode Metal toolchain |
| `children-story` audio fails | Missing ffmpeg | `brew install ffmpeg` |
| `scheduler` LLM proxy 404 | Used bare `http.server` | Use `python3 server.py` instead |

---

## Environment variables (by project)

Only create `.env` when the project documents it. Never commit secrets.

| Project | Key variables |
|---------|---------------|
| `ai-coach` | `LMSTUDIO_URL` (vite proxy target) |
| `ai-pet` | `backend/.env`: `PORT`, `LLM_API_BASE`, `LLM_MODEL` |
| `eli5` | `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL` |
| `fake-news` | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (optional) |
| `fridge bad` | `LMSTUDIO_URL`, `MODEL_ID`, `PORT`, `DB_PATH` |
| `fridge good` | `OPENROUTER_API_KEY`; provider in `provider_config.json` |
| `outfit-app` | `MODEL_NAME`, `LMSTUDIO_BASE`, `STYLEMATE_DB` |
| `room-redesign` | `ROOM_*` vars; `ROOM_BACKEND=mock` for UI-only |
| `ubc-nav` | `PORT`, `LMSTUDIO_BASE_URL`, `LMSTUDIO_MODEL`, `ANTHROPIC_API_KEY` |
| `code-translator` | `LMSTUDIO_URL`, `OPENAI_API_KEY`, `PORT` |

---

## Agent workflow template

When asked to run or work on a project, follow this sequence:

```
1. Confirm project folder with user (or infer from context).
2. ls <folder> and read <folder>/README.md.
3. Check if LM Studio / special hardware is required.
4. Install deps (npm install or pip install -r requirements.txt).
5. Start the correct entrypoint (see table above).
6. Verify with curl + browser.
7. If LLM features fail, check LM Studio model + CORS before changing code.
8. Make code changes only in the target project folder; avoid cross-project refactors.
```

---

## What not to do

- Do not run `git push --force` without explicit user approval.
- Do not change global git credentials or `gh auth switch` unless the user asks.
- Do not install system-wide packages without asking; prefer project-local `venv` / `npm install`.
- Do not assume all Monopoly folders are the same — they are independent implementations.
- Do not treat `fridge bad` and `fridge good` as interchangeable; they are separate codebases.