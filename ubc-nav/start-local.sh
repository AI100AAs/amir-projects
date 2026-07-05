#!/usr/bin/env bash
# One-command launcher for UBC Soft-Nav.
#
#   ./start-local.sh                 # auto-detect LM Studio, else rule-based
#   ./start-local.sh --model <id>    # force a specific LM Studio model id
#   PORT=8080 ./start-local.sh       # change the port
#
# Loads a .env file if present (KEY=value lines) for ANTHROPIC_API_KEY etc.
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
LMSTUDIO_BASE_URL="${LMSTUDIO_BASE_URL:-http://localhost:1234/v1}"

# --- args -------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) export LMSTUDIO_MODEL="$2"; shift 2 ;;
    --provider) export LLM_PROVIDER="$2"; shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# --- optional .env ----------------------------------------------------------
if [[ -f .env ]]; then
  echo "Loading .env"
  set -a; source .env; set +a
fi

# --- prerequisites ----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required (https://nodejs.org). Aborting." >&2
  exit 1
fi
echo "Node $(node --version)"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (vendored Leaflet)…"
  npm install --no-audit --no-fund
fi

# --- detect LM Studio -------------------------------------------------------
if curl -fsS --max-time 1.5 "${LMSTUDIO_BASE_URL}/models" >/dev/null 2>&1; then
  echo "✓ LM Studio detected at ${LMSTUDIO_BASE_URL}"
  echo "  Interpreter: local model${LMSTUDIO_MODEL:+ ($LMSTUDIO_MODEL)}"
else
  echo "• LM Studio not reachable at ${LMSTUDIO_BASE_URL}"
  echo "  Start its local server (Developer ▸ Start Server) to use your model."
  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    echo "  Falling back to Claude (ANTHROPIC_API_KEY is set)."
  else
    echo "  Falling back to the built-in rule-based interpreter."
  fi
fi

# --- open the browser (best effort) ----------------------------------------
URL="http://localhost:${PORT}"
( sleep 1.5
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  fi ) >/dev/null 2>&1 &

echo
echo "Starting UBC Soft-Nav at ${URL}  (Ctrl+C to stop)"
echo
PORT="$PORT" exec node server.js
