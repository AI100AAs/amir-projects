import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234/v1';
const MODEL_ID  = process.env.MODEL_ID  || 'google/gemma-4-e4b';

/**
 * Strip markdown code fences and extract JSON from model output.
 * Models sometimes wrap output in ```json ... ``` despite being told not to.
 */
export function extractJSON(text) {
  // Remove <think>...</think> blocks (reasoning models)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  // Find first [ or { and last ] or }
  const firstArr = cleaned.indexOf('[');
  const firstObj = cleaned.indexOf('{');
  if (firstArr === -1 && firstObj === -1) throw new Error('No JSON found in response');
  const start = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj) ? firstArr : firstObj;
  const opener = cleaned[start];
  const closer = opener === '[' ? ']' : '}';
  const end = cleaned.lastIndexOf(closer);
  if (end === -1) throw new Error('Malformed JSON in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/**
 * Single-shot chat completion (non-streaming).
 */
export async function chatComplete(messages, opts = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 4000,
      stream: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LM Studio error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Streaming chat completion – pipes SSE chunks to the Express response.
 */
export async function chatStream(messages, expressRes, opts = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 4000,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LM Studio error ${res.status}: ${err}`);
  }

  expressRes.setHeader('Content-Type', 'text/event-stream');
  expressRes.setHeader('Cache-Control', 'no-cache');
  expressRes.setHeader('Connection', 'keep-alive');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') {
        expressRes.write('data: [DONE]\n\n');
        continue;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          expressRes.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
        }
      } catch { /* skip malformed chunks */ }
    }
  }
  expressRes.end();
}

/**
 * Vision completion – sends base64 image + text prompt.
 */
export async function visionComplete(base64Image, mimeType, textPrompt) {
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: textPrompt },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        },
      ],
    },
  ];
  return chatComplete(messages, { temperature: 0.2, max_tokens: 4000 });
}

/**
 * Check LM Studio connectivity and available models.
 */
export async function getHealth() {
  const res = await fetch(`${BASE_URL}/models`);
  if (!res.ok) throw new Error('LM Studio not reachable');
  const data = await res.json();
  return { ok: true, model: MODEL_ID, models: data.data?.map(m => m.id) ?? [] };
}
