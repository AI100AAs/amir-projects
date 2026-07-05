"""
README - Room Redesign Mockup

Run locally:
1. Create a virtual environment:
   python3 -m venv .venv
   source .venv/bin/activate
2. Install dependencies:
   pip install -r requirements.txt
3. Start the app:
   uvicorn app:app --host 127.0.0.1 --port 8000
4. Open:
   http://127.0.0.1:8000

Local model flow:
- Bonsai Image Binary 4B MLX 1-bit receives the uploaded room photo as image input.
- Gemma in LM Studio can optionally rewrite the user's short redesign request.
- The app saves the original image, 2 generated variations, and a run history.

Model settings:
- ROOM_MODEL_ID: defaults to prism-ml/bonsai-image-binary-4B-mlx-1bit
- ROOM_MLX_MODEL_DIR: defaults to ./models/bonsai-image-4B-binary-mlx
- ROOM_BACKEND: bonsai-mlx by default; flux-klein-full is the larger fallback
- ROOM_PROMPT_HELPER_DEFAULT: defaults to 0 so local Gemma is opt-in per run
"""

import json
import os
import sys
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Annotated, Any
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen
from uuid import uuid4

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PIL import Image, ImageDraw, ImageFont, ImageOps, UnidentifiedImageError

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


APP_NAME = "Room Redesign Mockup"
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
GENERATED_DIR = BASE_DIR / "static" / "generated"
DATA_DIR = BASE_DIR / "data"
HISTORY_FILE = DATA_DIR / "history.json"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DEFAULT_BONSAI_MODEL_ID = "prism-ml/bonsai-image-binary-4B-mlx-1bit"
DEFAULT_FULL_FLUX_MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"
DEFAULT_MLX_MODEL_DIR = BASE_DIR / "models" / "bonsai-image-4B-binary-mlx"
FIRST_RUN_NOTE = (
    "First run after startup can take a while while the local model warms up. "
    "If the model folder is missing, the first run may also download the 3.42 GB MLX payload."
)

if load_dotenv is not None:
    load_dotenv(BASE_DIR / ".env")

MAX_UPLOAD_BYTES = int(os.getenv("ROOM_MAX_UPLOAD_MB", "24")) * 1024 * 1024
MAX_HISTORY_ITEMS = int(os.getenv("ROOM_HISTORY_ITEMS", "12"))

STYLE_PRESETS = {
    "Minimalist": "minimalist interior, clean lines, uncluttered, neutral colors",
    "Cozy": "cozy interior, warm lighting, soft textiles, inviting and comfortable",
    "Scandinavian": "Scandinavian interior, light wood, airy, functional, soft natural tones",
    "Modern luxury": "modern luxury interior, elegant finishes, premium materials, refined lighting",
}

ROOM_TYPES = [
    "Bedroom",
    "Living room",
    "Kitchen",
    "Dining room",
    "Home office",
    "Bathroom",
]

SAMPLE_PROMPTS = [
    "make it brighter with wood furniture and plants",
    "add warm lighting, built-in storage, and a calm color palette",
    "refresh the space with modern furniture and better natural light",
    "make it feel larger, cleaner, and more premium",
]


@dataclass
class GenerationSettings:
    room_type: str
    image_size: int
    steps: int
    guidance: float
    image_strength: float
    seed: int
    use_prompt_helper: bool


app = FastAPI(title=APP_NAME)
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

_PIPELINE_CACHE: dict[tuple[str, str, str, str], Any] = {}
_PIPELINE_LOCK = threading.Lock()
_GENERATION_LOCK = threading.Lock()
_HISTORY_LOCK = threading.Lock()


def ensure_app_folders() -> None:
    """Create local folders used by uploads, outputs, and history."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def clamp_int(value: str | int | None, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value) if value is not None and value != "" else default
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def clamp_float(value: str | float | None, default: float, minimum: float, maximum: float) -> float:
    try:
        parsed = float(value) if value is not None and value != "" else default
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def default_generation_settings() -> GenerationSettings:
    return GenerationSettings(
        room_type="Living room",
        image_size=clamp_int(os.getenv("ROOM_IMAGE_SIZE"), 512, 256, 1024),
        steps=clamp_int(os.getenv("ROOM_STEPS"), 4, 1, 40),
        guidance=clamp_float(os.getenv("ROOM_GUIDANCE"), 1.0, 0.0, 10.0),
        image_strength=clamp_float(os.getenv("ROOM_IMAGE_STRENGTH"), 0.55, 0.0, 1.0),
        seed=clamp_int(os.getenv("ROOM_SEED"), 12400, 0, 2_147_483_647),
        use_prompt_helper=prompt_helper_default_enabled(),
    )


def form_generation_settings(
    room_type: str,
    image_size: int,
    steps: int,
    guidance: float,
    image_strength: float,
    seed: str,
    use_prompt_helper: str | None,
) -> GenerationSettings:
    return GenerationSettings(
        room_type=room_type if room_type in ROOM_TYPES else "Living room",
        image_size=clamp_int(image_size, 512, 256, 1024),
        steps=clamp_int(steps, 4, 1, 40),
        guidance=clamp_float(guidance, 1.0, 0.0, 10.0),
        image_strength=clamp_float(image_strength, 0.55, 0.0, 1.0),
        seed=clamp_int(seed, 12400, 0, 2_147_483_647),
        use_prompt_helper=use_prompt_helper == "1",
    )


def safe_image_name() -> str:
    return f"{uuid4().hex}.png"


def save_uploaded_image(uploaded_file: UploadFile) -> Path:
    """Validate and save the uploaded room photo as a normalized local PNG."""
    ensure_app_folders()
    original_name = Path(uploaded_file.filename or "room.png")
    if original_name.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("Upload a JPG, PNG, or WebP room photo.")

    raw = uploaded_file.file.read()
    if not raw:
        raise ValueError("The uploaded file was empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        limit_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise ValueError(f"The uploaded image is too large. Keep it under {limit_mb} MB.")

    try:
        with Image.open(BytesIO(raw)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise ValueError("The uploaded file could not be opened as an image.") from error

    if image.width < 128 or image.height < 128:
        raise ValueError("Use a larger room photo, at least 128 x 128 pixels.")

    image.thumbnail((2500, 2500))
    output_path = UPLOAD_DIR / safe_image_name()
    image.save(output_path, optimize=True)
    return output_path


def style_prompt(user_prompt: str, style: str, room_type: str) -> str:
    """Append the selected room type and style phrase to the user's prompt."""
    style_phrase = STYLE_PRESETS.get(style, STYLE_PRESETS["Minimalist"])
    prompt = user_prompt.strip() or "redesign this room"
    return f"{prompt}. Room type: {room_type}. Style: {style_phrase}."


def model_status() -> dict[str, str]:
    """Return simple backend information for the page and health endpoint."""
    backend = configured_backend()
    if backend == "flux-klein-full":
        model_id = configured_full_model_id()
    else:
        model_id = configured_model_id()
    if backend == "bonsai-mlx":
        device = "Apple Silicon MLX"
    elif backend == "mock":
        device = "mock"
    else:
        device = os.getenv("ROOM_DEVICE", "auto")
    return {
        "backend": backend,
        "model": model_id,
        "model_dir": str(configured_mlx_model_dir()),
        "device": device,
        "prompt_helper": configured_lmstudio_model(),
        "prompt_helper_default": "on" if prompt_helper_default_enabled() else "off",
        "first_run_note": FIRST_RUN_NOTE,
    }


def mlx_model_files_status() -> dict[str, Any]:
    model_dir = configured_mlx_model_dir()
    markers = {
        "transformer": model_dir / "transformer-packed-mflux",
        "text_encoder": model_dir / "text_encoder-mlx-4bit",
        "tokenizer": model_dir / "tokenizer",
    }
    return {
        "repo_id": configured_model_id(),
        "directory": str(model_dir),
        "ready": all(path.exists() for path in markers.values()),
        "required": {name: path.exists() for name, path in markers.items()},
    }


def storage_status() -> dict[str, str]:
    return {
        "models": str(configured_mlx_model_dir()),
        "uploads": str(UPLOAD_DIR),
        "generated": str(GENERATED_DIR),
        "history": str(HISTORY_FILE),
    }


def configured_backend() -> str:
    raw = os.getenv("ROOM_BACKEND", "bonsai-mlx").strip().lower()
    aliases = {
        "bonsai": "bonsai-mlx",
        "mlx": "bonsai-mlx",
        "bonsai-binary-mlx": "bonsai-mlx",
        "binary-mlx": "bonsai-mlx",
        "full": "flux-klein-full",
        "flux": "flux-klein-full",
        "diffusers": "flux-klein-full",
        "diffusers-full": "flux-klein-full",
    }
    return aliases.get(raw, raw)


def configured_model_id() -> str:
    return os.getenv("ROOM_MODEL_ID", DEFAULT_BONSAI_MODEL_ID).strip()


def configured_full_model_id() -> str:
    return os.getenv("ROOM_FULL_FALLBACK_MODEL_ID", DEFAULT_FULL_FLUX_MODEL_ID).strip()


def configured_mlx_model_dir() -> Path:
    value = os.getenv("ROOM_MLX_MODEL_DIR", str(DEFAULT_MLX_MODEL_DIR)).strip()
    path = Path(value).expanduser()
    return path if path.is_absolute() else (BASE_DIR / path).resolve()


def configured_lmstudio_model() -> str:
    return os.getenv("ROOM_LMSTUDIO_MODEL", "google/gemma-4-e2b-qat").strip()


def env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off"}


def lmstudio_enabled() -> bool:
    return env_flag("ROOM_LMSTUDIO_ENABLED", True)


def prompt_helper_default_enabled() -> bool:
    return lmstudio_enabled() and env_flag("ROOM_PROMPT_HELPER_DEFAULT", False)


def local_files_only() -> bool:
    return env_flag("ROOM_LOCAL_FILES_ONLY", False)


def enhance_prompt_with_lmstudio(
    user_prompt: str,
    style: str,
    base_prompt: str,
    settings: GenerationSettings,
) -> tuple[str, str]:
    """Use local Gemma in LM Studio to make the Bonsai edit prompt more specific."""
    if not settings.use_prompt_helper:
        return make_bonsai_room_prompt(base_prompt, settings.room_type), "Prompt helper skipped for this run."

    base_url = os.getenv("ROOM_LMSTUDIO_BASE_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    model = configured_lmstudio_model()
    timeout = float(os.getenv("ROOM_LMSTUDIO_TIMEOUT", "45"))
    max_tokens = int(os.getenv("ROOM_LMSTUDIO_MAX_TOKENS", "700"))

    system_prompt = (
        "You write concise prompts for local image editing models. "
        "Return only the final image-editing prompt, no markdown, no bullets, no commentary. "
        "Keep room geometry, camera angle, windows, walls, and fixed architecture stable. "
        "Describe concrete decor, furniture, materials, lighting, palette, and atmosphere."
    )
    user_message = (
        f"Room type: {settings.room_type}\n"
        f"Room redesign request: {user_prompt.strip() or 'redesign this room'}\n"
        f"Style preset: {style}\n"
        f"Current draft prompt: {base_prompt}\n\n"
        "Rewrite this into one polished Bonsai/FLUX.2 Klein image-editing prompt under 120 words."
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.35,
        "max_tokens": max_tokens,
        "stream": False,
    }

    try:
        request = UrlRequest(
            f"{base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=timeout) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
        fallback = make_bonsai_room_prompt(base_prompt, settings.room_type)
        return fallback, f"Gemma unavailable; using direct prompt. {error}"

    content = (
        result.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    content = content.replace("```", "").strip()
    if not content:
        fallback = make_bonsai_room_prompt(base_prompt, settings.room_type)
        return fallback, "Gemma returned an empty prompt; using direct prompt."

    return content, f"Prompt enhanced locally with {model}."


def generate_redesign(input_image: Path, prompt: str, style: str, variation: int, settings: GenerationSettings) -> Path:
    """Single backend swap point for generated room mockups."""
    backend = configured_backend()
    if backend == "mock":
        return generate_mock_redesign(input_image, prompt, style, variation)
    if backend == "bonsai-mlx":
        return generate_with_bonsai_mlx(input_image, prompt, variation, settings)
    if backend == "flux-klein-full":
        return generate_with_full_flux(input_image, prompt, variation, settings)
    if backend == "diffusers-img2img":
        return generate_with_diffusers_img2img(input_image, prompt, variation, settings)
    raise RuntimeError(
        "Unknown ROOM_BACKEND="
        f"{backend!r}. Use 'bonsai-mlx', 'flux-klein-full', 'diffusers-img2img', or 'mock'."
    )


def generate_with_bonsai_mlx(input_image: Path, prompt: str, variation: int, settings: GenerationSettings) -> Path:
    """Generate one room redesign with the local Bonsai Binary 4B MLX 1-bit model."""
    ensure_app_folders()
    model = get_bonsai_mlx_model()
    condition_image = save_mlx_condition_image(input_image, settings.image_size)
    with Image.open(condition_image) as prepared:
        width, height = prepared.size
    output_path = GENERATED_DIR / f"{input_image.stem}_variation_{variation}.png"

    with _GENERATION_LOCK:
        generated = model.generate_image(
            seed=settings.seed + variation,
            prompt=prompt,
            num_inference_steps=settings.steps,
            height=height,
            width=width,
            guidance=settings.guidance,
            image_path=str(condition_image),
            image_strength=settings.image_strength,
            scheduler="flow_match_euler_discrete",
            max_sequence_length=512,
            evict_transformer=env_flag("ROOM_MLX_EVICT_TRANSFORMER", False),
        )

    generated.save(path=output_path, overwrite=True)
    return output_path


def get_bonsai_mlx_model():
    """Lazy-load the packed MLX Bonsai model once per local model path."""
    model_id = configured_model_id()
    model_dir = ensure_mlx_model_dir(model_id)
    cache_key = (
        "bonsai-mlx",
        model_id,
        str(model_dir),
        os.getenv("ROOM_MLX_PRECISION", "1bit").strip().lower(),
    )

    with _PIPELINE_LOCK:
        if cache_key in _PIPELINE_CACHE:
            return _PIPELINE_CACHE[cache_key]

        try:
            from backend import eviction  # noqa: F401
            from backend import text_encoder_4bit  # noqa: F401
            from mflux.models.flux2.variants import Flux2Klein
        except Exception as error:
            raise RuntimeError(
                "Could not import the local MLX Bonsai runtime. Run "
                "pip install -r requirements.txt, and make sure the vendored "
                "vendor/mflux-prism and vendor/image-studio folders are installed."
            ) from error

        install_mlx_dense_fallback()

        try:
            model = Flux2Klein(
                model_path=str(model_dir),
                use_klein_fast_transformer=True,
                klein_fast_precision=os.getenv("ROOM_MLX_PRECISION", "1bit").strip().lower(),
                vae_variant=os.getenv("ROOM_MLX_VAE", "full").strip().lower(),
                evict_text_encoder=env_flag("ROOM_MLX_EVICT_TEXT_ENCODER", True),
                lazy_components=env_flag("ROOM_MLX_LAZY_COMPONENTS", False),
                bucketed_seq_len=env_flag("ROOM_MLX_BUCKETED_SEQ_LEN", False),
            )
            model._studio_te_4bit = True
        except Exception as error:
            raise RuntimeError(
                "Could not load the Bonsai Image Binary 4B MLX 1-bit model. "
                "This backend requires Apple Silicon with Metal access. In a headless "
                "sandbox you may see 'No Metal device available', but it should run on "
                "your M4 Pro desktop session. "
                f"Model directory: {model_dir}. Original error: {error}"
            ) from error

        _PIPELINE_CACHE[cache_key] = model
        return model


def install_mlx_dense_fallback() -> None:
    """Fallback for stock MLX builds that cannot run Prism's 1-bit Metal kernel."""
    if not env_flag("ROOM_MLX_DENSE_FALLBACK", True):
        return

    from mflux.models.flux2.model.flux2_transformer.klein_fast import blocks

    if getattr(blocks, "_room_dense_fallback_installed", False):
        return

    original_make_linear = blocks._make_linear
    native_available: bool | None = None

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
    blocks._room_dense_fallback_installed = True


def ensure_mlx_model_dir(model_id: str) -> Path:
    """Download the packed MLX 1-bit repo to a local folder when needed."""
    model_dir = configured_mlx_model_dir()
    expected_markers = [
        model_dir / "transformer-packed-mflux",
        model_dir / "text_encoder-mlx-4bit",
        model_dir / "tokenizer",
    ]
    if all(path.exists() for path in expected_markers):
        return model_dir

    if local_files_only():
        raise RuntimeError(
            "The Bonsai MLX 1-bit model is not fully present locally and "
            "ROOM_LOCAL_FILES_ONLY=1 prevents downloading. Unset ROOM_LOCAL_FILES_ONLY "
            f"for the first run, or download {model_id} into {model_dir}."
        )

    try:
        from huggingface_hub import snapshot_download
    except ImportError as error:
        raise RuntimeError("huggingface_hub is missing. Run: pip install -r requirements.txt") from error

    model_dir.mkdir(parents=True, exist_ok=True)
    try:
        snapshot_download(
            repo_id=model_id,
            local_dir=str(model_dir),
            local_dir_use_symlinks=False,
            max_workers=8,
        )
    except TypeError:
        snapshot_download(
            repo_id=model_id,
            local_dir=str(model_dir),
            max_workers=8,
        )
    except Exception as error:
        raise RuntimeError(
            f"Could not download {model_id} into {model_dir}. "
            "Check your network/Hugging Face access, then restart generation."
        ) from error

    missing = [str(path.relative_to(model_dir)) for path in expected_markers if not path.exists()]
    if missing:
        raise RuntimeError(
            f"Downloaded {model_id}, but the MLX-packed files are incomplete. "
            f"Missing: {', '.join(missing)}."
        )
    return model_dir


def save_mlx_condition_image(input_image: Path, max_size: int) -> Path:
    """Create a multiple-of-32 PNG for MLX img2img conditioning."""
    image = load_bonsai_condition_image(input_image, max_size)
    condition_path = GENERATED_DIR / f"{input_image.stem}_condition_{image.width}x{image.height}.png"
    image.save(condition_path, optimize=True)
    return condition_path


def generate_with_full_flux(input_image: Path, prompt: str, variation: int, settings: GenerationSettings) -> Path:
    """Fallback path for the larger standard Diffusers FLUX.2 Klein checkpoint."""
    ensure_app_folders()
    pipe, torch = get_full_flux_pipeline()

    init_image = load_bonsai_condition_image(input_image, settings.image_size)
    generator = torch.Generator(device="cpu").manual_seed(settings.seed + variation)
    output_path = GENERATED_DIR / f"{input_image.stem}_variation_{variation}.png"

    with _GENERATION_LOCK:
        with torch.inference_mode():
            result = run_bonsai_pipeline(
                pipe=pipe,
                image=init_image,
                prompt=prompt,
                width=init_image.width,
                height=init_image.height,
                steps=settings.steps,
                guidance=settings.guidance,
                strength=settings.image_strength,
                generator=generator,
            )

    result.images[0].save(output_path)
    return output_path


def generate_with_diffusers_img2img(
    input_image: Path,
    prompt: str,
    variation: int,
    settings: GenerationSettings,
) -> Path:
    """Optional alternate img2img path for non-Bonsai models that support it."""
    ensure_app_folders()
    pipe, torch = get_img2img_pipeline()
    init_image = load_room_image(input_image, settings.image_size)
    generator = torch.Generator(device="cpu").manual_seed(settings.seed + variation)
    output_path = GENERATED_DIR / f"{input_image.stem}_variation_{variation}.png"

    with _GENERATION_LOCK:
        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                image=init_image,
                num_inference_steps=settings.steps,
                strength=settings.image_strength,
                guidance_scale=settings.guidance,
                generator=generator,
            )

    result.images[0].save(output_path)
    return output_path


def get_full_flux_pipeline():
    """Lazy-load the optional full FLUX.2 Klein Diffusers fallback."""
    try:
        import torch
        from diffusers import DiffusionPipeline
    except ImportError as error:
        raise RuntimeError("Local model packages are missing. Run: pip install -r requirements.txt") from error

    model_id = configured_full_model_id()
    device = choose_device(torch)
    dtype = choose_torch_dtype(torch, device)
    cache_key = ("flux-klein-full", model_id, device, str(dtype))

    with _PIPELINE_LOCK:
        if cache_key in _PIPELINE_CACHE:
            return _PIPELINE_CACHE[cache_key]

        try:
            pipe = load_diffusion_pipeline(
                DiffusionPipeline,
                model_id,
                dtype,
                local_files_only=local_files_only(),
            )
        except Exception as error:
            raise RuntimeError(
                "Could not load the full FLUX.2 Klein fallback through Diffusers. "
                "The default smaller backend is ROOM_BACKEND=bonsai-mlx with "
                "prism-ml/bonsai-image-binary-4B-mlx-1bit. Use this fallback only "
                "if you intentionally want the larger standard checkpoint. "
                f"Current ROOM_FULL_FALLBACK_MODEL_ID={model_id!r}. Original error: {error}"
            ) from error

        pipe = pipe.to(device)
        if hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing()
        if hasattr(pipe, "enable_vae_slicing"):
            pipe.enable_vae_slicing()

        _PIPELINE_CACHE[cache_key] = (pipe, torch)
        return _PIPELINE_CACHE[cache_key]


def get_img2img_pipeline():
    """Lazy-load an optional standard image-to-image pipeline."""
    try:
        import torch
        from diffusers import AutoPipelineForImage2Image
    except ImportError as error:
        raise RuntimeError("Local model packages are missing. Run: pip install -r requirements.txt") from error

    model_id = configured_model_id()
    device = choose_device(torch)
    dtype = choose_torch_dtype(torch, device)
    cache_key = ("diffusers-img2img", model_id, device, str(dtype))

    with _PIPELINE_LOCK:
        if cache_key in _PIPELINE_CACHE:
            return _PIPELINE_CACHE[cache_key]

        try:
            pipe = AutoPipelineForImage2Image.from_pretrained(
                model_id,
                torch_dtype=dtype,
                local_files_only=local_files_only(),
            )
        except Exception as error:
            raise RuntimeError(
                "Could not load this image-to-image model. Leave ROOM_BACKEND=bonsai-mlx "
                "for the selected Bonsai Binary MLX image-editing pipeline unless you choose another "
                f"img2img model. Current ROOM_MODEL_ID={model_id!r}. Original error: {error}"
            ) from error

        pipe = pipe.to(device)
        _PIPELINE_CACHE[cache_key] = (pipe, torch)
        return _PIPELINE_CACHE[cache_key]


def load_diffusion_pipeline(pipeline_class, model_id: str, dtype, local_files_only: bool):
    """Load a Diffusers pipeline while tolerating old/new dtype argument names."""
    try:
        return pipeline_class.from_pretrained(
            model_id,
            torch_dtype=dtype,
            local_files_only=local_files_only,
            trust_remote_code=True,
        )
    except TypeError:
        return pipeline_class.from_pretrained(
            model_id,
            dtype=dtype,
            local_files_only=local_files_only,
            trust_remote_code=True,
        )


def run_bonsai_pipeline(
    pipe,
    image: Image.Image,
    prompt: str,
    width: int,
    height: int,
    steps: int,
    guidance: float,
    strength: float,
    generator,
):
    """Call a Diffusers pipeline with the uploaded room image when supported."""
    kwargs = {
        "image": image,
        "prompt": prompt,
        "width": width,
        "height": height,
        "num_inference_steps": steps,
        "strength": strength,
        "guidance_scale": guidance,
        "generator": generator,
    }
    try:
        return pipe(**kwargs)
    except TypeError as first_error:
        if "image" in str(first_error):
            kwargs.pop("image", None)
        elif "strength" in str(first_error):
            kwargs.pop("strength", None)
        else:
            kwargs.pop("guidance_scale", None)
        try:
            return pipe(**kwargs)
        except TypeError:
            kwargs.pop("generator", None)
            try:
                return pipe(**kwargs)
            except TypeError as final_error:
                raise RuntimeError(
                    "The selected Bonsai pipeline loaded, but its generation call signature was not compatible. "
                    f"First error: {first_error}. Final error: {final_error}"
                ) from final_error


def make_bonsai_room_prompt(prompt: str, room_type: str) -> str:
    return (
        f"Edit the provided {room_type.lower()} photo into a photorealistic interior design redesign. "
        "Preserve the room geometry, camera angle, windows, walls, and fixed architectural structure. "
        "Change decor, furniture, lighting, colors, and materials according to this instruction: "
        f"{prompt}"
    )


def choose_device(torch) -> str:
    requested = os.getenv("ROOM_DEVICE", "auto").strip().lower()
    if requested != "auto":
        return requested
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def choose_torch_dtype(torch, device: str):
    requested = os.getenv("ROOM_TORCH_DTYPE", "").strip().lower()
    if requested == "bfloat16":
        return torch.bfloat16
    if requested == "float32":
        return torch.float32
    if requested == "float16":
        return torch.float16
    if device in {"mps", "cuda"}:
        return torch.float16
    return torch.float32


def load_room_image(input_image: Path, max_size: int) -> Image.Image:
    with Image.open(input_image) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")

    image.thumbnail((max_size, max_size))
    width = max(256, image.width - image.width % 16)
    height = max(256, image.height - image.height % 16)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def load_bonsai_condition_image(input_image: Path, max_size: int) -> Image.Image:
    max_size = max(256, min(max_size, 2048))
    with Image.open(input_image) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")

    image.thumbnail((max_size, max_size))
    multiple_of = 32
    width = max(256, image.width - image.width % multiple_of)
    height = max(256, image.height - image.height % multiple_of)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def generate_mock_redesign(input_image: Path, prompt: str, style: str, variation: int) -> Path:
    """Optional troubleshooting backend; not used unless ROOM_BACKEND=mock."""
    ensure_app_folders()
    with Image.open(input_image) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")

    image.thumbnail((1200, 900))
    canvas = Image.new("RGB", image.size, (255, 255, 255))
    canvas.paste(image, (0, 0))

    draw = ImageDraw.Draw(canvas, "RGBA")
    width, height = canvas.size
    label_height = max(130, height // 5)
    draw.rectangle((0, height - label_height, width, height), fill=(20, 25, 30, 215))

    font = ImageFont.load_default()
    label_lines = [
        f"Room Redesign Mockup - Variation {variation}",
        f"Style: {style}",
        wrap_text(prompt, max_chars=78),
    ]

    y = height - label_height + 16
    for line in label_lines:
        for wrapped_line in line.splitlines():
            draw.text((18, y), wrapped_line, fill=(255, 255, 255, 255), font=font)
            y += 18

    output_path = GENERATED_DIR / f"{input_image.stem}_variation_{variation}.png"
    canvas.save(output_path)
    return output_path


def wrap_text(text: str, max_chars: int) -> str:
    words = text.split()
    lines: list[str] = []
    current_line: list[str] = []

    for word in words:
        candidate = " ".join([*current_line, word])
        if len(candidate) <= max_chars:
            current_line.append(word)
            continue
        if current_line:
            lines.append(" ".join(current_line))
        current_line = [word]

    if current_line:
        lines.append(" ".join(current_line))
    return "\n".join(lines)


def friendly_generation_error(error: Exception) -> str:
    text = str(error)
    lowered = text.lower()
    if "out of memory" in lowered:
        return f"{text} Try image size 384 or fewer steps."
    if "no metal device" in lowered or "metal::load_device" in lowered:
        return (
            "MLX could not see an Apple Metal device. Run the app from your normal "
            "M4 Pro macOS session, not from a headless/container context. "
            f"Original error: {text}"
        )
    if "only set() were passed" in text:
        return (
            "That error happens when the packed MLX 1-bit repo is loaded through "
            "Diffusers instead of the MLX backend. Use ROOM_BACKEND=bonsai-mlx for "
            "prism-ml/bonsai-image-binary-4B-mlx-1bit, or ROOM_BACKEND=flux-klein-full "
            "only when you intentionally switch to the larger full FLUX.2 Klein checkpoint. "
            f"Original error: {text}"
        )
    if "401" in text or "403" in text or "gated" in lowered:
        return f"{text} If Hugging Face requires access, run huggingface-cli login in this venv."
    return text


def static_url(path: Path) -> str:
    return "/" + path.relative_to(BASE_DIR).as_posix()


def resolve_saved_upload(image_name: str) -> Path:
    """Resolve a previously uploaded image filename without allowing path traversal."""
    candidate = (UPLOAD_DIR / Path(image_name).name).resolve()
    upload_root = UPLOAD_DIR.resolve()
    if candidate.parent != upload_root or not candidate.exists():
        raise ValueError("The prepared upload could not be found. Upload the room photo again.")
    return candidate


def load_history() -> list[dict[str, Any]]:
    ensure_app_folders()
    if not HISTORY_FILE.exists():
        return []
    try:
        data = json.loads(HISTORY_FILE.read_text())
    except (OSError, json.JSONDecodeError):
        return []
    return data if isinstance(data, list) else []


def save_history(records: list[dict[str, Any]]) -> None:
    ensure_app_folders()
    HISTORY_FILE.write_text(json.dumps(records[:MAX_HISTORY_ITEMS], indent=2))


def add_history_record(record: dict[str, Any]) -> None:
    with _HISTORY_LOCK:
        records = [record, *load_history()]
        save_history(records)


def page_context(
    request: Request,
    *,
    selected_style: str = "Minimalist",
    prompt: str = "",
    settings: GenerationSettings | None = None,
    gallery: list[dict[str, str]] | None = None,
    final_prompt: str = "",
    message: str = "Ready.",
    error: str = "",
    prompt_note: str = "",
    prepared_run: dict[str, Any] | None = None,
) -> dict[str, Any]:
    settings = settings or default_generation_settings()
    return {
        "request": request,
        "app_name": APP_NAME,
        "style_presets": STYLE_PRESETS,
        "room_types": ROOM_TYPES,
        "sample_prompts": SAMPLE_PROMPTS,
        "selected_style": selected_style,
        "prompt": prompt,
        "settings": settings,
        "model_status": model_status(),
        "model_files": mlx_model_files_status(),
        "storage_status": storage_status(),
        "gallery": gallery or [],
        "final_prompt": final_prompt,
        "message": message,
        "error": error,
        "prompt_note": prompt_note,
        "prepared_run": prepared_run,
        "first_run_note": FIRST_RUN_NOTE,
        "history": load_history(),
    }


@app.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context=page_context(request, message="Ready for a room photo."),
    )


@app.get("/api/health")
async def health() -> JSONResponse:
    history = load_history()
    return JSONResponse(
        {
            "app": APP_NAME,
            "ok": True,
            "python": sys.executable,
            "model": model_status(),
            "mlx_model_files": mlx_model_files_status(),
            "folders": {
                "uploads": str(UPLOAD_DIR),
                "generated": str(GENERATED_DIR),
                "history": str(HISTORY_FILE),
            },
            "history_items": len(history),
            "pipeline_cached": len(_PIPELINE_CACHE),
        }
    )


@app.get("/api/lmstudio/status")
async def lmstudio_status() -> JSONResponse:
    base_url = os.getenv("ROOM_LMSTUDIO_BASE_URL", "http://127.0.0.1:1234/v1").rstrip("/")
    try:
        with urlopen(f"{base_url}/models", timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as error:
        return JSONResponse({"ok": False, "error": str(error), "model": configured_lmstudio_model()})

    models = [item.get("id") for item in payload.get("data", []) if item.get("id")]
    return JSONResponse(
        {
            "ok": configured_lmstudio_model() in models,
            "model": configured_lmstudio_model(),
            "available_models": models,
        }
    )


@app.post("/prepare", response_class=HTMLResponse)
async def prepare(
    request: Request,
    room_photo: Annotated[UploadFile, File()],
    prompt: Annotated[str, Form()] = "",
    style: Annotated[str, Form()] = "Minimalist",
    room_type: Annotated[str, Form()] = "Living room",
    image_size: Annotated[int, Form()] = 512,
    steps: Annotated[int, Form()] = 4,
    guidance: Annotated[float, Form()] = 1.0,
    image_strength: Annotated[float, Form()] = 0.55,
    seed: Annotated[str, Form()] = "",
    use_prompt_helper: Annotated[str | None, Form()] = None,
) -> HTMLResponse:
    settings = form_generation_settings(room_type, image_size, steps, guidance, image_strength, seed, use_prompt_helper)

    try:
        uploaded_path = save_uploaded_image(room_photo)
    except ValueError as error:
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context=page_context(
                request,
                selected_style=style,
                prompt=prompt,
                settings=settings,
                message="Upload failed.",
                error=str(error),
            ),
        )

    direct_prompt = style_prompt(prompt, style, settings.room_type)
    final_prompt, prompt_note = enhance_prompt_with_lmstudio(prompt, style, direct_prompt, settings)
    gallery = [{"label": "Original", "url": static_url(uploaded_path)}]
    prepared_run = {
        "uploaded_image_name": uploaded_path.name,
        "original_url": static_url(uploaded_path),
        "user_prompt": prompt,
        "style": style,
        "final_prompt": final_prompt,
        "prompt_note": prompt_note,
        "settings": asdict(settings),
    }

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context=page_context(
            request,
            selected_style=style,
            prompt=prompt,
            settings=settings,
            gallery=gallery,
            final_prompt=final_prompt,
            message="Review the enhanced prompt, then generate the mockups.",
            prompt_note=prompt_note,
            prepared_run=prepared_run,
        ),
    )


@app.post("/generate", response_class=HTMLResponse)
async def generate(
    request: Request,
    uploaded_image_name: Annotated[str, Form()],
    final_prompt: Annotated[str, Form()],
    prompt: Annotated[str, Form()] = "",
    style: Annotated[str, Form()] = "Minimalist",
    room_type: Annotated[str, Form()] = "Living room",
    image_size: Annotated[int, Form()] = 512,
    steps: Annotated[int, Form()] = 4,
    guidance: Annotated[float, Form()] = 1.0,
    image_strength: Annotated[float, Form()] = 0.55,
    seed: Annotated[str, Form()] = "",
    use_prompt_helper: Annotated[str | None, Form()] = None,
    prompt_note: Annotated[str, Form()] = "",
) -> HTMLResponse:
    settings = form_generation_settings(room_type, image_size, steps, guidance, image_strength, seed, use_prompt_helper)
    try:
        uploaded_path = resolve_saved_upload(uploaded_image_name)
    except ValueError as error:
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context=page_context(
                request,
                selected_style=style,
                prompt=prompt,
                settings=settings,
                message="Upload needed.",
                error=str(error),
            ),
        )

    gallery = [{"label": "Original", "url": static_url(uploaded_path)}]
    error = ""
    status = "success"
    message = "Generated 2 local redesign variations."

    try:
        generated_paths = [
            generate_redesign(uploaded_path, final_prompt, style, variation=1, settings=settings),
            generate_redesign(uploaded_path, final_prompt, style, variation=2, settings=settings),
        ]
        gallery.extend(
            [
                {"label": "Variation 1", "url": static_url(generated_paths[0])},
                {"label": "Variation 2", "url": static_url(generated_paths[1])},
            ]
        )
    except Exception as exc:
        error = friendly_generation_error(exc)
        status = "error"
        message = "The original image was saved, but local generation needs attention."

    record = {
        "id": uuid4().hex,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "style": style,
        "room_type": settings.room_type,
        "user_prompt": prompt,
        "final_prompt": final_prompt,
        "prompt_note": prompt_note,
        "settings": asdict(settings),
        "model": model_status(),
        "gallery": gallery,
        "error": error,
    }
    add_history_record(record)

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context=page_context(
            request,
            selected_style=style,
            prompt=prompt,
            settings=settings,
            gallery=gallery,
            final_prompt=final_prompt,
            message=message,
            error=error,
            prompt_note=prompt_note,
        ),
    )
