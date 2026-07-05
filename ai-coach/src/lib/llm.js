// Thin client for an LM Studio (OpenAI-compatible) server.
// In dev we go through the Vite proxy at /llm to avoid CORS.

const BASE = "/llm/v1";

// Some reasoning models inline their chain-of-thought as <think>…</think>.
// LM Studio usually splits it into reasoning_content, but strip defensively.
export function stripThink(s) {
  if (!s) return s;
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}

// NOTE: reasoning models (gemma-4 e2b/e4b) burn hidden "thinking" tokens before
// answering. The robust, model-agnostic way to skip that is FEW-SHOT PRIMING —
// include a short example exchange so the model mimics a direct answer. The
// callers in coach.js add those examples (gated by `fast`). A <think></think>
// prefill was tried but only worked on e4b (it made e2b echo/leak), so it's gone.

export async function listModels() {
  try {
    const res = await fetch(`${BASE}/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((m) => m.id);
  } catch (e) {
    console.warn("listModels failed:", e.message);
    return [];
  }
}

export async function ping() {
  try {
    const res = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Build an OpenAI-style multimodal user message. `image` is a data URL or null.
export function userMessage(text, image) {
  if (!image) return { role: "user", content: text };
  return {
    role: "user",
    content: [
      { type: "text", text },
      { type: "image_url", image_url: { url: image } },
    ],
  };
}

// Non-streaming completion. Returns the assistant string.
export async function complete(messages, opts = {}) {
  const body = {
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.maxTokens ?? 1024,
    stream: false,
  };
  if (opts.responseFormat) body.response_format = opts.responseFormat;

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  return stripThink(json.choices?.[0]?.message?.content ?? "");
}

// Streaming completion. Calls onToken(deltaText) as tokens arrive; returns full text.
export async function stream(messages, opts = {}, onToken) {
  const body = {
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 800,
    stream: true,
  };
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${txt.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content || "";
        if (delta) {
          full += delta;
          onToken?.(delta);
        }
      } catch {
        /* ignore keep-alive / partial */
      }
    }
  }
  return full;
}

// Robustly pull a JSON object/array out of a model response that may be
// wrapped in prose or ```json fences.
export function extractJson(text) {
  if (!text) return null;
  // try direct
  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }
  // strip code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      /* continue */
    }
  }
  // grab first {...} or [...]
  const start = text.search(/[{[]/);
  if (start === -1) return null;
  for (let end = text.length; end > start; end--) {
    const slice = text.slice(start, end);
    const last = slice.trim().slice(-1);
    if (last !== "}" && last !== "]") continue;
    try {
      return JSON.parse(slice);
    } catch {
      /* keep shrinking */
    }
  }
  return null;
}
