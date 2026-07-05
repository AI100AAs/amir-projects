#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# shellcheck disable=SC1091
source .venv/bin/activate

PORT="${PORT:-8765}"
echo "Starting StoryWhisper on http://127.0.0.1:$PORT"
exec uvicorn server:app --host 127.0.0.1 --port "$PORT" --reload
