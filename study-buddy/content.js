// AI Study Buddy — content script for soft-block overlays.

const OVERLAY_ID = "ai-study-buddy-overlay";

async function getStoredTheme() {
  try {
    const { theme } = await chrome.storage.sync.get({ theme: "auto" });
    if (theme === "auto") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return theme;
  } catch {
    return "dark";
  }
}

function removeOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.style.opacity = "0";
    setTimeout(() => existing.remove(), 250);
  }
}

async function createOverlay(message, reason, mode) {
  removeOverlay();

  const theme = await getStoredTheme();
  const backdrop = document.createElement("div");
  backdrop.id = OVERLAY_ID;
  backdrop.className = `ai-study-buddy-overlay ai-study-buddy-${mode}`;
  backdrop.setAttribute("data-theme", theme);

  const card = document.createElement("div");
  card.className = "ai-study-buddy-card";

  const title = document.createElement("h2");
  title.textContent = mode === "intervention" ? "Focus intervention" : "Focus check";

  const msg = document.createElement("p");
  msg.className = "ai-study-buddy-message";
  msg.textContent = message;

  const reasonEl = document.createElement("p");
  reasonEl.className = "ai-study-buddy-reason";
  reasonEl.textContent = reason ? `Why: ${reason}` : "";

  const actions = document.createElement("div");
  actions.className = "ai-study-buddy-actions";

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "ai-study-buddy-btn ai-study-buddy-dismiss";
  dismissBtn.textContent = mode === "intervention" ? "I’m back on track" : "Got it";
  dismissBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "dismissWarning" });
    removeOverlay();
  });

  const breakBtn = document.createElement("button");
  breakBtn.className = "ai-study-buddy-btn ai-study-buddy-break";
  breakBtn.textContent = "Take a 5-min break";
  breakBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "startBreak", minutes: 5 });
    removeOverlay();
  });

  const stopBtn = document.createElement("button");
  stopBtn.className = "ai-study-buddy-btn ai-study-buddy-stop";
  stopBtn.textContent = "End session";
  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "stopSession" });
    removeOverlay();
  });

  actions.appendChild(dismissBtn);
  actions.appendChild(breakBtn);
  actions.appendChild(stopBtn);

  card.appendChild(title);
  card.appendChild(msg);
  if (reason) card.appendChild(reasonEl);
  card.appendChild(actions);
  backdrop.appendChild(card);

  document.body.appendChild(backdrop);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "showWarning") {
    createOverlay(msg.message, msg.reason, "warning");
  } else if (msg.type === "showIntervention") {
    createOverlay(msg.message, msg.reason, "intervention");
  }
});
