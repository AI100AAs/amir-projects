import { formatTime, isAllowedDomain, isBlockedDomain, getSettings, loadTheme, toggleTheme } from "./shared.js";

const $ = (id) => document.getElementById(id);
const el = {
  setup: $("setup"),
  session: $("session"),
  goal: $("goal"),
  duration: $("duration"),
  checkIn: $("checkIn"),
  start: $("start"),
  stop: $("stop"),
  breakBtn: $("break"),
  stateBadge: $("stateBadge"),
  goalDisplay: $("goalDisplay"),
  timeRemaining: $("timeRemaining"),
  stats: $("stats"),
  lastMessage: $("lastMessage"),
  recentTabs: $("recentTabs"),
  themeToggle: $("themeToggle"),
};

let settings = null;

el.themeToggle.addEventListener("click", async () => {
  const next = await toggleTheme();
  el.themeToggle.textContent = next === "light" ? "☾" : "☀";
});

async function refresh() {
  settings = await getSettings();
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (!status.active) {
    el.setup.classList.remove("hidden");
    el.session.classList.add("hidden");
    return;
  }
  el.setup.classList.add("hidden");
  el.session.classList.remove("hidden");

  el.stateBadge.textContent = status.state;
  el.stateBadge.className = "status-pill " + status.state;
  el.goalDisplay.textContent = status.goal || "Studying";
  el.timeRemaining.textContent = formatTime(status.remainingMs ?? 0);
  el.lastMessage.textContent = status.lastMessage || "Let’s get to work.";
  el.stats.innerHTML = `
    <div>Focus score: <strong>${status.focusScore}%</strong></div>
    <div>Warnings: <strong>${status.warningCount}</strong></div>
    <div>Interventions: <strong>${status.interventionCount}</strong></div>
  `;

  el.breakBtn.textContent = status.state === "break" ? "Resume" : "Take a break";

  el.recentTabs.innerHTML = "";
  (status.recentTabs || []).slice(0, 10).forEach((tab) => {
    const li = document.createElement("li");
    const domain = tab.domain || "";
    li.innerHTML = `<div>${escapeHtml(tab.title)}</div><div class="domain">${domain}</div>`;
    if (isAllowedDomain(domain, settings.allowDomains)) li.classList.add("allowed");
    else if (isBlockedDomain(domain, settings.blockDomains)) li.classList.add("blocked");
    el.recentTabs.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

el.start.addEventListener("click", async () => {
  const goal = el.goal.value.trim();
  const duration = parseInt(el.duration.value, 10);
  const checkIn = parseInt(el.checkIn.value, 10);
  if (!goal) {
    el.goal.style.outline = '2px solid var(--danger)';
    el.goal.focus();
    setTimeout(() => { el.goal.style.outline = ''; }, 2000);
    return;
  }
  if (duration < 1 || checkIn < 1) return;
  await chrome.runtime.sendMessage({ type: "startSession", goal, durationMinutes: duration, checkInMinutes: checkIn });
  await refresh();
});

el.stop.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "stopSession" });
  await refresh();
});

el.breakBtn.addEventListener("click", async () => {
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (status.active && status.state === "break") {
    await chrome.runtime.sendMessage({ type: "dismissWarning" });
  } else {
    await chrome.runtime.sendMessage({ type: "startBreak", minutes: 5 });
  }
  await refresh();
});

(async () => {
  await loadTheme();
  el.themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";
  await refresh();
  setInterval(refresh, 1000);
})();
