import { formatTime, loadTheme, toggleTheme } from "./shared.js";

const el = {
  goal: document.getElementById("goal"),
  timer: document.getElementById("timer"),
  state: document.getElementById("state"),
  stats: document.getElementById("stats"),
  message: document.getElementById("message"),
  breakBtn: document.getElementById("break"),
  resumeBtn: document.getElementById("resume"),
  stopBtn: document.getElementById("stop"),
  orb: document.querySelector(".orb"),
  themeToggle: document.getElementById("themeToggle"),
};

el.themeToggle.addEventListener("click", async () => {
  const next = await toggleTheme();
  el.themeToggle.textContent = next === "light" ? "☾" : "☀";
});

async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (!status.active) {
    el.goal.textContent = "No active session";
    el.timer.textContent = "--:--";
    el.state.textContent = "idle";
    el.stats.innerHTML = "";
    el.message.textContent = "Open the extension popup to start focusing.";
    el.breakBtn.classList.add("hidden");
    el.resumeBtn.classList.add("hidden");
    el.stopBtn.classList.add("hidden");
    el.orb.className = "orb";
    return;
  }

  el.goal.textContent = status.goal;
  el.timer.textContent = formatTime(status.remainingMs);
  el.state.textContent = status.state;
  el.message.textContent = status.lastMessage || "Stay focused.";
  el.orb.className = "orb " + status.state;

  el.stats.innerHTML = `
    <div class="stat"><strong>${status.focusScore}%</strong> focus score</div>
    <div class="stat"><strong>${status.warningCount}</strong> warnings</div>
    <div class="stat"><strong>${status.interventionCount}</strong> interventions</div>
  `;

  if (status.state === "break") {
    el.breakBtn.classList.add("hidden");
    el.resumeBtn.classList.remove("hidden");
    el.stopBtn.classList.remove("hidden");
  } else {
    el.breakBtn.classList.remove("hidden");
    el.resumeBtn.classList.add("hidden");
    el.stopBtn.classList.remove("hidden");
  }
}

el.breakBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "startBreak", minutes: 5 });
  await refresh();
});

el.resumeBtn.addEventListener("click", async () => {
  // Resume is handled automatically by the break alarm, but allow manual resume too.
  await chrome.runtime.sendMessage({ type: "dismissWarning" });
  await refresh();
});

el.stopBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "stopSession" });
  await refresh();
});

(async () => {
  await loadTheme();
  el.themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";
  await refresh();
  setInterval(refresh, 1000);
})();
