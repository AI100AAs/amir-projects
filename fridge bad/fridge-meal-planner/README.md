# FridgeAI — Smart Kitchen Assistant

**AI100 Sample Project — Amirhossein Dabiriaghdam, June 2026**

An AI-powered web app that tracks your fridge inventory, suggests meals from what you have, builds a shopping list for missing ingredients, and plans your entire week — all running 100% locally using LM Studio.

---

## Features

| Feature | Description |
|---|---|
| **Fridge Inventory** | Add, edit, delete items with quantity, unit, category, expiry date, barcode, notes |
| **Quick-add presets** | One-click common items (Eggs, Milk, Chicken, etc.) |
| **Expiry tracking** | Color-coded badges; banners warn about expiring and expired items |
| **AI Photo Scan** | Upload a fridge photo → AI detects items → review and confirm |
| **AI Meal Suggestions** | Streaming recipes from your fridge, with nutrition, steps, difficulty |
| **Expiry-first mode** | AI prioritises soon-to-expire items to reduce waste |
| **Shopping List** | Auto-built from recipe missing ingredients; manual add, check-off, export as .txt |
| **Weekly Meal Planner** | 7-day calendar; "Plan my week" fills it with AI suggestions |
| **Dietary Prefs & Allergies** | Saved preferences flow into every AI prompt |
| **Dark / light mode** | Persistent theme toggle |
| **AI status indicator** | Live connection indicator shows model name and online/offline state |

---

## Requirements

- **Node.js** v18 or newer
- **LM Studio** running at `http://localhost:1234` with a model loaded (default: `google/gemma-4-e4b`)
  - Any model with chat and vision support works; change `MODEL_ID` in `.env` to switch

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Make sure LM Studio is running with a model loaded

# 3. Start the app (runs the backend server + browser dev server together)
npm run dev

# 4. Open in your browser
open http://localhost:5173
```

That's it. The app starts with 20 sample fridge items so it looks alive immediately.

---

## Configuration

Edit `.env` to change the model or server port:

```env
LMSTUDIO_URL=http://localhost:1234/v1
MODEL_ID=google/gemma-4-e4b
PORT=3001
DB_PATH=./fridge.db
```

**Available models on your LM Studio** (as of project creation):
- `google/gemma-4-e4b` ← default (multimodal, vision works)
- `gemma-4-12b-it`
- `qwen/qwen3.6-27b`
- `google/gemma-4-26b-a4b`

---

## Architecture

```
Browser (React + Tailwind)
      │  REST + SSE streaming
      ▼
Express server  (localhost:3001)
   ├─ /api/items          ─┐
   ├─ /api/shopping        ├─ SQLite database (fridge.db)
   ├─ /api/plan            │
   ├─ /api/prefs          ─┘
   ├─ /api/scan     →  LM Studio vision
   ├─ /api/meals    →  LM Studio streaming chat
   └─ /api/health   →  model list
          │
          ▼
LM Studio  (localhost:1234/v1)
OpenAI-compatible API
```

---

## Running Tests

```bash
npm test
```

Tests cover: expiry date logic, label/color helpers, JSON parsing (with fences, incomplete JSON), and utility functions.

---

## Project Structure

```
fridge-meal-planner/
├─ server/
│  ├─ index.js        Express routes (CRUD + AI proxy)
│  ├─ db.js           SQLite schema + seed data
│  ├─ llm.js          LM Studio calls (chat, vision, streaming)
│  └─ prompts.js      AI prompt templates
├─ src/
│  ├─ App.tsx          Layout + navigation
│  ├─ types.ts         TypeScript types + constants
│  ├─ lib/
│  │  ├─ api.ts        HTTP wrappers
│  │  └─ utils.ts      Helpers (dates, parsing, classnames)
│  ├─ context/
│  │  └─ ThemeContext  Dark/light mode
│  ├─ components/
│  │  ├─ Navbar        Top bar + sidebar + mobile tabs
│  │  ├─ RecipeCard    Full recipe with nutrition, steps, actions
│  │  ├─ ItemForm      Add/edit fridge item form
│  │  ├─ ExpiryBadge   Color-coded expiry indicator
│  │  └─ Modal         Reusable dialog
│  └─ pages/
│     ├─ Inventory     Fridge item list
│     ├─ Meals         AI meal suggestions (streaming)
│     ├─ PhotoScan     Image upload + AI detection
│     ├─ Shopping      Shopping list
│     ├─ Planner       Weekly calendar
│     └─ Settings      Preferences
├─ .env               Model config
└─ fridge.db          SQLite database (auto-created)
```

---

## Ethical Notes (AI100)

This project addresses the ethics points from the slides:

- **Reliability**: The photo scan has a human review step — you confirm detected items before they're added. AI-generated recipes can't be added to your fridge automatically.
- **Privacy**: Everything runs locally. No data leaves your computer. No cloud APIs.
- **Dependency risk**: All features except AI suggestions work without LM Studio running (inventory, shopping list, planner).
- **Food waste**: The "prioritise expiring items" toggle addresses the food waste reduction goal directly.

---

## Future Work

Per the project scope, these features are intentionally left for future iterations:
- Real grocery ordering integration (e.g., Instacart, Amazon Fresh APIs)
- Wearable / health device sync (Apple Health, Fitbit)
- Government food waste analytics dashboard
- Barcode scanning via device camera (ZXing)
- Nutritional goal tracking over time
