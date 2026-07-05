# Agent Notes

This is a Chrome Manifest V3 browser extension. No build step, package manager, or CI exists — it is a set of static files loaded unpacked.

## Loading and verifying

- Open Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the repo root.
- Pin the extension. Open its popup and start a session.
- For AI check-ins to work, LM Studio must be running locally with a loaded model (default endpoint: `http://localhost:1234/v1/chat/completions`).
- The service worker log (`chrome://extensions` → service worker link) is the best place to debug LLM fetch failures or state transitions.

## Architecture

- `manifest.json` declares MV3, service worker module, content script on `<all_urls>`, side panel, offscreen audio, commands, and required permissions.
- `background.js` owns the state machine and timers. Session state lives in `chrome.storage.session` so it survives service-worker restarts; completed-session history lives in `chrome.storage.local`.
- `shared.js` is imported by `background.js`, `popup.js`, `options.js`, `sidepanel.js`, and `focus.js`.
- `popup.js` / `sidepanel.js` / `focus.js` only read/write state via `chrome.runtime.sendMessage`; they do not own state.
- `content.js` injects a dismissible overlay when it receives `showWarning`/`showIntervention` messages.
- `options.js` stores settings in `chrome.storage.sync` and parses allow/block domain lists.
- `offscreen.html/js` plays sounds because service workers cannot use audio.
- `welcome.html` opens automatically on first install.

## Key constraints

- MV3 service workers cannot use `setInterval` reliably; always use `chrome.alarms`.
- `fetch` to `localhost` works from the service worker because `http://localhost:*/` is in `host_permissions`.
- LLM responses are expected as JSON with `state`, `reason`, `message`; the parser strips markdown fences, retries once on failure, and falls back to `focused` if parsing still fails.
- Tab data is kept in session storage only; completed-session history persistence is opt-in in Options.
- All state updates are serialised through the `enqueueSessionUpdate` queue in `background.js` to avoid race conditions.

## Adding new UI surfaces

- Popup, options, side panel, focus dashboard, and welcome pages are all static HTML pages. They can import `shared.js` as a module.
- New extension pages must be listed in `web_accessible_resources` only if content scripts or web pages need to load them; pages opened by the extension via `chrome.runtime.getURL()` do not need to be listed.

## Modifying icons

The icons in `icons/` are generated PNGs. If you change the icon design, also update `manifest.json` icon paths and the notification icon URL in `background.js`.
