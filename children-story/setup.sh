#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "==> Creating Python virtual environment (.venv)"
PYTHON_BIN="${PYTHON_BIN:-python3.13}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN=python3
fi
"$PYTHON_BIN" -m venv .venv
source .venv/bin/activate

echo "==> Upgrading pip and installing dependencies"
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "==> Checking for ffmpeg (needed for audio conversion)"
if command -v ffmpeg >/dev/null 2>&1; then
  echo "  ffmpeg found: $(command -v ffmpeg)"
else
  echo "  ffmpeg NOT found. Install it with:  brew install ffmpeg"
  echo "  (Audio conversion for voice cloning will not work without it.)"
fi

echo ""
echo "==> Checking for LM Studio (used for story generation)"
echo "    Make sure LM Studio's local server is running at:"
echo "      http://localhost:1234/v1"
echo "    Open LM Studio, load a model, go to Developer tab, click Start Server."

echo ""
echo "==> Voice cloning model (XTTS-v2)"
echo "    The model (~1.8 GB) downloads automatically on first use."
echo "    This happens when you first click 'Create Narration' in clone mode."

echo ""
echo "==> Setup complete!"
echo "    Start the app:  ./run.sh"
echo "    Then open:       http://127.0.0.1:8765"
