# Truth Lens — Fake News Detection System

A zero-config, two-mode fake news detector that extracts factual claims from articles, cross-references them against a curated knowledge base via RAG (Retrieval-Augmented Generation), and produces a credibility score with detailed reasoning.

**Modes:**
- **Local mode** — works fully offline, no API key needed (sentence splitting + ChromaDB similarity)
- **LLM mode** — uses any OpenAI-compatible API key (OpenRouter, OpenAI) for LLM-powered extraction and judging

---

## Architecture

```
  Input     →  Claim Extraction  →  RAG Search  →  Verdict & Score

  Text         Local: split          ChromaDB      Similarity (local)
  or      →    sentences +      →    +         →  or
  URL          heuristic filter      sentence-     LLM judge
               LLM: extract          transformers  Aggregated score
               3-7 claims via        (25 seed
               prompt                claims)
```

### Pipeline Steps

#### 1. Input
- Accepts raw article text **or** a URL (fetched via `newspaper4k`)
- Max text length: configurable up to 200K characters (default 50K)
- Text is truncated to fit the limit before processing

#### 2. Claim Extraction

**Local mode** (`_extract_claims_local` in `pipeline.py`):
- Splits text on sentence boundaries (`[.!?]`)
- Filters out:
  - Sentences < 15 chars or > 500 chars
  - Questions (ending with `?`)
  - Transitional phrases ("for example", "however", "meanwhile", etc.)
  - Near-duplicates (tracked via normalized lowercase set)
- Caps at `max_claims` (default 7)

**LLM mode** (`_extract_claims_llm` in `pipeline.py`):
- Sends the full text with the `CLAIM_EXTRACTION_PROMPT` to the configured LLM
- Prompt instructs the model to return a JSON array of claim objects with `{"claims": [{"text": "..."}]}`
- Response is parsed by `_parse_json` which:
  1. Strips markdown code fences
  2. Finds outermost `{ }` braces
  3. Removes trailing commas
  4. Falls back to replacing single quotes with double quotes
  5. Raises `RuntimeError` if all parsing fails

#### 3. RAG Retrieval

Architecture: `app/rag_engine.py`

- **Vector store**: ChromaDB (persistent, stored in `data/chroma/`)
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional, downloads ~90MB on first startup)
- **Seed data**: 25 curated claims across 8 categories (science, health, politics, environment, technology, geography, history) — each with a verdict (true/false/misleading), source, and category
- **Search**: For each extracted claim, the top 5 most semantically similar seed claims are retrieved, ranked by cosine distance

#### 4. Verdict & Score

**Local mode** (`_judge_claim_local`):
- Uses the distance to the closest matching seed claim
- **Close match** (distance < `1.0 - threshold`): adopts the seed claim's verdict, confidence = `max(0.5, 1.0 - distance)`
- **Partial match** (distance < `1.0 - threshold * 0.6`): same verdict but lower confidence
- **No match**: verdict = `unverifiable`, confidence = 0.2
- **Empty results**: verdict = `unverifiable`, confidence = 0.0

**LLM mode** (`_judge_claim_llm`):
- Builds a context string from the top 5 similar seed claims (claim text, verdict, source, distance)
- Sends both the claim and context to the LLM judge with the `JUDGE_PROMPT`
- LLM returns `{"verdict": "true|false|misleading", "confidence": 0.0-1.0, "explanation": "...", "evidence": [...]}`
- Same `_parse_json` recovery applied

#### 5. Aggregation

- Verdict scores mapped: `true = 1.0`, `misleading = 0.4`, `false = 0.1`, `unverifiable = 0.3`
- Final score = mean of `verdict_score * confidence` across all claims
- Verdict thresholds: ≥ 0.7 → "likely credible", ≥ 0.4 → "mixed / needs verification", below → "likely not credible"

#### 6. Warnings

- **Local mode**: detects emotional keywords ("shocking", "exposed", "they don't want you to know", etc.), very short text, low sentence count
- **LLM mode**: prompt sent to LLM asking about hallucination risks, source bias, emotional manipulation, and lack of verifiable sources

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3, FastAPI, Uvicorn |
| Frontend | Jinja2 templates, Tailwind CSS, vanilla JS |
| Vector Store | ChromaDB (persistent) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| LLM Provider | OpenRouter (default), OpenAI-compatible |
| Article fetching | newspaper4k |
| History | File-based JSON (data/history/) |

---

## Features

### Dark Mode
Toggle via the moon/sun icon in the nav bar. Persisted in `localStorage`.

### Expert Mode
Expandable panel with adjustable settings:
| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Max Text Length | 50,000 | 1K–200K | Characters of text to analyze |
| Max Claims | 7 | 1–20 | Max claims to extract |
| Similarity Threshold | 0.70 | 0.1–1.0 | Strictness of local similarity judging |
| Temperature | 0.30 | 0.0–2.0 | LLM creativity (LLM mode only) |
| Model Override | — | text | Custom model name (LLM mode only) |

### Streaming Progress
Real-time SSE updates showing each analysis stage:
1. Mode badge (local/LLM)
2. Status messages
3. Per-claim extraction and judging with live card rendering
4. Final results with animated score gauge

### Analysis History
- Auto-saved to `data/history/` as JSON files with an index
- Viewable from the sidebar (last 10) or via `/history/{id}`
- Searchable by text, mode, verdict, or model name
- Individual delete and clear all
- Survives server restarts

### Export
- Copy results as JSON
- Download as Markdown report

### Retry
Re-run analysis with the same inputs (text, URL, API key, expert settings). Available on both error and success screens.

### Model Info
Shows which model actually responded to the API call (useful with `openrouter/free` which routes dynamically).

---

## API Endpoints

### `POST /api/analyze`
Non-streaming analysis. Body: `{text, url?, api_key?, expert?}`

### `POST /api/analyze/stream`
SSE-streamed analysis (same body). Events: `mode`, `status`, `claim_start`, `claim_result`, `done`, `error`

### `GET /api/history`
List history. Params: `limit` (default 10), `search` (optional query)

### `GET /api/history/{id}`
Get full result for a history entry.

### `DELETE /api/history/{id}`
Delete a single history entry.

### `DELETE /api/history`
Clear all history.

### `GET/POST /analyze`
Server-rendered HTML form fallback (non-JS). POST returns a rendered results page.

---

## Data Files

```
data/
├── chroma/          # ChromaDB vector store (auto-created)
│   ├── chroma.sqlite3
│   └── ...
└── history/         # Analysis history
    ├── index.json   # Index of last 50 entries
    └── {id}.json    # Individual result files
```

---

## Seed Knowledge Base

**130+ static claims** in `app/datasets.py` across 11 categories (health, science, environment, politics-US, politics-global, technology, history, economics, conspiracy, social). Each entry has a claim text, verdict, source citation, and category.

On first startup, the system also **enriches the knowledge base from the Google Fact Check Tools API** — querying 10 topics (covid, vaccine, climate, election, immigration, etc.) and adding real fact-checks from PolitiFact, Snopes, Reuters, and other verified sources. This adds 50-100+ additional claims automatically.

The combined dataset is embedded into ChromaDB via `sentence-transformers/all-MiniLM-L6-v2` and used for similarity-based retrieval in both local and LLM modes.

### Static claim breakdown
| Verdict | Count |
|---------|-------|
| True    | ~45   |
| False   | ~45   |
| Misleading | ~25  |
| Unverifiable | (rare, added by API) |

To extend further: add entries to `SEED_CLAIMS` in `app/datasets.py` and call `rebuild_index()` from `rag_engine.py`, or delete `data/chroma/` to force a fresh seed on next startup.

---

## Limitations

- **Knowledge base coverage** — 130+ static claims + API enrichment covers many topics but cannot cover the full landscape of disinformation
- **Western bias** — Sources are predominantly English-language institutional sources (CDC, WHO, NASA, FBI, PolitiFact)
- **Semantic ≠ factual** — Local mode scores similarity, not truth; two false claims that use similar language score "true" against each other
- **Hallucination risk (LLM mode)** — LLMs can fabricate sources and evidence
- **Prompt injection** — Adversarial text could bias the LLM judge
- **No political neutrality** — Training data and seed claims reflect existing power structures

---

## Running

```bash
pip install -r requirements.txt
python run.py
```

Opens at `http://localhost:8000`. No environment variables needed — local mode works immediately.

To use LLM mode, get an API key from [OpenRouter](https://openrouter.ai) (free tier available) and enter it in the web UI.

---

## Project Structure

```
app/
├── main.py              # FastAPI server, all routes
├── pipeline.py          # Analysis pipeline (extract → judge → score)
├── llm_client.py        # LLM API client with retry logic
├── rag_engine.py        # ChromaDB + sentence-transformers
├── history.py           # File-based history persistence
├── models.py            # Pydantic models
├── config.py            # Default settings (model, URLs, etc.)
├── datasets.py          # 130+ seed claims (health, science, politics, conspiracy, etc.)
├── article_fetcher.py   # URL fetching via newspaper4k
└── templates/           # Jinja2 templates
    ├── base.html        # Layout, dark mode, nav, toast system
    ├── index.html       # Main form + streaming results
    ├── results.html     # Server-rendered results page
    ├── about.html       # System documentation
    └── ethics.html      # Ethical considerations

data/history/            # Analysis history (auto-created)
data/chroma/             # ChromaDB vector store (auto-created)
```

---

## Configuration

Environment variables (all optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_MODEL` | `openrouter/free` | Default LLM model |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` | API base URL |
| `LLM_API_KEY` | — | Global API key (overrides per-request key) |
| `LLM_MAX_TOKENS` | `2048` | Max tokens in LLM response |
| `LLM_TEMPERATURE` | `0.3` | LLM temperature |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence transformer model |
