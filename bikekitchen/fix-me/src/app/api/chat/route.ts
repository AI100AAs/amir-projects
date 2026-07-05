import { NextRequest, NextResponse } from "next/server";

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
const MODEL = process.env.LM_STUDIO_MODEL || "google/gemma-4-e4b";

const BASE_SYSTEM = `You are Fix Me AI, a friendly and knowledgeable bike repair assistant embedded in an interactive bike repair guide app. You help cyclists with bicycle maintenance and repair questions.

Guidelines:
- Prioritize safety — always mention safety checks and when to seek professional help
- Be encouraging and supportive of DIY repairs
- Keep responses concise and practical (under 150 words unless detail is needed)
- Use simple language that beginners can understand
- Always remind users that if they're unsure, they should consult a professional bike mechanic`;

const MODE_PROMPTS: Record<string, string> = {
  diagnose: `The user is describing a bike problem. Based on their description, identify the most likely issue and tell them which component to check.

Available repair guides in the app:
- Front Wheel: Fix a Flat Tire (Easy, 20-30 min)
- Rear Wheel: Fix a Flat Tire (Medium, 25-40 min)
- Brakes: Adjust Rim Brakes (Medium, 15-25 min)
- Chain & Drivetrain: Clean & Lubricate Chain (Easy, 10-15 min)
- Seat & Seatpost: Adjust Seat Height & Position (Easy, 5-10 min)
- Handlebars & Stem: Adjust Handlebars & Stem (Easy, 10-15 min)

Respond in this exact JSON format:
{"diagnosis": "brief diagnosis", "componentId": "one of: front-wheel, rear-wheel, brakes, chain, seat, handlebars", "confidence": "high/medium/low", "explanation": "why you think this is the issue", "alternative": "another possibility if confidence is not high"}

If the problem doesn't match any guide, set componentId to null and explain what they should do instead.`,

  explain: `The user is following a repair guide and wants more explanation about a specific step. Provide a clear, detailed explanation of WHY this step matters and what's happening mechanically. Be educational — help them understand the underlying mechanics, not just follow instructions.`,

  stuck: `The user is stuck on a repair step and needs help. Provide alternative approaches, common mistakes to check, and troubleshooting tips. Be empathetic and encouraging. If the step seems dangerous or beyond their skill level, recommend seeking professional help.`,

  review: `The user just completed a full repair guide. Provide a brief safety review and post-repair checklist. Mention what to watch for in the next few rides, when to re-check things, and congratulate them. Keep it concise.`,

  chat: BASE_SYSTEM,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = "chat", messages, context, userMessage } = body;

    const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.chat;

    let contextBlock = "";
    if (context) {
      const parts: string[] = [];
      if (context.repairTitle) parts.push(`Current repair guide: ${context.repairTitle}`);
      if (context.stepTitle) parts.push(`Current step: "${context.stepTitle}" — ${context.stepDescription}`);
      if (context.difficulty) parts.push(`Difficulty: ${context.difficulty}`);
      if (context.tools?.length) parts.push(`Tools: ${context.tools.join(", ")}`);
      if (context.completedSteps !== undefined) parts.push(`Steps completed: ${context.completedSteps}/${context.totalSteps}`);
      if (parts.length > 0) {
        contextBlock = `\n\nCurrent app context:\n${parts.join("\n")}`;
      }
    }

    let apiMessages: { role: string; content: string }[];

    if (mode === "chat" && Array.isArray(messages)) {
      apiMessages = [
        { role: "system", content: systemPrompt + contextBlock },
        ...messages,
      ];
    } else {
      apiMessages = [
        { role: "system", content: systemPrompt + contextBlock },
        { role: "user", content: userMessage },
      ];
    }

    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        temperature: mode === "diagnose" ? 0.3 : 0.7,
        max_tokens: mode === "diagnose" ? 300 : 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LM Studio error:", errorText);
      return NextResponse.json(
        { error: "AI service unavailable. Make sure LM Studio is running." },
        { status: 503 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
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
