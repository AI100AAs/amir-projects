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
  messages?: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, userMessage, context, messages }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "AI request failed");
  return data.message;
}
