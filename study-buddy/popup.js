import { formatTime, loadTheme, toggleTheme } from "./shared.js";

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
  presets: document.querySelectorAll(".preset"),
  openSidePanel: $("openSidePanel"),
  themeToggle: $("themeToggle"),
};

async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (!status || !status.active) {
    showSetup();
    return;
  }
  showSession(status);
}

function showSetup() {
  el.setup.classList.remove("hidden");
  el.session.classList.add("hidden");
}

function showSession(status) {
  el.setup.classList.add("hidden");
  el.session.classList.remove("hidden");

  el.stateBadge.textContent = status.state;
  el.stateBadge.className = "status-pill " + status.state;
  el.goalDisplay.textContent = status.goal || "Studying";
  el.timeRemaining.textContent = formatTime(status.remainingMs ?? 0);
  el.lastMessage.textContent = status.lastMessage || "Let’s get to work.";
  el.stats.innerHTML = `
    <span><strong>${status.focusScore}%</strong> focus</span>
    <span><strong>${status.warningCount}</strong> warnings</span>
    <span><strong>${status.interventionCount}</strong> interventions</span>
  `;
  el.breakBtn.textContent = status.state === "break" ? "Resume" : "Take a break";
}

el.presets.forEach((btn) => {
  btn.addEventListener("click", () => {
    el.duration.value = btn.dataset.duration;
    el.checkIn.value = btn.dataset.checkin;
  });
});

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

  await chrome.runtime.sendMessage({
    type: "startSession",
    goal,
    durationMinutes: duration,
    checkInMinutes: checkIn,
  });
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

el.openSidePanel.addEventListener("click", async () => {
  try {
    const win = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: win.id });
  } catch (e) {
    console.error(e);
  }
});

el.themeToggle.addEventListener("click", async () => {
  const next = await toggleTheme();
  el.themeToggle.textContent = next === "light" ? "☾" : "☀";
});

(async () => {
  await loadTheme();
  el.themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";
  await refresh();
  setInterval(refresh, 1000);
})();
