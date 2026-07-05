import json
import time
import httpx
from app.config import LLM_API_KEY as ENV_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE

MAX_RETRIES = 3
INITIAL_BACKOFF = 1.0


def _build_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/anomalyco/opencode",
        "X-Title": "Truth Lens",
    }


def _build_body(system_prompt: str, user_prompt: str, model: str, temperature: float) -> dict:
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    body = {
        "model": model,
        "messages": messages,
        "max_tokens": LLM_MAX_TOKENS,
        "temperature": temperature,
    }
    return body


def call_llm(
    system_prompt: str, user_prompt: str,
    api_key: str = "",
    model: str | None = None,
    temperature: float | None = None,
) -> tuple[str, str, str | None]:
    """Returns (response_text, model_used, provider)."""
    key = api_key or ENV_API_KEY
    if not key:
        raise RuntimeError("No API key available")

    effective_model = model or LLM_MODEL
    effective_temp = temperature if temperature is not None else LLM_TEMPERATURE

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=60.0) as client:
                body = _build_body(system_prompt, user_prompt, effective_model, effective_temp)
                resp = client.post(
                    f"{LLM_BASE_URL}/chat/completions",
                    headers=_build_headers(key),
                    json=body,
                )
                resp.raise_for_status()
                data = resp.json()
                if not isinstance(data, dict):
                    error_detail = str(data)[:400] or "empty non-object response"
                    if attempt < MAX_RETRIES:
                        backoff = INITIAL_BACKOFF * (2 ** attempt)
                        time.sleep(backoff)
                        last_error = f"API returned non-object, retrying in {backoff}s..."
                        continue
                    last_error = f"API returned non-object after {MAX_RETRIES + 1} attempts: {error_detail}"
                    break
                if "choices" not in data or not data["choices"]:
                    error_detail = data.get("error", {}).get("message", json.dumps(data)) if isinstance(data, dict) else str(data)
                    if attempt < MAX_RETRIES:
                        backoff = INITIAL_BACKOFF * (2 ** attempt)
                        time.sleep(backoff)
                        last_error = f"API returned no choices, retrying in {backoff}s..."
                        continue
                    last_error = f"API returned no choices after {MAX_RETRIES + 1} attempts: {error_detail[:300]}"
                    break
                content = data["choices"][0]["message"].get("content") or ""
                responded_model = data.get("model", effective_model)
                return content, responded_model, None
        except httpx.HTTPStatusError as e:
            detail = e.response.text[:400]
            status = e.response.status_code
            if status == 429 and attempt < MAX_RETRIES:
                backoff = INITIAL_BACKOFF * (2 ** attempt)
                time.sleep(backoff)
                last_error = f"Rate limited (429), retrying in {backoff}s..."
                continue
            elif status >= 500 and attempt < MAX_RETRIES:
                backoff = INITIAL_BACKOFF * (2 ** attempt)
                time.sleep(backoff)
                last_error = f"Server error ({status}), retrying in {backoff}s..."
                continue
            raise RuntimeError(f"LLM call failed (HTTP {status}): {detail}")
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES:
                backoff = INITIAL_BACKOFF * (2 ** attempt)
                time.sleep(backoff)
                last_error = f"Timeout, retrying in {backoff}s..."
                continue
            raise RuntimeError(f"LLM call timed out after {MAX_RETRIES + 1} attempts")
        except Exception as e:
            if attempt < MAX_RETRIES:
                backoff = INITIAL_BACKOFF * (2 ** attempt)
                time.sleep(backoff)
                last_error = f"Unexpected error, retrying in {backoff}s...: {e}"
                continue
            raise RuntimeError(f"LLM call failed after {MAX_RETRIES + 1} attempts: {e}")

    raise RuntimeError(f"LLM call failed after {MAX_RETRIES + 1} attempts: {last_error or 'unknown'}")
