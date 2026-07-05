# AI Study Buddy

A polished Chrome extension that acts as a local-AI study coach. Set a goal, start a session, and let the extension check in on your browsing, nudge you when you drift, and softly block distracting tabs with a dismissible overlay.

**Privacy-first:** by default, tab data is evaluated only by a local LM Studio server. Nothing is uploaded to the cloud.

## Features

- 🎯 **Goal-based sessions** with Pomodoro presets (25 / 45 / 90 min).
- 🤖 **Local AI check-ins** using your own model (tested with `google/gemma-4-e4b` via LM Studio).
- 🧠 **Escalating intervention**: warning → intervention after consecutive distracted check-ins.
- 🛑 **Soft block overlay** on the active tab; user can dismiss, take a break, or end the session.
- ☕ **Break mode** that pauses AI check-ins.
- 📊 **Focus dashboard** and side panel with live timer, stats, and recent tabs.
- 🔔 **System notifications** with action buttons.
- ⌨️ **Keyboard shortcut** `Ctrl+Shift+S` / `Cmd+Shift+S` to toggle a session.
- 🔊 **Optional gentle sounds** via an offscreen audio document.
- 📝 **Session history** with export to JSON.
- ⚙️ **Configurable allow/block domain lists** and escalation threshold.

## Quick start

1. **Install the extension (unpacked):**
   - Open Chrome → `chrome://extensions`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select this repository folder.
   - Pin the extension to your toolbar.

2. **Start LM Studio:**
   - Load your model (e.g. `google/gemma-4-e4b`).
   - Start the local server. Default URL: `http://localhost:1234/v1/chat/completions`.
   - (Optional) Confirm the endpoint in the extension **Options**.

3. **Run a study session:**
   - Click the extension icon, enter a goal, pick a preset, and click **Start focusing**.
   - Or press `Ctrl+Shift+S` / `Cmd+Shift+S` to start a default 25-minute session.

## Project structure

```
.
├── manifest.json        # Chrome MV3 manifest
├── background.js        # Service worker: state machine, alarms, tab tracking, LLM calls
├── popup.html/js/css    # Extension popup UI
├── options.html/js      # Extension settings and history export
├── sidepanel.html/js    # Persistent side panel dashboard
├── focus.html/js/css    # Full-screen focus dashboard
├── welcome.html/js      # Onboarding page shown on install
├── content.js/css       # Soft-block overlay injected into pages
├── offscreen.html/js    # Offscreen document for audio playback
├── shared.js            # Shared utilities and defaults
├── icons/               # Extension icons
└── AGENTS.md            # Developer notes for this repo
```

## State machine

```
idle ──start──> focused ──distracted──> warning ──distracted──> intervention
  ^                ^                      |                        |
  └────stop────────┴────dismiss──────────┴────take break──────────┘
```

- `focused`: no overlay, timer running.
- `warning`: notification + soft overlay on the active tab.
- `intervention`: stronger overlay and notification.
- `break`: pauses AI check-ins for a configurable time.
- `completed`/`idle`: session ended.

The escalation threshold is configurable in Options (default: 2 consecutive distracted check-ins trigger intervention).

## Configuration

Right-click the extension icon → **Options** to set:

- **LM Studio server URL** — default `http://localhost:1234/v1/chat/completions`.
- **Model name** — leave blank to use whatever model is loaded in LM Studio.
- **Intervention threshold** — how many consecutive distracted checks before escalation.
- **Allow-list domains** — always treated as focus-aligned.
- **Block-list domains** — always treated as distracting.
- **Open focus dashboard** — open a focus tab when a session starts.
- **Sounds** — gentle tones for start, warning, intervention, and completion.
- **Keep session tab history** — off by default.

## Privacy & ethics

This tool is designed to be an aid, not a surveillance device:

- **Local AI only by default** — browsing data is sent only to your own LM Studio server.
- **No hard blocking** — the user can always dismiss the overlay or end the session.
- **Transparent reasoning** — the overlay explains why the AI intervened.
- **Allow-list support** — reduces false positives for sites like YouTube used for learning.
- **History is opt-in** and stored locally.

## Troubleshooting

- **No check-ins:** Make sure LM Studio server is running and the URL in Options matches.
- **Overlays never appear:** The extension needs permission to run on the site. It requests `<all_urls>` on install.
- **LLM returns weird states:** The parser strips markdown, falls back to `focused` for unknown states, and retries once on network errors.
- **Sounds not playing:** Make sure **Sounds** is enabled in Options and the browser isn’t muted.
- **Keyboard shortcut not working:** Go to `chrome://extensions/shortcuts` and make sure AI Study Buddy has a shortcut set.
