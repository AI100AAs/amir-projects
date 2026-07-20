"""
Talks to the UBC AI staging endpoint (qwen3.6-35b-a3b) for both text and vision requests.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, APIStatusError

# Ensure .env is loaded even when this module is imported directly
load_dotenv(Path(__file__).parent.parent / ".env")

log = logging.getLogger(__name__)

PROVIDERS = {
    "ubc": {
        "base_url": "https://ai-stg.apps.ctlt.ubc.ca/v1",
        "model": "qwen3.6-35b-a3b",
        "vision_models": ["qwen3.6-35b-a3b"],
        "label": "UBC AI (Qwen3.6 35B)",
        "supports_vision": True,
    },
}

PROVIDER = "ubc"


def get_config() -> dict:
    return {"provider": PROVIDER}


def _make_client(model_override: str = None) -> tuple[OpenAI, str]:
    cfg = PROVIDERS[PROVIDER]
    api_key = os.getenv("UBC_AI_API_KEY", "no-key")
    model = model_override or cfg["model"]
    return OpenAI(base_url=cfg["base_url"], api_key=api_key), model


def check_health(provider: str = PROVIDER) -> bool:
    try:
        client, _ = _make_client()
        client.models.list()
        return True
    except Exception:
        return False


def chat(messages: list, max_tokens: int = 4096, images: list = None) -> tuple[str, str]:
    """
    Send a chat request. Returns (response_text, provider_used).

    - images: list of (base64_str, media_type) — marks this as a vision request.
    """
    cfg = PROVIDERS[PROVIDER]
    vision_request = bool(images)
    last_err = None

    models_to_try = cfg["vision_models"] if vision_request else [cfg["model"]]

    for model_id in models_to_try:
        try:
            client, model = _make_client(model_override=model_id)

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
                model=model,
                max_tokens=max_tokens,
                messages=payload,
                extra_body={"reasoning_effort": "none"},
            )
            message = response.choices[0].message
            reasoning = getattr(message, "reasoning_content", None)
            if reasoning:
                log.debug("Reasoning (%s): %s", PROVIDER, reasoning)

            if not message.content:
                raise RuntimeError(
                    "Model returned no content — max_tokens was likely exhausted by "
                    "reasoning before an answer was produced. Try raising max_tokens."
                )

            return message.content.strip(), PROVIDER

        except APIConnectionError as e:
            log.warning("Provider '%s' unreachable: %s", PROVIDER, e)
            last_err = e
        except APIStatusError as e:
            log.warning("Provider '%s' [%s] returned %s", PROVIDER, model_id, e.status_code)
            last_err = e
        except Exception as e:
            log.warning("Provider '%s' [%s] failed: %s", PROVIDER, model_id, e)
            last_err = e

    raise RuntimeError(f"UBC AI provider failed. Last error: {last_err}")


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
