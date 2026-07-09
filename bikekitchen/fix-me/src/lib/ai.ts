export interface AIContext {
  repairTitle?: string;
  stepTitle?: string;
  stepDescription?: string;
  difficulty?: string;
  tools?: string[];
  completedSteps?: number;
  totalSteps?: number;
}

export type AIMode = "chat" | "diagnose" | "explain" | "stuck" | "review";

export interface DiagnosisResult {
  diagnosis: string;
  componentId: string | null;
  confidence: "high" | "medium" | "low";
  explanation: string;
  alternative?: string;
}

export async function callAI(
  mode: AIMode,
  userMessage: string,
  context?: AIContext,
  messages?: { role: "user" | "assistant"; content: string }[],
  /** JPEG/PNG data URL for vision models (e.g. data:image/jpeg;base64,...) */
  image?: string
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, userMessage, context, messages, image }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "AI request failed");
  return data.message;
}

/** Pull the first JSON object from a model reply (handles markdown fences). */
export function parseDiagnosisJson(raw: string): DiagnosisResult {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    throw new SyntaxError("No JSON object in response");
  }
  const parsed = JSON.parse(objectMatch[0]) as DiagnosisResult;
  if (typeof parsed.diagnosis !== "string" || typeof parsed.explanation !== "string") {
    throw new SyntaxError("Invalid diagnosis shape");
  }
  return parsed;
}
