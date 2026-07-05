// AI Study Buddy — service worker background script (v2).
// Robust MV3 state machine with retry logic, break mode, side-panel updates,
// offscreen sounds, keyboard shortcuts, and local LLM evaluation.

import {
  DEFAULTS,
  domainOf,
  isInternalUrl,
  isAllowedDomain,
  isBlockedDomain,
  getSettings,
  sanitizeGoal,
  clamp,
} from "./shared.js";

const SESSION_KEY = "session";
const MAX_RECENT_TABS = 15;
const ALARM_CHECKIN = "studyBuddy-checkIn";
const ALARM_END = "studyBuddy-sessionEnd";
const ALARM_BREAK = "studyBuddy-breakEnd";
const TAB_RECORD_THROTTLE_MS = 2000;

let settingsCache = null;
let updateQueue = Promise.resolve();
let offscreenReady = false;
const lastTabRecord = new Map(); // tabId -> timestamp

// ---- Serialised session updates --------------------------------------------

async function getSession() {
  const data = await chrome.storage.session.get(SESSION_KEY);
  return data[SESSION_KEY] || null;
}

async function setSession(session) {
  await chrome.storage.session.set({ [SESSION_KEY]: session });
}

function enqueueSessionUpdate(updateFn) {
  const next = updateQueue.then(async () => {
    const session = await getSession();
    const updated = await updateFn(session);
    if (updated) await setSession(updated);
    return updated;
  });
  updateQueue = next.catch((err) => {
    console.error("Session update failed:", err);
    return null;
  });
  return updateQueue;
}

// ---- Settings ----------------------------------------------------------------

async function loadSettings() {
  if (!settingsCache) settingsCache = await getSettings();
  return settingsCache;
}

chrome.storage.sync.onChanged.addListener(() => {
  settingsCache = null;
});

// ---- Lifecycle ---------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await chrome.storage.sync.set(DEFAULTS);
    await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  } else if (details.reason === "update") {
    const existing = await chrome.storage.sync.get(null);
    const toSet = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (!(key in existing)) {
        toSet[key] = value;
      }
    }
    if (Object.keys(toSet).length) {
      await chrome.storage.sync.set(toSet);
    }
  }
});

// Restore alarms when the service worker wakes up.
chrome.runtime.onStartup.addListener(restoreSession);
restoreSession();

async function restoreSession() {
  const session = await getSession();
  if (!session || !session.active) return;

  const now = Date.now();
  if (now >= session.endTime) {
    await completeSession("completed", "Session completed while Chrome was closed.");
    return;
  }

  const remainingMin = Math.max(1, (session.endTime - now) / 60000);
  await chrome.alarms.create(ALARM_END, { delayInMinutes: remainingMin });

  if (session.state !== "break") {
    await chrome.alarms.create(ALARM_CHECKIN, {
      periodInMinutes: Math.max(1, session.checkInMinutes),
    });
  }
}

// ---- Alarms ------------------------------------------------------------------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_CHECKIN) {
    await runCheckIn();
  } else if (alarm.name === ALARM_END) {
    await completeSession("completed", "Session finished. Great work!");
  } else if (alarm.name === ALARM_BREAK) {
    await resumeFromBreak();
  }
});

// ---- Commands ----------------------------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-session") return;
  const session = await getSession();
  if (session?.active) {
    await stopSession();
  } else {
    try {
      await chrome.action.openPopup();
    } catch {
      await startSession("Focus time", 25, 5);
      await notify("Study session started", "Press the shortcut again to stop.");
    }
  }
});

// ---- Notifications -----------------------------------------------------------

async function notify(title, message, buttons = []) {
  try {
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message: message || "",
      buttons,
    });
  } catch (e) {
    console.error("Notification failed:", e);
  }
}

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const session = await getSession();
  if (!session?.active) return;
  if (buttonIndex === 0) {
    await stopSession();
  } else if (buttonIndex === 1) {
    await startBreak(5);
  }
});

// ---- Tab tracking ------------------------------------------------------------

async function recordTab(tabId) {
  const session = await getSession();
  if (!session || !session.active || session.state === "break") return;

  const now = Date.now();
  const last = lastTabRecord.get(tabId) || 0;
  if (now - last < TAB_RECORD_THROTTLE_MS) return;
  lastTabRecord.set(tabId, now);

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || isInternalUrl(tab.url)) return;

    await enqueueSessionUpdate((session) => {
      if (!session || !session.active) return null;
      const entry = {
        url: tab.url,
        title: tab.title || tab.url,
        domain: domainOf(tab.url),
        timestamp: now,
      };
      // Avoid duplicate consecutive entries for the same URL.
      const recent = session.recentTabs || [];
      if (recent[0]?.url === tab.url) {
        recent[0] = entry;
        return { ...session, recentTabs: recent.slice(0, MAX_RECENT_TABS) };
      }
      return { ...session, recentTabs: [entry, ...recent].slice(0, MAX_RECENT_TABS) };
    });
  } catch (e) {
    // Tab may have closed; ignore.
  }
}

chrome.tabs.onActivated.addListener((info) => recordTab(info.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    recordTab(tabId);
  }
});

// ---- Session control ---------------------------------------------------------

export async function startSession(goal, durationMinutes, checkInMinutes) {
  const cleanGoal = sanitizeGoal(goal) || "Focus session";
  durationMinutes = clamp(durationMinutes, 1, 240);
  checkInMinutes = clamp(checkInMinutes, 1, 60);

  const now = Date.now();
  const session = {
    active: true,
    state: "focused",
    goal: cleanGoal,
    startTime: now,
    endTime: now + durationMinutes * 60 * 1000,
    durationMinutes,
    checkInMinutes,
    warningCount: 0,
    interventionCount: 0,
    consecutiveDistracted: 0,
    recentTabs: [],
    lastMessage: "Session started. Stay focused!",
    lastReason: "",
    lastEvalAt: 0,
    focusMs: 0,
    lastFocusSample: now,
    historyRecorded: false,
  };

  await setSession(session);
  await Promise.all([
    chrome.alarms.create(ALARM_CHECKIN, { periodInMinutes: checkInMinutes }),
    chrome.alarms.create(ALARM_END, { delayInMinutes: durationMinutes }),
  ]);

  await notify("Study session started", cleanGoal);
  await playSound("start");

  const settings = await loadSettings();
  if (settings.openFocusPage) {
    await openFocusPage();
  }
}

async function completeSession(state, message) {
  await enqueueSessionUpdate((session) => {
    if (!session) return null;

    // Account final focused time slice.
    let focusMs = session.focusMs || 0;
    if (session.state === "focused" && session.lastFocusSample) {
      focusMs += Date.now() - session.lastFocusSample;
    }

    const totalMs = Date.now() - session.startTime;
    const focusScore = totalMs > 0 ? Math.round((focusMs / totalMs) * 100) : 100;

    const historyEntry = {
      goal: session.goal,
      durationMinutes: session.durationMinutes,
      warnings: session.warningCount || 0,
      interventions: session.interventionCount || 0,
      focusScore,
      completedAt: Date.now(),
      state,
    };

    // Persist history asynchronously; don't block.
    chrome.storage.local.get({ history: [] }).then(({ history }) => {
      history.unshift(historyEntry);
      chrome.storage.local.set({ history: history.slice(0, 100) });
    });

    return {
      ...session,
      active: false,
      state: state || "completed",
      lastMessage: message || "Session ended.",
      focusMs,
      focusScore,
      historyRecorded: true,
    };
  });

  await chrome.alarms.clear(ALARM_CHECKIN);
  await chrome.alarms.clear(ALARM_END);
  await chrome.alarms.clear(ALARM_BREAK);

  await notify("Study session ended", message);
  await playSound(state === "completed" ? "complete" : "stop");
}

export async function stopSession() {
  await completeSession("idle", "You ended the session.");
}

export async function startBreak(minutes = 5) {
  await enqueueSessionUpdate((session) => {
    if (!session || !session.active || session.state === "break") return null;

    let focusMs = session.focusMs || 0;
    if (session.state === "focused" && session.lastFocusSample) {
      focusMs += Date.now() - session.lastFocusSample;
    }

    return {
      ...session,
      state: "break",
      breakEndsAt: Date.now() + minutes * 60 * 1000,
      focusMs,
      lastMessage: `Break time! Back in ${minutes} minutes.`,
    };
  });

  await chrome.alarms.clear(ALARM_CHECKIN);
  await chrome.alarms.create(ALARM_BREAK, { delayInMinutes: clamp(minutes, 1, 60) });
  await notify("Break started", `Back to focus in ${minutes} minutes.`);
}

async function resumeFromBreak() {
  await enqueueSessionUpdate((session) => {
    if (!session || !session.active) return null;
    return {
      ...session,
      state: "focused",
      lastFocusSample: Date.now(),
      lastMessage: "Break over. Welcome back!",
    };
  });

  const session = await getSession();
  if (!session) return;

  const remainingMin = Math.max(1, (session.endTime - Date.now()) / 60000);
  await chrome.alarms.create(ALARM_CHECKIN, { periodInMinutes: session.checkInMinutes });
  await chrome.alarms.create(ALARM_END, { delayInMinutes: remainingMin });
  await notify("Break over", "Time to refocus.");
}

// ---- Check-in / AI evaluation -----------------------------------------------

async function runCheckIn() {
  const session = await getSession();
  if (!session || !session.active || session.state === "break") return;

  const settings = await loadSettings();
  const activeTab = await getActiveTab();
  const activeDomain = activeTab ? domainOf(activeTab.url) : "";

  let result;
  try {
    result = await evaluateWithLLM(session, settings);
  } catch (err) {
    console.warn("LLM eval failed, will retry once:", err.message);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      result = await evaluateWithLLM(session, settings);
    } catch (err2) {
      console.error("LLM eval retry failed:", err2.message);
      result = fallbackHeuristic(session, activeDomain, settings);
    }
  }

  const rawState = result.state;
  let nextState = "focused";
  let consecutiveDistracted = session.consecutiveDistracted || 0;

  if (rawState === "focused") {
    consecutiveDistracted = 0;
    nextState = "focused";
  } else {
    consecutiveDistracted += 1;
    const threshold = clamp(settings.interventionThreshold || 2, 1, 10);
    nextState = consecutiveDistracted >= threshold ? "intervention" : "warning";
  }

  const now = Date.now();
  await enqueueSessionUpdate((session) => {
    if (!session || !session.active) return null;

    let focusMs = session.focusMs || 0;
    if (session.state === "focused" && session.lastFocusSample) {
      focusMs += now - session.lastFocusSample;
    }

    const isFocusedNow = nextState === "focused";

    const updated = {
      ...session,
      state: nextState,
      consecutiveDistracted,
      lastMessage: result.message,
      lastReason: result.reason,
      lastEvalAt: now,
      focusMs,
      lastFocusSample: isFocusedNow ? now : 0,
    };

    if (nextState === "warning") updated.warningCount = (session.warningCount || 0) + 1;
    if (nextState === "intervention") updated.interventionCount = (session.interventionCount || 0) + 1;

    return updated;
  });

  if (nextState === "warning" || nextState === "intervention") {
    await notify(
      nextState === "intervention" ? "Focus intervention" : "Focus nudge",
      result.message,
      [{ title: "End session" }, { title: "Take a break" }]
    );
    await playSound(nextState);
    if (activeTab && !isInternalUrl(activeTab.url)) {
      await sendOverlay(activeTab.id, nextState === "intervention" ? "showIntervention" : "showWarning", result.message, result.reason);
    }
  } else if (session.state !== "focused") {
    // We just returned to focused.
    await notify("Back on track", result.message);
  }
}

async function evaluateWithLLM(session, settings) {
  const recent = (session.recentTabs || [])
    .slice(0, 20)
    .map((t) => `- ${t.domain}: "${t.title}"`)
    .join("\n");

  const allowNote = settings.allowDomains.length
    ? "Always focus-aligned domains: " + settings.allowDomains.join(", ")
    : "";
  const blockNote = settings.blockDomains.length
    ? "Commonly distracting domains: " + settings.blockDomains.join(", ")
    : "";

  const prompt = `You are a supportive, ethical study coach. The student set this goal: "${session.goal}".
Recent active tabs:
${recent || "(none recorded yet)"}
${allowNote}
${blockNote}

Classify the student's current focus state as exactly one of: focused, warning, intervention.
- "focused": tabs clearly serve the study goal or are neutral/allowed.
- "warning": tabs look mildly off-track, ambiguous, or the student may be drifting.
- "intervention": tabs are clearly unrelated entertainment, social media, shopping, gaming, etc.

Return ONLY valid JSON with no markdown, no explanation:
{"state":"...","reason":"short reason","message":"short supportive nudge to the user"}`;

  const body = {
    model: settings.llmModel || undefined,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 8000,
  };

  const res = await fetch(settings.llmUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseEvalJson(text);
}

function parseEvalJson(text) {
  const cleaned = text.replace(/```json\s*/i, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : cleaned;
  const parsed = JSON.parse(json);

  const allowed = ["focused", "warning", "intervention"];
  if (!allowed.includes(parsed.state)) parsed.state = "focused";
  return {
    state: parsed.state,
    reason: parsed.reason || "",
    message: parsed.message || "Keep going!",
  };
}

function fallbackHeuristic(session, activeDomain, settings) {
  if (activeDomain && isAllowedDomain(activeDomain, settings.allowDomains)) {
    return {
      state: "focused",
      reason: `${activeDomain} is on your allowed list.`,
      message: "Allowed site — stay focused on your goal.",
    };
  }
  if (activeDomain && isBlockedDomain(activeDomain, settings.blockDomains)) {
    return {
      state: "intervention",
      reason: `${activeDomain} is on your distraction list.`,
      message: "This site is on your distraction list. Time to refocus!",
    };
  }
  return {
    state: "focused",
    reason: "No clear distraction signal.",
    message: "Keep working toward your goal.",
  };
}

async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tabs[0];
  } catch {
    return null;
  }
}

// ---- Overlay messaging -------------------------------------------------------

async function sendOverlay(tabId, type, message, reason) {
  // Try direct messaging first.
  if (await trySendTab(tabId, type, message, reason)) return;

  // Content script may not be loaded (tab was open before extension load/reload).
  // Inject it dynamically and retry.
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["content.css"],
    });
    await chrome.tabs.sendMessage(tabId, { type, message, reason });
  } catch (e) {
    console.warn("Could not send overlay to tab", tabId, e.message);
  }
}

async function trySendTab(tabId, type, message, reason) {
  try {
    await chrome.tabs.sendMessage(tabId, { type, message, reason });
    return true;
  } catch {
    return false;
  }
}

// ---- Focus page --------------------------------------------------------------

async function openFocusPage() {
  const url = chrome.runtime.getURL("focus.html");
  try {
    const existing = await chrome.tabs.query({ url });
    if (existing.length) {
      await chrome.tabs.update(existing[0].id, { active: true });
    } else {
      await chrome.tabs.create({ url });
    }
  } catch (e) {
    console.error("Could not open focus page:", e);
  }
}

// ---- Offscreen sound ---------------------------------------------------------

async function playSound(name) {
  const settings = await loadSettings();
  if (!settings.soundEnabled) return;

  if (!offscreenReady) {
    try {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play gentle study session sounds",
      });
      offscreenReady = true;
    } catch (e) {
      // Document may already exist.
      offscreenReady = true;
    }
  }

  try {
    await chrome.runtime.sendMessage({ type: "playSound", name });
  } catch (e) {
    console.warn("Sound playback failed:", e);
  }
}

// ---- Message passing ---------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "startSession":
        await startSession(msg.goal, msg.durationMinutes, msg.checkInMinutes);
        sendResponse({ ok: true });
        break;
      case "stopSession":
        await stopSession();
        sendResponse({ ok: true });
        break;
      case "startBreak":
        await startBreak(msg.minutes);
        sendResponse({ ok: true });
        break;
      case "getStatus":
        sendResponse(await buildStatus());
        break;
      case "dismissWarning":
        await enqueueSessionUpdate((session) => {
          if (!session || !session.active) return null;
          return {
            ...session,
            state: "focused",
            lastFocusSample: Date.now(),
            lastMessage: "Warning dismissed. Back to focus.",
          };
        });
        sendResponse({ ok: true });
        break;
      case "openSidePanel":
        try {
          await chrome.sidePanel.open({ windowId: sender.tab?.windowId });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      default:
        sendResponse({ ok: false, error: "Unknown message type" });
    }
  })();
  return true;
});

async function buildStatus() {
  const session = await getSession();
  if (!session || !session.active) {
    return { active: false };
  }
  const now = Date.now();
  let focusMs = session.focusMs || 0;
  if (session.state === "focused" && session.lastFocusSample) {
    focusMs += now - session.lastFocusSample;
  }
  const totalMs = now - session.startTime;
  const focusScore = totalMs > 0 ? Math.round((focusMs / totalMs) * 100) : 100;

  return {
    active: true,
    state: session.state,
    goal: session.goal,
    remainingMs: Math.max(0, session.endTime - now),
    totalMs,
    focusMs,
    focusScore,
    warningCount: session.warningCount || 0,
    interventionCount: session.interventionCount || 0,
    lastMessage: session.lastMessage,
    lastReason: session.lastReason,
    recentTabs: session.recentTabs || [],
  };
}
