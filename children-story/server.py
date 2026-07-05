from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import uuid
from pathlib import Path
from typing import Any, AsyncIterator, List, Optional

import httpx
import edge_tts
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).parent.resolve()
STATIC_DIR = BASE_DIR / "static"


def _patch_transformers_for_coqui() -> None:
    """Coqui TTS still imports isin_mps_friendly, which transformers 5.x removed."""
    try:
        from transformers.pytorch_utils import isin_mps_friendly  # noqa: F401
    except ImportError:
        import torch
        import transformers.pytorch_utils as pytorch_utils

        def isin_mps_friendly(elements, test_elements):
            return torch.isin(elements, test_elements)

        pytorch_utils.isin_mps_friendly = isin_mps_friendly


_patch_transformers_for_coqui()
AUDIO_DIR = STATIC_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR = Path(tempfile.gettempdir()) / "storywhisper"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Persistent voice cache: stores converted voice samples so that
# revising a story and regenerating narration doesn't require re-uploading
# or re-converting the voice sample.
VOICE_CACHE_DIR = BASE_DIR / "voice_cache"
VOICE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Image generation: stores generated story illustrations
IMAGES_DIR = STATIC_DIR / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Bonsai MLX image model (symlinked from room-redesign project)
IMG_MODEL_ID = os.environ.get("IMG_MODEL_ID", "prism-ml/bonsai-image-binary-4B-mlx-1bit")
IMG_MODEL_DIR = Path(os.environ.get("IMG_MODEL_DIR", str(BASE_DIR / "models" / "bonsai-image-4B-binary-mlx")))
IMG_STEPS = int(os.environ.get("IMG_STEPS", "4"))
IMG_GUIDANCE = float(os.environ.get("IMG_GUIDANCE", "1.0"))
IMG_SIZE = int(os.environ.get("IMG_SIZE", "768"))

# ---------------------------------------------------------------------------
# Backend config
# ---------------------------------------------------------------------------
LLM_BACKEND = os.environ.get("LLM_BACKEND", "lmstudio").lower()
DEFAULT_MODEL = os.environ.get("LLM_MODEL", "google/gemma-4-e4b")
LLM_TIMEOUT = float(os.environ.get("LLM_TIMEOUT", "300"))
FFMPEG = shutil.which("ffmpeg")

if LLM_BACKEND == "ollama":
    LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:11434").rstrip("/")
    CHAT_PATH = "/api/chat"
    MODELS_PATH = "/api/tags"
else:
    LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:1234/v1").rstrip("/")
    CHAT_PATH = "/chat/completions"
    MODELS_PATH = "/models"

# Set Coqui TOS agreement early so the model loads without a prompt
os.environ.setdefault("COQUI_TOS_AGREED", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

app = FastAPI(title="StoryWhisper")
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ---------------------------------------------------------------------------
# Voice profiles (for neural TTS mode)
# ---------------------------------------------------------------------------
VOICE_MAP = {
    "deeper": "en-US-ChristopherNeural",
    "lower": "en-US-GuyNeural",
    "higher": "en-US-AriaNeural",
    "younger": "en-US-AnaNeural",
}
VOICE_LABELS = {
    "deeper": "Christopher (deep)",
    "lower": "Guy (warm, low)",
    "higher": "Aria (bright, high)",
    "younger": "Ana (young)",
}
DEFAULT_PROFILE = "higher"

THEME_LABELS = {
    "bedtime": "gentle bedtime story",
    "funny": "funny adventure",
    "magical": "magical fantasy",
    "nature": "educational story about nature",
    "brave": "story about being brave",
}
AGE_LABELS = {"3-5": "ages 3 to 5", "5-7": "ages 5 to 7", "7-9": "ages 7 to 9"}
LENGTH_PARAS = {"short": "2 to 3", "medium": "4 to 5", "long": "6 to 8"}

XTTS_MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"


# ---------------------------------------------------------------------------
# XTTS-v2 voice cloning — lazy loaded
# ---------------------------------------------------------------------------
_xtts_model = None
_xtts_lock = asyncio.Lock()


def _is_xtts_installed() -> bool:
    try:
        import importlib
        return importlib.util.find_spec("TTS") is not None
    except Exception:
        return False


def _evict_img_model():
    """Free the image model from memory to make room for XTTS."""
    global _img_model
    if _img_model is not None:
        _img_model = None
        import gc
        gc.collect()
        try:
            import mlx.core as mx
            mx.clear_cache()
        except Exception:
            pass


def _load_xtts_sync():
    """Load XTTS model (blocking — call from thread)."""
    global _xtts_model
    if _xtts_model is not None:
        return _xtts_model
    _evict_img_model()  # free image model memory before loading XTTS
    from TTS.api import TTS
    import torch
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"
    _xtts_model = TTS(XTTS_MODEL_NAME).to(device)
    return _xtts_model


async def get_xtts():
    """Load XTTS model in a thread, with a lock so we don't double-load."""
    global _xtts_model
    if _xtts_model is not None:
        return _xtts_model
    async with _xtts_lock:
        if _xtts_model is not None:
            return _xtts_model
        _xtts_model = await asyncio.to_thread(_load_xtts_sync)
    return _xtts_model


def _run_xtts_sync(text: str, speaker_wav: str, out_path: str):
    """Run XTTS inference (blocking — call from thread)."""
    tts = _xtts_model
    tts.tts_to_file(
        text=text,
        speaker_wav=speaker_wav,
        language="en",
        file_path=out_path,
        split_sentences=True,
    )


def _convert_audio_sync(in_path: str, out_path: str, sr: int = 24000) -> bool:
    """Convert any audio file to wav using ffmpeg. Returns True on success."""
    if not FFMPEG:
        return False
    try:
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-ar", str(sr), "-ac", "1", "-f", "wav", out_path],
            capture_output=True, timeout=30,
        )
        return r.returncode == 0
    except Exception:
        return False


def _to_mp3_sync(wav_path: str, mp3_path: str) -> str:
    """Convert wav to mp3. Returns mp3 path on success, wav path on failure."""
    if not FFMPEG:
        return wav_path
    try:
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "128k", mp3_path],
            capture_output=True, timeout=60,
        )
        if r.returncode == 0:
            return mp3_path
    except Exception:
        pass
    return wav_path


def _adjust_speed_sync(in_path: str, out_path: str, rate: float) -> str:
    """Adjust playback speed with ffmpeg atempo. Returns new path."""
    if not FFMPEG or abs(rate - 1.0) < 0.01:
        return in_path
    try:
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", in_path, "-filter:a", f"atempo={rate}", out_path],
            capture_output=True, timeout=60,
        )
        if r.returncode == 0:
            return out_path
    except Exception:
        pass
    return in_path


# ---------------------------------------------------------------------------
# Bonsai MLX image generation — lazy loaded
# ---------------------------------------------------------------------------
_img_model = None
_img_lock = asyncio.Lock()
_img_lock_gen = threading.Lock()


def _is_img_runtime_available() -> bool:
    """Check if the Bonsai MLX runtime (backend + mflux) is importable."""
    try:
        import importlib

        for module in ("backend", "mflux"):
            if importlib.util.find_spec(module) is None:
                return False
        return True
    except Exception:
        return False


def _is_img_model_available() -> bool:
    """Check if the Bonsai MLX model files are present."""
    markers = [
        IMG_MODEL_DIR / "transformer-packed-mflux",
        IMG_MODEL_DIR / "text_encoder-mlx-4bit",
        IMG_MODEL_DIR / "tokenizer",
    ]
    return _is_img_runtime_available() and all(p.exists() for p in markers)


def _install_dense_fallback():
    """Install the dense fallback for the 1-bit Metal kernel.
    Required on some Apple Silicon setups where the native kernel isn't available."""
    try:
        from mflux.models.flux2.model.flux2_transformer.klein_fast import blocks
    except ImportError:
        return

    if getattr(blocks, "_sw_dense_fallback_installed", False):
        return

    original_make_linear = blocks._make_linear
    native_available = None

    def dequantize_packed_weight(weight):
        import numpy as np
        import mlx.core as mx

        bits = weight.bits
        values_per_word = 32 // bits
        max_q = (1 << bits) - 1

        packed = np.asarray(weight.packed)
        shifts = (np.arange(values_per_word, dtype=np.uint32) * bits).reshape(1, 1, values_per_word)
        q = ((packed[:, :, None] >> shifts) & max_q).astype(np.float32)
        rows = q.shape[0]
        cols = q.shape[1] * values_per_word
        q = q.reshape(rows, cols).reshape(rows, -1, weight.group_size)

        scales = np.asarray(weight.scales.astype(mx.float32))[:, :, None]
        biases = np.asarray(weight.biases.astype(mx.float32))[:, :, None]
        dense = (q * scales + biases).reshape(rows, cols)
        return mx.array(dense).astype(mx.bfloat16)

    def make_linear_with_dense_fallback(weight, precision, group_size):
        nonlocal native_available
        if isinstance(weight, blocks.PackedWeight):
            if native_available is not False:
                try:
                    layer = original_make_linear(weight, precision, group_size)
                    native_available = True
                    return layer
                except RuntimeError as error:
                    if "Unable to load kernel" not in str(error):
                        raise
                    native_available = False
            return blocks.DenseLinearKernel(dequantize_packed_weight(weight))
        return original_make_linear(weight, precision, group_size)

    blocks._make_linear = make_linear_with_dense_fallback
    blocks._sw_dense_fallback_installed = True


def _evict_xtts():
    """Free the XTTS model from memory to make room for image generation."""
    global _xtts_model
    if _xtts_model is not None:
        del _xtts_model
        _xtts_model = None
        import gc
        gc.collect()
        try:
            import torch
            if hasattr(torch, "mps") and hasattr(torch.mps, "empty_cache"):
                torch.mps.empty_cache()
        except Exception:
            pass


def _load_img_model_sync():
    """Load the Bonsai MLX image model (blocking — call from thread)."""
    global _img_model
    if _img_model is not None:
        return _img_model

    _evict_xtts()  # free XTTS memory before loading image model
    _install_dense_fallback()

    # Import the eviction patch — required for slim checkpoints that only have
    # transformer-packed-mflux/ (no standard transformer/ directory).
    # This patches Flux2Initializer.load_transformer_and_vae to handle packed format.
    from backend import eviction  # noqa: F401
    from backend import text_encoder_4bit  # noqa: F401

    from mflux.models.flux2.variants import Flux2Klein

    model_dir = str(IMG_MODEL_DIR)
    _img_model = Flux2Klein(
        model_path=model_dir,
        use_klein_fast_transformer=True,
        klein_fast_precision="1bit",
        vae_variant="full",
        evict_text_encoder=True,
    )
    _img_model._studio_te_4bit = True
    return _img_model


async def get_img_model():
    """Load image model in a thread, with a lock."""
    global _img_model
    if _img_model is not None:
        return _img_model
    async with _img_lock:
        if _img_model is not None:
            return _img_model
        _img_model = await asyncio.to_thread(_load_img_model_sync)
    return _img_model


def _generate_illustration_sync(prompt: str, out_path: str, seed: int, width: int, height: int):
    """Generate an illustration using the Bonsai model (blocking)."""
    model = _img_model
    with _img_lock_gen:
        result = model.generate_image(
            seed=seed,
            prompt=prompt,
            num_inference_steps=IMG_STEPS,
            height=height,
            width=width,
            guidance=IMG_GUIDANCE,
            image_path=None,  # text-to-image mode (no conditioning image)
            scheduler="flow_match_euler_discrete",
            max_sequence_length=512,
            evict_transformer=True,
        )
    result.save(path=out_path, overwrite=True)


ILLUSTRATION_PROMPT_SYSTEM = (
    "You write vivid, short illustration prompts for a children's storybook AI image generator. "
    "Given a story, describe a single scene from the story as a children's book illustration. "
    "Be specific about characters, setting, colors, and mood. "
    "Style: soft watercolor children's book illustration, warm colors, gentle, whimsical, cute. "
    "Return ONLY the illustration prompt, no commentary, no quotes, under 80 words."
)

ILLUSTRATION_STYLES = {
    "watercolor": "soft watercolor children's book illustration, warm pastel colors, gentle and whimsical",
    "cartoon": "colorful cartoon children's illustration, bold outlines, bright cheerful colors, fun and playful",
    "storybook": "classic storybook illustration, soft pencil and watercolor, warm nostalgic feel, detailed",
    "pixel": "cute pixel art children's illustration, 16-bit retro style, colorful, charming",
}


def clean_text_for_narration(text: str) -> str:
    """Strip TITLE:/MORAL: labels and format for natural narration."""
    text = re.sub(r"TITLE:\s*", "", text)
    text = re.sub(r"MORAL:\s*", "The moral of the story is: ", text)
    text = re.sub(r"\n{2,}", ". ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class StoryReq(BaseModel):
    topic: str
    model: Optional[str] = None
    theme: str = "bedtime"
    age_range: str = "5-7"
    length: str = "medium"
    character_name: str = ""


class ReviseReq(BaseModel):
    story: str
    feedback: str
    model: Optional[str] = None
    theme: str = "bedtime"
    age_range: str = "5-7"
    length: str = "medium"


class NarrateReq(BaseModel):
    text: str
    voice_profile: str = DEFAULT_PROFILE
    rate: float = Field(default=1.0, ge=0.5, le=2.0)


# ---------------------------------------------------------------------------
# LLM helpers
# ---------------------------------------------------------------------------
async def list_models() -> List[str]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{LLM_BASE_URL}{MODELS_PATH}")
            if r.status_code != 200:
                return []
            data = r.json()
            if LLM_BACKEND == "ollama":
                return [m.get("name", "") for m in data.get("models", [])]
            return [m.get("id", "") for m in data.get("data", [])]
    except Exception:
        return []


def build_story_prompt(topic: str, theme: str, age_range: str, length: str, character_name: str) -> str:
    theme_desc = THEME_LABELS.get(theme, THEME_LABELS["bedtime"])
    age_desc = AGE_LABELS.get(age_range, AGE_LABELS["5-7"])
    para_count = LENGTH_PARAS.get(length, LENGTH_PARAS["medium"])
    parts = [f"Story topic: {topic}", f"Style: a {theme_desc}", f"Target audience: {age_desc}", f"Length: {para_count} short paragraphs"]
    if character_name.strip():
        parts.append(f"Main character's name: {character_name.strip()}")
    return "\n".join(parts)


def build_revision_prompt(story: str, feedback: str, theme: str, age_range: str, length: str) -> str:
    age_desc = AGE_LABELS.get(age_range, AGE_LABELS["5-7"])
    para_count = LENGTH_PARAS.get(length, LENGTH_PARAS["medium"])
    return (
        f"Here is the current story:\n\n{story}\n\n"
        f"Revision feedback from the user: {feedback}\n\n"
        f"Please rewrite the story to follow the feedback. "
        f"Keep it suitable for {age_desc}. Keep it {para_count} short paragraphs. "
        f"Keep the TITLE:/MORAL: format."
    )


STORY_SYSTEM = (
    "You are a kind children's story author. Write a gentle, original, short story. "
    "Rules: warm and friendly. Never scary, sad, or violent. "
    "The VERY FIRST line must be 'TITLE: ' followed by a short story title. "
    "The VERY LAST line must be 'MORAL: ' followed by a one-sentence moral. "
    "Do not add any other headings, labels, or markdown."
)

REVISE_SYSTEM = (
    "You are a kind children's story author. Rewrite the story to follow the user's feedback. "
    "Never scary, sad, or violent. "
    "Keep the same format: first line 'TITLE: ...', last line 'MORAL: ...'. "
    "Do not add any other headings, labels, or markdown."
)


def parse_story(raw: str) -> dict:
    text = raw.strip()
    title = ""
    moral = ""
    m = re.search(r"TITLE:\s*(.+)", text)
    if m:
        title = m.group(1).strip()
        text = text.replace(m.group(0), "", 1).strip()
    m2 = re.search(r"MORAL:\s*(.+)", text, re.DOTALL)
    if m2:
        moral = m2.group(1).strip()
        text = text[: m2.start()].strip()
    paras = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    paras = [re.sub(r"\s+", " ", p) for p in paras]
    if not title:
        title = paras[0].split(".")[0][:60] if paras else "A Little Story"
    if not paras:
        paras = [text] if text else ["Once upon a time..."]
    return {"title": title, "paragraphs": paras, "moral": moral, "raw": raw.strip()}


async def chat(messages: List[dict], model: str) -> str:
    url = f"{LLM_BASE_URL}{CHAT_PATH}"
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            if LLM_BACKEND == "ollama":
                payload = {"model": model, "messages": messages, "stream": False}
            else:
                payload = {"model": model, "messages": messages, "stream": False, "temperature": 0.8}
            r = await client.post(url, json=payload)
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail=f"LLM error ({r.status_code}): {r.text[:300]}")
            if LLM_BACKEND == "ollama":
                return r.json()["message"]["content"]
            return r.json()["choices"][0]["message"]["content"]
    except HTTPException:
        raise
    except httpx.ConnectError:
        backend = "LM Studio" if LLM_BACKEND != "ollama" else "Ollama"
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to {backend} at {LLM_BASE_URL}. Make sure the server is running"
            + (" and a model is loaded." if LLM_BACKEND != "ollama" else f" and model '{model}' is pulled."),
        )
    except httpx.ReadTimeout:
        raise HTTPException(status_code=504, detail="The model took too long to respond. Try a shorter request or a smaller model.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {e}")


async def stream_chat(messages: List[dict], model: str) -> AsyncIterator[str]:
    url = f"{LLM_BASE_URL}{CHAT_PATH}"
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            if LLM_BACKEND == "ollama":
                payload = {"model": model, "messages": messages, "stream": True}
            else:
                payload = {"model": model, "messages": messages, "stream": True, "temperature": 0.8}
            async with client.stream("POST", url, json=payload) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    yield f"data: {json.dumps({'error': f'LLM error ({resp.status_code})'})}\n\n"
                    return
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        if LLM_BACKEND == "ollama":
                            obj = json.loads(line)
                            delta = obj.get("message", {}).get("content", "")
                            if delta:
                                yield f"data: {json.dumps({'text': delta})}\n\n"
                            if obj.get("done"):
                                break
                        else:
                            if line.startswith("data: "):
                                raw = line[6:]
                                if raw.strip() == "[DONE]":
                                    break
                                obj = json.loads(raw)
                                delta = obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                if delta:
                                    yield f"data: {json.dumps({'text': delta})}\n\n"
                    except json.JSONDecodeError:
                        continue
            yield "data: [DONE]\n\n"
    except httpx.ConnectError:
        backend = "LM Studio" if LLM_BACKEND != "ollama" else "Ollama"
        yield f"data: {json.dumps({'error': f'Could not connect to {backend} at {LLM_BASE_URL}'})}\n\n"
    except httpx.ReadTimeout:
        yield f"data: {json.dumps({'error': 'The model took too long. Try a shorter request.'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    models = await list_models()
    ok = len(models) > 0
    backend_label = "LM Studio" if LLM_BACKEND != "ollama" else "Ollama"
    chosen = DEFAULT_MODEL
    if ok and chosen not in models:
        chosen = models[0]
    return {
        "backend": backend_label,
        "backend_ok": ok,
        "base_url": LLM_BASE_URL,
        "models": models,
        "default_model": chosen,
        "tts": "edge-tts + XTTS-v2",
        "themes": list(THEME_LABELS.keys()),
        "ages": list(AGE_LABELS.keys()),
        "lengths": list(LENGTH_PARAS.keys()),
        "ffmpeg": FFMPEG is not None,
        "image_model": _is_img_model_available(),
        "image_styles": list(ILLUSTRATION_STYLES.keys()),
    }


@app.get("/api/voices")
async def voices():
    return {
        "profiles": [{"id": k, "label": VOICE_LABELS[k], "voice": VOICE_MAP[k]} for k in VOICE_MAP],
        "default": DEFAULT_PROFILE,
    }


@app.get("/api/xtts_status")
async def xtts_status():
    installed = _is_xtts_installed()
    loaded = _xtts_model is not None
    return {"installed": installed, "loaded": loaded, "model": XTTS_MODEL_NAME}


@app.post("/api/preload_xtts")
async def preload_xtts():
    """Preload the XTTS model so the first narration request is fast."""
    if not _is_xtts_installed():
        raise HTTPException(status_code=503, detail="Voice cloning library (coqui-tts) is not installed. Run: pip install coqui-tts torch torchaudio coqui-tts[codec]")
    try:
        await get_xtts()
        return {"ok": True, "message": "Voice cloning model loaded and ready."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load voice cloning model: {e}")


@app.post("/api/story")
async def story(req: StoryReq):
    topic = (req.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required.")
    model = req.model or DEFAULT_MODEL
    user_msg = build_story_prompt(topic, req.theme, req.age_range, req.length, req.character_name)
    messages = [{"role": "system", "content": STORY_SYSTEM}, {"role": "user", "content": user_msg}]
    raw = await chat(messages, model)
    return parse_story(raw)


@app.post("/api/story/stream")
async def story_stream(req: StoryReq):
    topic = (req.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required.")
    model = req.model or DEFAULT_MODEL
    user_msg = build_story_prompt(topic, req.theme, req.age_range, req.length, req.character_name)
    messages = [{"role": "system", "content": STORY_SYSTEM}, {"role": "user", "content": user_msg}]
    async def gen():
        async for evt in stream_chat(messages, model):
            yield evt
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/revise")
async def revise(req: ReviseReq):
    if not (req.story or "").strip():
        raise HTTPException(status_code=400, detail="Story text is required.")
    if not (req.feedback or "").strip():
        raise HTTPException(status_code=400, detail="Feedback is required.")
    model = req.model or DEFAULT_MODEL
    user_msg = build_revision_prompt(req.story, req.feedback, req.theme, req.age_range, req.length)
    messages = [{"role": "system", "content": REVISE_SYSTEM}, {"role": "user", "content": user_msg}]
    raw = await chat(messages, model)
    return parse_story(raw)


@app.post("/api/revise/stream")
async def revise_stream(req: ReviseReq):
    if not (req.story or "").strip():
        raise HTTPException(status_code=400, detail="Story text is required.")
    if not (req.feedback or "").strip():
        raise HTTPException(status_code=400, detail="Feedback is required.")
    model = req.model or DEFAULT_MODEL
    user_msg = build_revision_prompt(req.story, req.feedback, req.theme, req.age_range, req.length)
    messages = [{"role": "system", "content": REVISE_SYSTEM}, {"role": "user", "content": user_msg}]
    async def gen():
        async for evt in stream_chat(messages, model):
            yield evt
    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/narrate")
async def narrate(req: NarrateReq):
    """Neural TTS narration using edge-tts."""
    text = clean_text_for_narration((req.text or "").strip())
    if not text:
        raise HTTPException(status_code=400, detail="No story text to narrate.")
    profile = req.voice_profile if req.voice_profile in VOICE_MAP else DEFAULT_PROFILE
    voice = VOICE_MAP[profile]
    rate_pct = f"{'+' if req.rate >= 1 else ''}{int((req.rate - 1) * 100)}%"
    out_id = uuid.uuid4().hex
    outfile = AUDIO_DIR / f"{out_id}.mp3"
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate_pct)
        await communicate.save(str(outfile))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")
    return {
        "url": f"/audio/{out_id}.mp3",
        "voice": voice,
        "voice_profile": profile,
        "voice_label": VOICE_LABELS[profile],
        "rate": req.rate,
        "mode": "neural",
    }


# ---------------------------------------------------------------------------
# Illustration generation
# ---------------------------------------------------------------------------
class IllustrateReq(BaseModel):
    story: str
    style: str = "watercolor"
    model: Optional[str] = None


@app.get("/api/illustrate/status")
async def illustrate_status():
    """Check if the image generation model is available."""
    available = _is_img_model_available()
    loaded = _img_model is not None
    return {
        "available": available,
        "loaded": loaded,
        "model": IMG_MODEL_ID,
        "model_dir": str(IMG_MODEL_DIR),
        "styles": list(ILLUSTRATION_STYLES.keys()),
    }


@app.post("/api/illustrate")
async def illustrate(req: IllustrateReq):
    """Generate a story illustration using the Bonsai MLX image model."""
    if not _is_img_model_available():
        raise HTTPException(
            status_code=503,
            detail="Image generation model not found. Make sure the Bonsai MLX model is downloaded in the models/ directory.",
        )

    story_text = (req.story or "").strip()
    if not story_text:
        raise HTTPException(status_code=400, detail="Story text is required.")

    style_desc = ILLUSTRATION_STYLES.get(req.style, ILLUSTRATION_STYLES["watercolor"])
    llm_model = req.model or DEFAULT_MODEL

    # Step 1: Generate an illustration prompt from the story using the LLM
    prompt_messages = [
        {"role": "system", "content": ILLUSTRATION_PROMPT_SYSTEM},
        {"role": "user", "content": f"Story:\n{story_text}\n\nArt style: {style_desc}\n\nWrite the illustration prompt."},
    ]
    try:
        illustration_prompt = await chat(prompt_messages, llm_model)
        illustration_prompt = illustration_prompt.strip().strip('"').strip("'")
    except Exception as e:
        # Fallback: use a generic prompt from the story
        illustration_prompt = f"Children's book illustration of: {story_text[:200]}. Style: {style_desc}"

    # Step 2: Generate the image
    out_id = uuid.uuid4().hex
    out_path = str(IMAGES_DIR / f"{out_id}.png")
    seed = int.from_bytes(os.urandom(4), "big") % (2**31)

    try:
        await get_img_model()
        await asyncio.to_thread(
            _generate_illustration_sync,
            f"{illustration_prompt}. {style_desc}",
            out_path,
            seed,
            IMG_SIZE,
            IMG_SIZE,
        )
    except HTTPException:
        raise
    except ModuleNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Image generation runtime is not installed. Run ./setup.sh to install "
                "the Bonsai MLX dependencies from the room-redesign vendor packages."
            ),
        ) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")

    return {
        "url": f"/images/{out_id}.png",
        "prompt": illustration_prompt,
        "style": req.style,
        "seed": seed,
    }


@app.post("/api/illustrate/preload")
async def preload_illustrate():
    """Preload the image generation model."""
    if not _is_img_model_available():
        raise HTTPException(status_code=503, detail="Image generation model not found.")
    try:
        await get_img_model()
        return {"ok": True, "message": "Image generation model loaded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load image model: {e}")


@app.post("/api/voice/store")
async def store_voice(file: UploadFile = File(...)):
    """Upload and cache a voice sample. Returns a voice_id that can be
    reused for subsequent narration requests so the sample doesn't need
    to be re-uploaded or re-converted each time."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No voice sample file received.")

    voice_id = uuid.uuid4().hex
    suffix = Path(file.filename).suffix or ".wav"
    raw_path = TEMP_DIR / f"voice_{voice_id}{suffix}"

    with open(raw_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Convert to wav (24kHz mono, as XTTS prefers)
    wav_path = VOICE_CACHE_DIR / f"{voice_id}.wav"
    converted = await asyncio.to_thread(_convert_audio_sync, str(raw_path), str(wav_path))

    if not converted:
        # If conversion failed, try using the raw file directly (best effort)
        shutil.copy(str(raw_path), str(wav_path))

    # Clean up the raw upload
    raw_path.unlink(missing_ok=True)

    wav_size = wav_path.stat().st_size if wav_path.exists() else 0
    if wav_size == 0:
        raise HTTPException(status_code=500, detail="Voice sample conversion failed. Make sure ffmpeg is installed.")

    return {
        "voice_id": voice_id,
        "cached": True,
        "size_bytes": wav_size,
    }


@app.delete("/api/voice/{voice_id}")
async def delete_voice(voice_id: str):
    """Remove a cached voice sample."""
    wav_path = VOICE_CACHE_DIR / f"{voice_id}.wav"
    if wav_path.exists():
        wav_path.unlink()
        return {"ok": True, "message": "Voice sample removed."}
    raise HTTPException(status_code=404, detail="Voice sample not found.")


@app.post("/api/narrate/clone")
async def narrate_clone(
    text: str = Form(...),
    voice_id: str = Form(...),
    rate: float = Form(1.0),
):
    """Voice cloning narration using XTTS-v2.

    Uses a previously cached voice sample (uploaded via /api/voice/store).
    This means revising a story and regenerating narration only re-runs
    XTTS inference with the new text — no re-upload or re-conversion needed.
    """
    if not _is_xtts_installed():
        raise HTTPException(
            status_code=503,
            detail="Voice cloning library is not installed. Run: pip install coqui-tts torch torchaudio && pip install 'coqui-tts[codec]' 'transformers>=4.44,<5'",
        )

    raw_text = clean_text_for_narration(text)
    if not raw_text:
        raise HTTPException(status_code=400, detail="No story text to narrate.")

    # Look up cached voice sample
    speaker_wav = VOICE_CACHE_DIR / f"{voice_id}.wav"
    if not speaker_wav.exists():
        raise HTTPException(
            status_code=404,
            detail="Voice sample not found. Please record or upload your voice sample again.",
        )

    out_id = uuid.uuid4().hex
    raw_wav = AUDIO_DIR / f"{out_id}_raw.wav"

    try:
        # Load model (first time downloads ~1.8 GB, subsequent calls use cached model)
        await get_xtts()

        # Run inference in a thread (blocking)
        await asyncio.to_thread(_run_xtts_sync, raw_text, str(speaker_wav), str(raw_wav))

        # Convert to mp3
        mp3_path = AUDIO_DIR / f"{out_id}.mp3"
        final_audio = await asyncio.to_thread(_to_mp3_sync, str(raw_wav), str(mp3_path))

        # Adjust speed if needed
        if abs(rate - 1.0) >= 0.01:
            speed_path = AUDIO_DIR / f"{out_id}_spd.mp3"
            final_audio = await asyncio.to_thread(_adjust_speed_sync, final_audio, str(speed_path))

        # Determine final URL
        final_name = Path(final_audio).name
        url = f"/audio/{final_name}"

        # Clean up intermediate files
        if Path(raw_wav).exists() and str(raw_wav) != final_audio:
            raw_wav.unlink(missing_ok=True)
        if final_audio.endswith("_spd.mp3") and Path(str(mp3_path)).exists():
            mp3_path.unlink(missing_ok=True)

        return {
            "url": url,
            "voice": "XTTS-v2 voice clone",
            "voice_profile": "clone",
            "voice_label": "Your cloned voice",
            "rate": rate,
            "mode": "clone",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {e}")
    finally:
        # Don't delete the cached voice sample — it's reusable
        pass


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


@app.on_event("startup")
async def _startup():
    backend_label = "LM Studio" if LLM_BACKEND != "ollama" else "Ollama"
    xtts = "available" if _is_xtts_installed() else "not installed"
    img = "available" if _is_img_model_available() else "not found"
    print(f"\n  StoryWhisper backend: {backend_label} @ {LLM_BASE_URL}")
    print(f"  Default model: {DEFAULT_MODEL}")
    print(f"  Voice cloning (XTTS-v2): {xtts}")
    print(f"  Image generation (Bonsai MLX): {img}")
    print(f"  ffmpeg: {'found' if FFMPEG else 'not found'}")
    print("  StoryWhisper running:  http://127.0.0.1:8765\n")
