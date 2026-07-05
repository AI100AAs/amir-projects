"""
SQLite persistence for StyleMate's outfit history.

A single `history` table stores each generated suggestion along with a small
JPEG thumbnail (as a data URL) so the gallery can render without extra files.
All calls are synchronous sqlite3; the app runs them off the event loop via
asyncio's default executor.
"""

import os
import sqlite3
import time
from typing import Optional

DB_PATH = os.environ.get("STYLEMATE_DB", os.path.join(os.path.dirname(__file__), "stylemate.db"))


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at  REAL NOT NULL,
                occasion    TEXT,
                prefs       TEXT,
                thumbnail   TEXT,
                suggestion  TEXT NOT NULL
            )
            """
        )


def add_entry(occasion: str, prefs: str, thumbnail: str, suggestion: str) -> int:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO history (created_at, occasion, prefs, thumbnail, suggestion) "
            "VALUES (?, ?, ?, ?, ?)",
            (time.time(), occasion, prefs, thumbnail, suggestion),
        )
        return cur.lastrowid


def list_entries(limit: int = 100) -> list[dict]:
    """Lightweight list for the gallery — includes thumbnail, omits nothing heavy
    except it's fine since thumbnails are small."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, created_at, occasion, thumbnail FROM history "
            "ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_entry(entry_id: int) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, created_at, occasion, prefs, thumbnail, suggestion "
            "FROM history WHERE id = ?",
            (entry_id,),
        ).fetchone()
        return dict(row) if row else None


def delete_entry(entry_id: int) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM history WHERE id = ?", (entry_id,))
        return cur.rowcount > 0
