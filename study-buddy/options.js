import { DEFAULTS, parseList, formatTime, loadTheme, toggleTheme } from "./shared.js";

const inputs = {
  llmUrl: document.getElementById("llmUrl"),
  llmModel: document.getElementById("llmModel"),
  interventionThreshold: document.getElementById("interventionThreshold"),
  allowList: document.getElementById("allowList"),
  blockList: document.getElementById("blockList"),
  openFocusPage: document.getElementById("openFocusPage"),
  soundEnabled: document.getElementById("soundEnabled"),
  keepHistory: document.getElementById("keepHistory"),
};

const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", async () => {
  const next = await toggleTheme();
  themeToggle.textContent = next === "light" ? "☾" : "☀";
});

async function load() {
  await loadTheme();
  themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";

  const stored = await chrome.storage.sync.get(DEFAULTS);
  inputs.llmUrl.value = stored.llmUrl;
  inputs.llmModel.value = stored.llmModel;
  inputs.interventionThreshold.value = stored.interventionThreshold;
  inputs.allowList.value = stored.allowList;
  inputs.blockList.value = stored.blockList;
  inputs.openFocusPage.checked = stored.openFocusPage;
  inputs.soundEnabled.checked = stored.soundEnabled;
  inputs.keepHistory.checked = stored.keepHistory;

  await renderHistory();
}

document.getElementById("save").addEventListener("click", async () => {
  const settings = {
    llmUrl: inputs.llmUrl.value.trim(),
    llmModel: inputs.llmModel.value.trim(),
    interventionThreshold: parseInt(inputs.interventionThreshold.value, 10) || DEFAULTS.interventionThreshold,
    allowList: inputs.allowList.value,
    blockList: inputs.blockList.value,
    openFocusPage: inputs.openFocusPage.checked,
    soundEnabled: inputs.soundEnabled.checked,
    keepHistory: inputs.keepHistory.checked,
    allowDomains: parseList(inputs.allowList.value),
    blockDomains: parseList(inputs.blockList.value),
  };
  await chrome.storage.sync.set(settings);
  const note = document.getElementById("saveNote");
  note.textContent = "Saved.";
  setTimeout(() => (note.textContent = ""), 2000);
});

document.getElementById("exportHistory").addEventListener("click", async () => {
  const { history = [] } = await chrome.storage.local.get({ history: [] });
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-buddy-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("clearHistory").addEventListener("click", async () => {
  await chrome.storage.local.set({ history: [] });
  await renderHistory();
});

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get({ history: [] });
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  if (!history.length) {
    list.innerHTML = '<li class="muted">No completed sessions yet.</li>';
    return;
  }
  history.forEach((h) => {
    const li = document.createElement("li");
    const date = new Date(h.completedAt).toLocaleString();
    li.innerHTML = `
      <strong>${escapeHtml(h.goal)}</strong> · ${h.durationMinutes} min · ${date}<br/>
      Focus ${h.focusScore}% · Warnings ${h.warnings} · Interventions ${h.interventions}
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

load();
