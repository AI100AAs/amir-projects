// Thin client for the server's interpret + health endpoints, with a
// client-side fallback so the app degrades gracefully if the server is down.

export async function interpretConstraint(text) {
  try {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("interpret request failed; using neutral defaults", err);
    return {
      preferences: { scenic: 0, shade: 0, quiet: 0, accessible: 0, avoidBusy: 0 },
      efficiency: 0.6,
      mood: "balanced",
      rationale: "Couldn't reach the interpreter — routing for a short, comfortable path.",
      warnings: ["Constraint interpretation was unavailable, so your wording wasn't applied."],
      source: "offline",
      model: null,
    };
  }
}

export async function fetchHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch {
    return { active: "rule-based", model: null, provider: "auto", backends: [] };
  }
}
