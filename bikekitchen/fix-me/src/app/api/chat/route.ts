import { NextRequest, NextResponse } from "next/server";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
const MODEL = process.env.LM_STUDIO_MODEL || "google/gemma-4-e4b";

/** Max data-URL length (~4 MB binary after base64 expansion). */
const MAX_IMAGE_DATA_URL_CHARS = 6_000_000;

/**
 * Gemma-class models often spend hundreds of tokens on reasoning_content
 * before writing the user-visible answer. Keep limits high enough that the
 * final answer can finish (finish_reason=stop) instead of cutting mid-sentence.
 */
const MAX_TOKENS = 4096;

const OUTPUT_RULES = `
Response rules (always follow):
- Write ONLY the final answer the user should read
- Do NOT include thinking steps, planning, self-correction, drafts, or "Initial thought" notes
- Use plain language for beginners; keep it practical and complete
- Finish every sentence; never cut off mid-thought
- Prefer 80–160 words unless a short checklist needs more`;

const BASE_SYSTEM = `You are Fix Me AI, a friendly and knowledgeable bike repair assistant embedded in an interactive bike repair guide app. You help cyclists with bicycle maintenance and repair questions.

Guidelines:
- Prioritize safety — always mention safety checks and when to seek professional help
- Be encouraging and supportive of DIY repairs
- Keep responses concise and practical
- Use simple language that beginners can understand
- Always remind users that if they're unsure, they should consult a professional bike mechanic
${OUTPUT_RULES}`;

const MODE_PROMPTS: Record<string, string> = {
  diagnose: `The user is describing a bike problem (and may have attached a photo of their bike or the damaged part). Based on their description and any photo, identify the most likely issue and tell them which component to check.

If a photo is provided:
- Carefully inspect visible components (wheels, tires, brakes, chain, drivetrain, seat, handlebars, frame)
- Note damage, wear, misalignment, dirt, flat tires, cable issues, or other visible problems
- Use both the image and any text the user provided
- If the photo is unclear, say so and lower confidence

Available repair guides in the app:
- Front Wheel: Fix a Flat Tire (Easy, 20-30 min)
- Rear Wheel: Fix a Flat Tire (Medium, 25-40 min)
- Brakes: Adjust Rim Brakes (Medium, 15-25 min)
- Chain & Drivetrain: Clean & Lubricate Chain (Easy, 10-15 min)
- Seat & Seatpost: Adjust Seat Height & Position (Easy, 5-10 min)
- Handlebars & Stem: Adjust Handlebars & Stem (Easy, 10-15 min)

Respond with ONLY a single JSON object (no markdown fences, no extra commentary, no thinking notes):
{"diagnosis": "brief diagnosis", "componentId": "one of: front-wheel, rear-wheel, brakes, chain, seat, handlebars", "confidence": "high/medium/low", "explanation": "why you think this is the issue (mention what you saw in the photo if applicable)", "alternative": "another possibility if confidence is not high"}

If the problem doesn't match any guide, set componentId to null and explain what they should do instead. Keep diagnosis and explanation short.`,

  explain: `The user is following a repair guide and wants more explanation about a specific step.
${OUTPUT_RULES}

Structure the answer as:
1) Why this step matters (1–2 sentences)
2) What is happening mechanically (2–4 sentences)
3) One practical tip or common pitfall

If they attached a photo of their progress, use it to give more specific guidance.`,

  stuck: `The user is stuck on a repair step and needs help.
${OUTPUT_RULES}

Give alternative approaches, common mistakes to check, and troubleshooting tips. Be empathetic and encouraging. If they attached a photo of where they're stuck, diagnose what you see and give targeted advice. If the step seems dangerous or beyond their skill level, recommend seeking professional help.`,

  review: `The user just completed a full repair guide.
${OUTPUT_RULES}

Provide a brief safety review and post-repair checklist. Mention what to watch for in the next few rides, when to re-check things, and congratulate them. If they attached a photo of the finished work, comment on anything you notice.`,

  chat: `${BASE_SYSTEM}

If the user attaches a photo of their bike or a part, carefully examine it and give practical repair advice based on what you see. Point out specific issues, suggest which component to focus on, and when appropriate recommend one of the in-app guides (front wheel flat, rear wheel flat, rim brakes, chain lube, seat height, handlebars).`,
};

type TextContent = string;
type MultimodalContent = Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
>;

function buildUserContent(text: string, image?: string): TextContent | MultimodalContent {
  if (!image) return text;
  return [
    {
      type: "text",
      text:
        text ||
        "Please look at this photo of my bike and help me figure out what needs fixing.",
    },
    { type: "image_url", image_url: { url: image } },
  ];
}

function isValidDataUrl(image: string): boolean {
  return (
    typeof image === "string" &&
    image.startsWith("data:image/") &&
    image.includes(";base64,") &&
    image.length <= MAX_IMAGE_DATA_URL_CHARS
  );
}

/** Internal monologue patterns that must never be shown to the user. */
function looksLikeReasoningTrace(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /thinking process/i.test(text) ||
    /self-correction/i.test(text) ||
    /initial thought/i.test(text) ||
    /final output generation/i.test(text) ||
    /\*\*refine and/i.test(text) ||
    /drafting content/i.test(text) ||
    (/\d+\.\s+\*\*[^*]+\*\*:/i.test(text) &&
      (lower.includes("identify the goal") ||
        lower.includes("determine the persona") ||
        lower.includes("structure the")))
  );
}

/** Try to pull a finished answer out of a reasoning dump (last resort). */
function extractFromReasoning(reasoning: string, mode: string): string | null {
  // Diagnose: prefer embedded JSON.
  if (mode === "diagnose") {
    const jsonMatch = reasoning.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];
  }

  // Common endings models use before the user-facing answer.
  const markers = [
    /(?:^|\n)\s*(?:final (?:answer|output|response)\s*:?\s*)([\s\S]+)$/i,
    /(?:^|\n)\s*(?:here(?:'s| is) (?:the )?(?:final )?(?:answer|explanation)\s*:?\s*)([\s\S]+)$/i,
    /(?:^|\n)\s*\*\*final (?:answer|output|response)\*\*\s*:?\s*([\s\S]+)$/i,
  ];
  for (const re of markers) {
    const m = reasoning.match(re);
    if (m?.[1]?.trim() && !looksLikeReasoningTrace(m[1])) {
      return m[1].trim();
    }
  }

  // Last non-empty paragraph if it does not look like planning notes.
  const paragraphs = reasoning
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const p = paragraphs[i];
    if (p.length >= 40 && !looksLikeReasoningTrace(p) && !/^\d+\.\s/.test(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Prefer final content. Never dump raw reasoning traces into the UI.
 * If content is empty (model spent budget on thinking), try a careful extract.
 */
function extractAssistantText(
  message:
    | {
        content?: string | null;
        reasoning_content?: string | null;
      }
    | undefined,
  mode: string
): string | null {
  if (!message) return null;

  const content = typeof message.content === "string" ? message.content.trim() : "";
  if (content && !looksLikeReasoningTrace(content)) {
    return content;
  }

  // Content exists but is itself a leaked reasoning dump — try cleanup.
  if (content && looksLikeReasoningTrace(content)) {
    const cleaned = extractFromReasoning(content, mode);
    if (cleaned) return cleaned;
  }

  const reasoning =
    typeof message.reasoning_content === "string" ? message.reasoning_content.trim() : "";
  if (!reasoning) return content || null;

  const fromReasoning = extractFromReasoning(reasoning, mode);
  if (fromReasoning) return fromReasoning;

  // Last resort: incomplete generation — do not show internal monologue.
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = "chat", messages, context, userMessage, image } = body;

    if (image != null && !isValidDataUrl(image)) {
      return NextResponse.json(
        { error: "Invalid image. Upload a JPG, PNG, or WebP under a few MB." },
        { status: 400 }
      );
    }

    if (mode === "diagnose" && !userMessage?.trim() && !image) {
      return NextResponse.json(
        { error: "Describe the problem or upload a photo of your bike." },
        { status: 400 }
      );
    }

    const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.chat;

    let contextBlock = "";
    if (context) {
      const parts: string[] = [];
      if (context.repairTitle) parts.push(`Current repair guide: ${context.repairTitle}`);
      if (context.stepTitle) {
        parts.push(`Current step: "${context.stepTitle}" — ${context.stepDescription}`);
      }
      if (context.difficulty) parts.push(`Difficulty: ${context.difficulty}`);
      if (context.tools?.length) parts.push(`Tools: ${context.tools.join(", ")}`);
      if (context.completedSteps !== undefined) {
        parts.push(`Steps completed: ${context.completedSteps}/${context.totalSteps}`);
      }
      if (parts.length > 0) {
        contextBlock = `\n\nCurrent app context:\n${parts.join("\n")}`;
      }
    }

    if (image) {
      contextBlock +=
        "\n\nThe user attached a photo of their bike or repair. Analyze the image carefully as part of your answer.";
    }

    // History is text-only so payloads stay small; only the latest turn may include an image.
    type ApiMessage = { role: string; content: TextContent | MultimodalContent };
    let apiMessages: ApiMessage[];

    if (mode === "chat" && Array.isArray(messages)) {
      const history = messages.map(
        (
          m: { role: string; content: string },
          index: number,
          arr: { role: string; content: string }[]
        ) => {
          const isLastUser = index === arr.length - 1 && m.role === "user" && image;
          return {
            role: m.role,
            content: isLastUser ? buildUserContent(m.content, image) : m.content,
          };
        }
      );
      apiMessages = [{ role: "system", content: systemPrompt + contextBlock }, ...history];
    } else {
      apiMessages = [
        { role: "system", content: systemPrompt + contextBlock },
        {
          role: "user",
          content: buildUserContent(
            userMessage ||
              (image
                ? "Please look at this photo of my bike and help me figure out what needs fixing."
                : ""),
            image
          ),
        },
      ];
    }

    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        temperature: mode === "diagnose" ? 0.3 : 0.5,
        max_tokens: MAX_TOKENS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LM Studio error:", errorText);
      return NextResponse.json(
        {
          error:
            "AI service unavailable. Make sure LM Studio is running with a vision-capable model.",
        },
        { status: 503 }
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;
    const finishReason = choice?.finish_reason as string | undefined;
    let assistantMessage = extractAssistantText(message, mode);

    // If we only got empty/reasoning junk, one retry with more room for the final answer.
    if (!assistantMessage) {
      console.warn("Empty/unusable AI response; retrying with higher max_tokens", {
        mode,
        finishReason,
      });
      const retry = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            ...apiMessages,
            {
              role: "user",
              content:
                "Reply again with ONLY the complete final answer for the user. No thinking notes. Finish every sentence.",
            },
          ],
          temperature: 0.4,
          max_tokens: MAX_TOKENS,
        }),
      });
      if (retry.ok) {
        const retryData = await retry.json();
        assistantMessage = extractAssistantText(retryData.choices?.[0]?.message, mode);
        if (retryData.choices?.[0]?.finish_reason === "length" && assistantMessage) {
          assistantMessage = trimIncompleteTail(assistantMessage);
        }
      }
    }

    // Soft cleanup: if finish_reason was length but we still have content, drop a
    // trailing incomplete bullet/line so the UI doesn't end mid-word when possible.
    if (assistantMessage && finishReason === "length") {
      assistantMessage = trimIncompleteTail(assistantMessage);
    }

    if (!assistantMessage) {
      return NextResponse.json(
        {
          error:
            "The AI ran out of space while thinking. Please try Explain / I'm stuck again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to connect to AI service. Is LM Studio running on port 1234?" },
      { status: 503 }
    );
  }
}

/** Drop a trailing incomplete sentence if generation was cut off. */
function trimIncompleteTail(text: string): string {
  const trimmed = text.trim();
  if (/[.!?]["']?$/.test(trimmed)) return trimmed;

  // Real sentence ends only (avoid treating list markers like "1. " as ends).
  const matches = [
    ...trimmed.matchAll(/[.!?]["']?(?=\s+(?![0-9]+\.)[A-Z*•-]|\s*$)/g),
  ];
  if (matches.length === 0) return trimmed;

  const last = matches[matches.length - 1];
  const end = (last.index ?? 0) + last[0].length;
  if (end > 40 && end < trimmed.length) {
    return trimmed.slice(0, end).trim();
  }
  return trimmed;
}
