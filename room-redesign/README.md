# Room Redesign Mockup

A local FastAPI web app for generating room redesign mockups on an Apple Silicon Mac.

Default image model:

```text
prism-ml/bonsai-image-binary-4B-mlx-1bit
```

This is the packed Bonsai Image Binary 4B MLX 1-bit model. It is the small Apple Silicon payload, not the larger unpacked Diffusers checkpoint.

## Run On An M4 Pro MacBook

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

If the Prism MLX fork build says the Metal Toolchain is missing, run:

```bash
xcodebuild -downloadComponent MetalToolchain
pip install -r requirements.txt
```

Open:

```text
http://127.0.0.1:8000
```

On the first real generation, the app downloads the MLX model into:

```text
models/bonsai-image-4B-binary-mlx
```

After that, generation runs locally. To force offline-only mode after the model is cached:

```bash
export ROOM_LOCAL_FILES_ONLY=1
```

## What The App Does

- Upload one JPG, PNG, or WebP room photo.
- Type a short redesign prompt.
- Pick a room type and one of four style presets.
- Optionally use local Gemma in LM Studio to rewrite the prompt.
- Review the exact enhanced prompt before it is sent to the image model.
- Tune image size, steps, guidance, image strength, and seed.
- Watch an in-page progress bar while prompt preparation or generation is running.
- Generate 2 local image-to-image room redesign variations.
- Click any gallery image to zoom in.
- Save uploads in `static/uploads`.
- Save generated images in `static/generated`.
- Save recent run metadata in `data/history.json`.

## Model Settings

The default `.env` is set for the quantized Bonsai MLX model:

```bash
ROOM_MODEL_ID=prism-ml/bonsai-image-binary-4B-mlx-1bit
ROOM_BACKEND=bonsai-mlx
ROOM_MLX_MODEL_DIR=models/bonsai-image-4B-binary-mlx
ROOM_MLX_VAE=full
ROOM_MLX_DENSE_FALLBACK=0
ROOM_MLX_EVICT_TRANSFORMER=1
ROOM_MLX_LAZY_COMPONENTS=1
ROOM_IMAGE_SIZE=512
ROOM_STEPS=4
ROOM_GUIDANCE=1.0
ROOM_IMAGE_STRENGTH=0.55
ROOM_LOCAL_FILES_ONLY=0
```

The prompt optimizer is optional:

```bash
ROOM_LMSTUDIO_ENABLED=1
ROOM_PROMPT_HELPER_DEFAULT=0
ROOM_LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
ROOM_LMSTUDIO_MODEL=google/gemma-4-e2b-qat
```

`ROOM_LMSTUDIO_ENABLED=1` means the helper is available. `ROOM_PROMPT_HELPER_DEFAULT=0` keeps the checkbox off until you choose it in the app.

`ROOM_MLX_DENSE_FALLBACK=0` keeps the app on the smallest-footprint native 1-bit path. Set it to `1` only as a compatibility fallback if the stock MLX package cannot load Prism's native 1-bit Metal kernel; that fallback dequantizes packed 1-bit weights to dense bf16 at runtime, which uses more memory.

`ROOM_MLX_EVICT_TRANSFORMER=1` and `ROOM_MLX_LAZY_COMPONENTS=1` reduce resident memory after each generation by unloading large image-generation components. Generation may start a little slower, but the app is friendlier to a local laptop.

## Prompt Review Flow

The app intentionally uses two local steps:

1. `Prepare Prompt` saves the uploaded image locally, appends the style preset, optionally asks LM Studio/Gemma to improve the wording, and shows the exact prompt.
2. `Generate 2 Mockups` sends that reviewed prompt plus the saved room image into the local Bonsai image model.

## Local Storage

Downloaded models:

```text
models/bonsai-image-4B-binary-mlx
```

Uploaded room photos:

```text
static/uploads
```

Generated mockups:

```text
static/generated
```

Run history:

```text
data/history.json
```

## Fallback To Full FLUX.2 Klein

Use this only if the packed MLX model cannot work in your environment:

```bash
export ROOM_BACKEND=flux-klein-full
export ROOM_FULL_FALLBACK_MODEL_ID=black-forest-labs/FLUX.2-klein-4B
```

That fallback is much larger and may require Hugging Face access. The previous `prism-ml/bonsai-image-binary-4B-unpacked` path is the reason you saw a much bigger download.

## Backend Swap Point

The main swap point is:

```python
generate_redesign(input_image, prompt, style, variation, settings)
```

The default implementation uses MFlux/MLX:

```python
Flux2Klein(... klein_fast_precision="1bit").generate_image(
    image_path="uploaded_room.png",
    image_strength=0.55,
    prompt="...",
)
```

For form-only troubleshooting, run with:

```bash
export ROOM_BACKEND=mock
```

Useful local endpoints:

```text
GET /api/health
GET /api/lmstudio/status
```

## Troubleshooting

- If `/api/health` says the MLX model files are not ready, leave `ROOM_LOCAL_FILES_ONLY=0` and generate once so Hugging Face can cache the model.
- If you see `No Metal device available`, run the app from your normal macOS desktop session on the M4 Pro.
- If you see an `affine_qmv` kernel error, install Prism's pinned MLX fork for the true smallest-footprint path, or temporarily set `ROOM_MLX_DENSE_FALLBACK=1`.
- If LM Studio is off, only prompt enhancement is skipped. Image generation still runs.
- If Hugging Face requires access, run `huggingface-cli login` inside the virtual environment.
