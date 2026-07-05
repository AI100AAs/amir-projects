# ✨ StyleMate

Your pocket stylist. Upload a photo, set your vibe and occasion, and get
tailored outfit ideas with shoppable links — all running locally on your own
computer via LM Studio + Gemma.

## Features

- 📷 **Upload, drag-and-drop, or paste** a photo
- 🎯 **Tailored prompts** — occasion, vibe, season, budget, and free-text notes
- ⚡ **Live streaming** suggestions (text appears as the model thinks)
- 🛍 **Shoppable links** — suggested items become Google Shopping searches
- 🖼 **History gallery** — every look is saved locally; reopen or delete any
- 🌙 **Light / dark theme**
- 🟢 **Connection indicator** — tells you if the model is reachable
- 🔒 **Private** — your photos never leave your machine

## One-time setup

1. **Start the model in LM Studio**
   - Open LM Studio → load `google/gemma-4-e4b` (a vision-capable model)
   - Developer tab → **Start Server** (defaults to `http://localhost:1234`)

2. **Install dependencies** (in Terminal, in this folder)
   ```bash
   cd ~/Desktop/outfit-app
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Run it

```bash
cd ~/Desktop/outfit-app
source venv/bin/activate
uvicorn app:app --reload
```

Open **http://localhost:8000**.

## Configuration (optional)

Override via environment variables before running:

```bash
export MODEL_NAME="your-model-id"                       # default: google/gemma-4-e4b
export LMSTUDIO_BASE="http://localhost:1234/v1"         # if you changed the port
export STYLEMATE_DB="/path/to/stylemate.db"             # where history is stored
```

## Troubleshooting

- **Status dot is red / "model offline"** → start the LM Studio server and load
  the model (Developer tab).
- **Suggestions ignore the photo** → make sure a **vision-capable** Gemma is
  loaded; text-only models can't see images.
- **"That file doesn't look like a valid image"** → use a JPG or PNG under 12 MB.

## How it works

```
Browser (static/) ── photo + prefs ──▶ FastAPI (app.py)
                                          │  Pillow: validate, auto-orient, resize
                                          ▼
                                   LM Studio  (Gemma vision)
                                          │  streamed tokens
                                          ▼
                        Browser renders live ──▶ saved to SQLite (db.py)
```

## Project layout

| File | Purpose |
|------|---------|
| `app.py` | FastAPI server, image processing, streaming, endpoints |
| `db.py` | SQLite history helper |
| `static/index.html` | Page markup |
| `static/styles.css` | Theme + layout |
| `static/app.js` | Upload, streaming, history, links, theme |

Everything stays on your machine — no photos are uploaded to the internet.
