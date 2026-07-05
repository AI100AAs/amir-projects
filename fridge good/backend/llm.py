"""
Manages two LLM providers with automatic fallback:
  - openrouter: z-ai/glm-4.5-air:free  (supports vision)
  - lmstudio:   gemma-4-12b-it locally  (text only — no vision)

For vision requests (image scan), only vision-capable providers are tried.
For text requests (recipe gen), the user's selected provider is tried first.
"""

import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, APIStatusError

# Ensure .env is loaded even when this module is imported directly
load_dotenv(Path(__file__).parent.parent / ".env")

log = logging.getLogger(__name__)

PROVIDERS = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "model": "openrouter/free",
        "vision_models": ["openrouter/free"],
        "label": "OpenRouter (Free)",
        "supports_vision": True,
    },
    "lmstudio": {
        "base_url": "http://127.0.0.1:1234/v1",
        "model": "google/gemma-4-e4b",
        "vision_models": ["google/gemma-4-e4b"],
        "label": "LMStudio (Gemma 4 E4B)",
        "supports_vision": True,
    },
}

CONFIG_FILE = Path(__file__).parent.parent / "provider_config.json"
_FALLBACK_ORDER = ["openrouter", "lmstudio"]


def get_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    return {"provider": "openrouter"}


def set_provider(provider: str):
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider: {provider}")
    CONFIG_FILE.write_text(json.dumps({"provider": provider}))


def _make_client(provider: str, model_override: str = None) -> tuple[OpenAI, str]:
    cfg = PROVIDERS[provider]
    api_key = os.getenv("OPENROUTER_API_KEY", "no-key") if provider == "openrouter" else "lm-studio"
    model = model_override or cfg["model"]
    return OpenAI(base_url=cfg["base_url"], api_key=api_key), model


def check_health(provider: str) -> bool:
    try:
        client, _ = _make_client(provider)
        client.models.list()
        return True
    except Exception:
        return False


def chat(messages: list, max_tokens: int = 4096, images: list = None) -> tuple[str, str]:
    """
    Send a chat request. Returns (response_text, provider_used).

    - images: list of (base64_str, media_type) — marks this as a vision request.
      Vision requests skip providers that don't support images.
    - Falls back to the other provider on connection/auth errors.
    """
    preferred = get_config().get("provider", "openrouter")
    order = [preferred] + [p for p in _FALLBACK_ORDER if p != preferred]

    vision_request = bool(images)
    last_err = None

    for provider in order:
        cfg = PROVIDERS[provider]
        if vision_request and not cfg["supports_vision"]:
            log.info("Skipping '%s' for vision (no vision support)", provider)
            continue

        models_to_try = cfg["vision_models"] if vision_request else [cfg["model"]]

        for model_id in models_to_try:
            try:
                client, model = _make_client(provider, model_override=model_id)

                if vision_request:
                    content = []
                    for b64, media_type in images:
                        content.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{b64}"},
                        })
                    for m in messages:
                        if m["role"] == "user":
                            content.append({"type": "text", "text": m["content"]})
                    payload = [{"role": "user", "content": content}]
                else:
                    payload = messages

                response = client.chat.completions.create(
                    model=model, max_tokens=max_tokens, messages=payload
                )
                text = response.choices[0].message.content.strip()
                if provider != preferred:
                    log.warning("Fell back from '%s' to '%s'", preferred, provider)
                return text, provider

            except APIConnectionError as e:
                log.warning("Provider '%s' unreachable: %s", provider, e)
                last_err = e
            except APIStatusError as e:
                log.warning("Provider '%s' [%s] returned %s — trying next", provider, model_id, e.status_code)
                last_err = e
            except Exception as e:
                log.warning("Provider '%s' [%s] failed: %s", provider, model_id, e)
                last_err = e

    if vision_request and not any(PROVIDERS[p]["supports_vision"] for p in order):
        raise RuntimeError("No vision-capable provider available. Enable OpenRouter to scan images.")
    raise RuntimeError(f"All providers failed. Last error: {last_err}")


def clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    # If JSON is truncated (model hit token limit), try to recover by
    # closing open structures so json.loads doesn't fail entirely.
    import json
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        # Truncate to last complete top-level value by closing brackets
        for end in range(len(text), 0, -1):
            candidate = text[:end]
            # count open braces/brackets and close them
            opens = candidate.count("{") - candidate.count("}")
            opens_sq = candidate.count("[") - candidate.count("]")
            padded = candidate.rstrip(",\n ") + ("]" * opens_sq) + ("}" * opens)
            try:
                json.loads(padded)
                return padded
            except Exception:
                continue
    return text
