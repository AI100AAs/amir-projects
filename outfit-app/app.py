"""
StyleMate — outfit suggestions from a photo, powered by a local Gemma vision
model served by LM Studio (OpenAI-compatible API).

Pipeline: the browser uploads a photo + style preferences -> we validate and
normalize the image with Pillow -> stream the suggestion from LM Studio back to
the browser token-by-token -> persist the finished look (with a thumbnail) to a
local SQLite history.
"""

import asyncio
import base64
import io
import json
import os

import httpx
from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps

import db

# --- LM Studio config -------------------------------------------------------
# LM Studio exposes an OpenAI-compatible server. Defaults match LM Studio's
# "Developer > Start Server" defaults. Override with env vars if you changed them.
LMSTUDIO_BASE = os.environ.get("LMSTUDIO_BASE", "http://localhost:1234/v1")
LMSTUDIO_URL = f"{LMSTUDIO_BASE}/chat/completions"
LMSTUDIO_MODELS_URL = f"{LMSTUDIO_BASE}/models"
# Preferred model name. If empty/unset, we use whatever LM Studio currently has
# loaded. This avoids "model not found" / silent empty responses when the
# configured name doesn't exactly match the loaded model id.
MODEL_NAME = os.environ.get("MODEL_NAME", "")


async def resolve_model() -> str:
    """Return the model id to call.

    Prefer the configured MODEL_NAME if it matches something LM Studio has
    loaded; otherwise fall back to the first loaded model. If we can't reach
    LM Studio, just return MODEL_NAME (or a sensible default) and let the
    request surface the connection error.
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(LMSTUDIO_MODELS_URL)
        ids = [m.get("id") for m in resp.json().get("data", []) if m.get("id")]
    except Exception:
        ids = []

    if MODEL_NAME and MODEL_NAME in ids:
        return MODEL_NAME
    if ids:
        return ids[0]
    return MODEL_NAME or "local-model"

# --- Image limits -----------------------------------------------------------
MAX_UPLOAD_BYTES = 12 * 1024 * 1024  # 12 MB
MAX_DIM = 1024                       # longest side sent to the model
THUMB_DIM = 256                      # gallery thumbnail longest side

app = FastAPI(title="StyleMate")


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


SYSTEM_PROMPT = (
    "You are StyleMate, an upbeat and tasteful personal stylist for women. "
    "You are given a photo of a person and their styling preferences. Give warm, "
    "body-positive, practical outfit advice. Always answer in this exact "
    "structure using markdown:\n\n"
    "## Outfit Ideas\n"
    "2-3 complete outfit concepts that suit the person, occasion and preferences.\n\n"
    "## Item-by-Item\n"
    "A bullet list. Each bullet starts with a bold category then a concrete, "
    "searchable item, e.g. `- **Top:** cream silk wrap blouse`. Cover Top, "
    "Bottom, Shoes, and Accessories. Keep item names specific enough to shop for.\n\n"
    "## Colors That Flatter\n"
    "A short note on colors that would suit them.\n\n"
    "Be specific and encouraging. Never comment negatively on appearance or body."
)


def build_user_prompt(occasion: str, vibe: str, season: str, budget: str, notes: str) -> str:
    parts = [f"Occasion: {occasion or 'everyday casual'}."]
    if vibe:
        parts.append(f"Preferred vibe/aesthetic: {vibe}.")
    if season:
        parts.append(f"Season/weather: {season}.")
    if budget:
        parts.append(f"Budget level: {budget}.")
    if notes:
        parts.append(f"Extra notes from me: {notes}.")
    prefs = " ".join(parts)
    return (
        "Here is a photo of me. " + prefs + " Please suggest outfits that would "
        "look great on me, tailored to these preferences."
    )


def process_image(raw: bytes) -> tuple[str, str]:
    """Validate + normalize an uploaded image.

    Returns (data_url_for_model, thumbnail_data_url). Raises HTTPException(400)
    if the bytes are not a usable image. EXIF orientation is applied so phone
    photos aren't sideways, and the image is downscaled + re-encoded to JPEG to
    keep requests fast and avoid odd source formats the model can't ingest.
    """
    if not raw:
        raise HTTPException(status_code=400, detail="No image data received.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail="That image is larger than 12 MB. Please choose a smaller photo.",
        )

    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()  # checks integrity; must reopen afterwards
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)  # honor phone orientation
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="That file doesn't look like a valid image. Try a JPG or PNG photo.",
        )

    def encode(image: Image.Image, max_dim: int, quality: int) -> str:
        im = image.copy()
        im.thumbnail((max_dim, max_dim))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=quality)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"

    full = encode(img, MAX_DIM, 85)
    thumb = encode(img, THUMB_DIM, 70)
    return full, thumb


@app.get("/api/health")
async def health():
    """Report whether LM Studio is reachable and which model we'll call.

    We give /v1/models a generous timeout because LM Studio can be slow to
    answer while a model is loaded or busy — a slow answer still means the
    server is up, so we shouldn't report "offline".
    """
    connected = False
    model = MODEL_NAME or "(auto)"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(LMSTUDIO_MODELS_URL)
        connected = resp.status_code == 200
        ids = [m.get("id") for m in resp.json().get("data", []) if m.get("id")]
        if ids:
            model = MODEL_NAME if (MODEL_NAME and MODEL_NAME in ids) else ids[0]
    except httpx.ConnectError:
        connected = False
    except httpx.HTTPError:
        # Reached the server but it was slow / errored mid-response; the server
        # is still up, so treat as connected rather than offline.
        connected = True
    return JSONResponse({"connected": connected, "model": model})


@app.post("/api/suggest")
async def suggest(
    photo: UploadFile,
    occasion: str = Form("everyday casual"),
    vibe: str = Form(""),
    season: str = Form(""),
    budget: str = Form(""),
    notes: str = Form(""),
):
    raw = await photo.read()
    loop = asyncio.get_event_loop()
    # Pillow work is CPU-bound; keep it off the event loop.
    data_url, thumb_url = await loop.run_in_executor(None, process_image, raw)

    user_prompt = build_user_prompt(occasion, vibe, season, budget, notes)
    model = await resolve_model()
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "temperature": 0.7,
        "max_tokens": 900,
        "stream": True,
    }

    prefs_summary = json.dumps(
        {"vibe": vibe, "season": season, "budget": budget, "notes": notes}
    )

    async def event_stream():
        collected: list[str] = []
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                async with client.stream("POST", LMSTUDIO_URL, json=payload) as resp:
                    if resp.status_code != 200:
                        body = (await resp.aread()).decode("utf-8", "replace")
                        yield _sse("error", {"detail": f"Model error: {body[:300]}"})
                        return
                    async for line in resp.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[len("data:"):].strip()
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            choice = chunk["choices"][0]
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
                        # Be liberal in what we accept: different LM Studio /
                        # model builds put the streamed text in delta.content,
                        # delta.reasoning_content, or (rarely) message.content.
                        delta = ""
                        d = choice.get("delta") or {}
                        delta = d.get("content") or d.get("reasoning_content") or ""
                        if not delta:
                            msg = choice.get("message") or {}
                            delta = msg.get("content") or ""
                        if delta:
                            collected.append(delta)
                            yield _sse("token", {"text": delta})
        except httpx.ConnectError:
            yield _sse(
                "error",
                {
                    "detail": (
                        f"Couldn't reach LM Studio at {LMSTUDIO_URL}. Open LM Studio, "
                        "load the model, and start the local server (Developer tab "
                        "→ Start Server)."
                    )
                },
            )
            return
        except httpx.HTTPError as e:
            yield _sse("error", {"detail": f"Connection problem: {e}"})
            return

        suggestion = "".join(collected).strip()
        if suggestion:
            entry_id = await loop.run_in_executor(
                None, db.add_entry, occasion, prefs_summary, thumb_url, suggestion
            )
            yield _sse("done", {"id": entry_id})
        else:
            yield _sse("error", {"detail": "The model returned an empty response."})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.get("/api/history")
async def history_list():
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(None, db.list_entries)
    return JSONResponse({"items": rows})


@app.get("/api/history/{entry_id}")
async def history_get(entry_id: int):
    loop = asyncio.get_event_loop()
    row = await loop.run_in_executor(None, db.get_entry, entry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    return JSONResponse(row)


@app.delete("/api/history/{entry_id}")
async def history_delete(entry_id: int):
    loop = asyncio.get_event_loop()
    ok = await loop.run_in_executor(None, db.delete_entry, entry_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found.")
    return JSONResponse({"deleted": entry_id})


# Serve the frontend. Keep this last so /api routes take precedence.
app.mount("/", StaticFiles(directory="static", html=True), name="static")
