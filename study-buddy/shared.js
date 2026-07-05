// Shared utilities for AI Study Buddy.

export const DEFAULTS = {
  llmUrl: "http://localhost:1234/v1/chat/completions",
  llmModel: "",
  allowList: [
    "coursera.org",
    "khanacademy.org",
    "wikipedia.org",
    "github.com",
    "stackoverflow.com",
    "docs.google.com",
    "scholar.google.com",
    "notion.so",
  ].join("\n"),
  blockList: [
    "youtube.com",
    "reddit.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "facebook.com",
    "tiktok.com",
    "netflix.com",
    "twitch.tv",
    "discord.com",
  ].join("\n"),
  keepHistory: false,
  openFocusPage: true,
  soundEnabled: true,
  warningsBeforeIntervention: 1,
  interventionThreshold: 2,
};

export function parseList(text) {
  return (text || "")
    .split("\n")
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
    )
    .filter(Boolean);
}

export function domainOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function domainMatches(domain, pattern) {
  if (!domain || !pattern) return false;
  if (domain === pattern) return true;
  return domain.endsWith("." + pattern);
}

export function isAllowedDomain(domain, allowDomains) {
  return allowDomains.some((p) => domainMatches(domain, p));
}

export function isBlockedDomain(domain, blockDomains) {
  return blockDomains.some((p) => domainMatches(domain, p));
}

export function isInternalUrl(url) {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("file://") ||
    url.startsWith("data:") ||
    url.startsWith("javascript:")
  );
}

export function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

export function sanitizeGoal(goal) {
  return (goal || "").trim().slice(0, 200);
}

export async function loadTheme() {
  const { theme } = await chrome.storage.sync.get({ theme: "auto" });
  applyTheme(theme);
  return theme;
}

export function applyTheme(theme) {
  if (theme === "auto") {
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    document.documentElement.setAttribute("data-theme", prefersLight ? "light" : "dark");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export async function toggleTheme() {
  const { theme } = await chrome.storage.sync.get({ theme: "auto" });
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "light" ? "dark" : "light";
  await chrome.storage.sync.set({ theme: next });
  applyTheme(next);
  return next;
}

export async function getSettings() {
  const raw = await chrome.storage.sync.get(DEFAULTS);
  return {
    ...raw,
    allowDomains: parseList(raw.allowList),
    blockDomains: parseList(raw.blockList),
  };
}
