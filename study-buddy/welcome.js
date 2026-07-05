import { loadTheme, toggleTheme } from "./shared.js";

const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", async () => {
  const next = await toggleTheme();
  themeToggle.textContent = next === "light" ? "☾" : "☀";
});

(async () => {
  await loadTheme();
  themeToggle.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";
})();

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("openSidePanel").addEventListener("click", async () => {
  try {
    const win = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: win.id });
  } catch (e) {
    console.error(e);
  }
});
