#!/usr/bin/env python3
"""Truth Lens — Fake News Detection System.

Usage:
    python run.py

Set LLM_API_KEY env var for real AI analysis, or run without it for demo/fallback mode.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
