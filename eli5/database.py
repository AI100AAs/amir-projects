"""
Robust SQLite database layer with migrations, connection pooling,
and comprehensive CRUD operations for the ELI5 News Database.
"""

import sqlite3
import json
import os
import threading
from datetime import datetime
from typing import List, Dict, Optional, Any

DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'news.db')
DB_LOCK = threading.Lock()

# Schema version for migrations
SCHEMA_VERSION = 2

def get_db() -> sqlite3.Connection:
    """Get a database connection with proper settings."""
    conn = sqlite3.connect(DATABASE, check_same_thread=False, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

def _table_exists(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,)
    ).fetchone()
    return row is not None

def _get_schema_version(conn: sqlite3.Connection) -> int:
    try:
        row = conn.execute("SELECT version FROM schema_version").fetchone()
        return row[0] if row else 0
    except sqlite3.OperationalError:
        return 0

def _set_schema_version(conn: sqlite3.Connection, version: int):
    conn.execute("DELETE FROM schema_version")
    conn.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))

def init_db():
    """Initialize database, running migrations as needed."""
    with DB_LOCK:
        conn = get_db()
        try:
            # Create schema version table if missing
            if not _table_exists(conn, 'schema_version'):
                conn.execute('''
                    CREATE TABLE schema_version (
                        version INTEGER PRIMARY KEY
                    )
                ''')
                conn.execute("INSERT INTO schema_version (version) VALUES (0)")

            current_version = _get_schema_version(conn)

            if current_version < 1:
                _migrate_v0_to_v1(conn)
                current_version = 1

            if current_version < 2:
                _migrate_v1_to_v2(conn)
                current_version = 2

            _set_schema_version(conn, current_version)
            conn.commit()
        finally:
            conn.close()

def _migrate_v0_to_v1(conn: sqlite3.Connection):
    """Initial schema creation."""
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            original_text TEXT NOT NULL,
            source_url TEXT,
            eli5_summary TEXT,
            confidence_level REAL DEFAULT 0.0,
            modification_level REAL DEFAULT 0.0,
            topics TEXT, -- JSON array
            ethical_flags TEXT, -- JSON object
            reading_time INTEGER DEFAULT 0, -- minutes
            word_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_articles_topics ON articles(topics);

        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_article_id INTEGER NOT NULL,
            target_article_id INTEGER NOT NULL,
            link_type TEXT NOT NULL CHECK(link_type IN ('update', 'contradiction', 'related', 'similar_topic', 'semantic')),
            description TEXT,
            confidence REAL DEFAULT 0.0,
            method TEXT DEFAULT 'llm', -- 'llm' or 'semantic'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_article_id) REFERENCES articles(id) ON DELETE CASCADE,
            FOREIGN KEY (target_article_id) REFERENCES articles(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_article_id);
        CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_article_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_links_pair ON links(source_article_id, target_article_id, link_type);

        CREATE TABLE IF NOT EXISTS article_embeddings (
            article_id INTEGER PRIMARY KEY,
            tfidf_vector BLOB, -- serialized numpy array
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
        );
    ''')

def _migrate_v1_to_v2(conn: sqlite3.Connection):
    """Add any v2 schema changes here."""
    # v1 and v2 are currently the same since we built v2 from scratch
    pass

def add_article(title: str, original_text: str, source_url: str = None,
                eli5_summary: str = None, confidence_level: float = 0.0,
                modification_level: float = 0.0, topics: list = None,
                ethical_flags: dict = None, reading_time: int = 0,
                word_count: int = 0) -> int:
    with DB_LOCK:
        conn = get_db()
        try:
            cursor = conn.execute(
                '''INSERT INTO articles
                   (title, original_text, source_url, eli5_summary,
                    confidence_level, modification_level, topics, ethical_flags,
                    reading_time, word_count)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (title, original_text, source_url, eli5_summary,
                 confidence_level, modification_level,
                 json.dumps(topics or []), json.dumps(ethical_flags or {}),
                 reading_time, word_count)
            )
            article_id = cursor.lastrowid
            conn.commit()
            return article_id
        finally:
            conn.close()

def update_article_summary(article_id: int, eli5_summary: str,
                           confidence_level: float, modification_level: float,
                           topics: list, ethical_flags: dict = None,
                           reading_time: int = None, word_count: int = None):
    with DB_LOCK:
        conn = get_db()
        try:
            updates = [
                ("eli5_summary", eli5_summary),
                ("confidence_level", confidence_level),
                ("modification_level", modification_level),
                ("topics", json.dumps(topics)),
                ("ethical_flags", json.dumps(ethical_flags or {})),
                ("updated_at", datetime.now().isoformat()),
            ]
            if reading_time is not None:
                updates.append(("reading_time", reading_time))
            if word_count is not None:
                updates.append(("word_count", word_count))

            fields = ", ".join(f"{k}=?" for k, _ in updates)
            values = [v for _, v in updates]
            values.append(article_id)

            conn.execute(
                f"UPDATE articles SET {fields} WHERE id = ?",
                values
            )
            conn.commit()
        finally:
            conn.close()

def get_article(article_id: int) -> Optional[Dict[str, Any]]:
    with DB_LOCK:
        conn = get_db()
        try:
            row = conn.execute(
                'SELECT * FROM articles WHERE id = ?', (article_id,)
            ).fetchone()
            if not row:
                return None
            return _row_to_dict(row)
        finally:
            conn.close()

def get_all_articles(limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
    with DB_LOCK:
        conn = get_db()
        try:
            query = 'SELECT * FROM articles ORDER BY created_at DESC LIMIT ? OFFSET ?'
            rows = conn.execute(query, (limit or 999999, offset)).fetchall()
            return [_row_to_dict(row) for row in rows]
        finally:
            conn.close()

def get_articles_by_ids(ids: List[int]) -> List[Dict[str, Any]]:
    if not ids:
        return []
    with DB_LOCK:
        conn = get_db()
        try:
            placeholders = ','.join('?' * len(ids))
            rows = conn.execute(
                f'SELECT * FROM articles WHERE id IN ({placeholders})',
                ids
            ).fetchall()
            return [_row_to_dict(row) for row in rows]
        finally:
            conn.close()

def search_articles(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    with DB_LOCK:
        conn = get_db()
        try:
            pattern = f"%{query}%"
            rows = conn.execute(
                '''SELECT * FROM articles
                   WHERE title LIKE ? OR original_text LIKE ? OR eli5_summary LIKE ?
                   ORDER BY created_at DESC LIMIT ?''',
                (pattern, pattern, pattern, limit)
            ).fetchall()
            return [_row_to_dict(row) for row in rows]
        finally:
            conn.close()

def get_topic_distribution() -> Dict[str, int]:
    with DB_LOCK:
        conn = get_db()
        try:
            rows = conn.execute('SELECT topics FROM articles').fetchall()
            counts = {}
            for row in rows:
                topics = json.loads(row[0] or '[]')
                for t in topics:
                    counts[t] = counts.get(t, 0) + 1
            return counts
        finally:
            conn.close()

def get_stats() -> Dict[str, Any]:
    with DB_LOCK:
        conn = get_db()
        try:
            total = conn.execute('SELECT COUNT(*) FROM articles').fetchone()[0]
            avg_conf = conn.execute('SELECT AVG(confidence_level) FROM articles').fetchone()[0] or 0
            avg_mod = conn.execute('SELECT AVG(modification_level) FROM articles').fetchone()[0] or 0
            total_links = conn.execute('SELECT COUNT(*) FROM links').fetchone()[0]
            total_words = conn.execute('SELECT SUM(word_count) FROM articles').fetchone()[0] or 0
            return {
                'total_articles': total,
                'total_links': total_links,
                'avg_confidence': round(avg_conf, 2),
                'avg_modification': round(avg_mod, 2),
                'total_words': total_words
            }
        finally:
            conn.close()

def add_link(source_article_id: int, target_article_id: int, link_type: str,
             description: str, confidence: float, method: str = 'llm') -> Optional[int]:
    """Add a link. Returns link_id or None if it already exists."""
    with DB_LOCK:
        conn = get_db()
        try:
            # Ensure canonical ordering to prevent duplicates
            a, b = sorted([source_article_id, target_article_id])
            cursor = conn.execute(
                '''INSERT OR IGNORE INTO links
                   (source_article_id, target_article_id, link_type, description, confidence, method)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (a, b, link_type, description, confidence, method)
            )
            link_id = cursor.lastrowid if cursor.rowcount > 0 else None
            conn.commit()
            return link_id
        except sqlite3.IntegrityError:
            return None
        finally:
            conn.close()

def get_links_for_article(article_id: int) -> List[Dict[str, Any]]:
    with DB_LOCK:
        conn = get_db()
        try:
            rows = conn.execute(
                '''SELECT l.*, a.title as other_title FROM links l
                   JOIN articles a ON a.id = CASE
                       WHEN l.source_article_id = ? THEN l.target_article_id
                       ELSE l.source_article_id
                   END
                   WHERE l.source_article_id = ? OR l.target_article_id = ?
                   ORDER BY l.confidence DESC''',
                (article_id, article_id, article_id)
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

def get_all_links() -> List[Dict[str, Any]]:
    with DB_LOCK:
        conn = get_db()
        try:
            rows = conn.execute('SELECT * FROM links').fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

def delete_article(article_id: int):
    with DB_LOCK:
        conn = get_db()
        try:
            conn.execute('DELETE FROM links WHERE source_article_id = ? OR target_article_id = ?',
                         (article_id, article_id))
            conn.execute('DELETE FROM article_embeddings WHERE article_id = ?', (article_id,))
            conn.execute('DELETE FROM articles WHERE id = ?', (article_id,))
            conn.commit()
        finally:
            conn.close()

def save_embedding(article_id: int, vector: bytes):
    with DB_LOCK:
        conn = get_db()
        try:
            conn.execute(
                '''INSERT OR REPLACE INTO article_embeddings (article_id, tfidf_vector, updated_at)
                   VALUES (?, ?, ?)''',
                (article_id, vector, datetime.now().isoformat())
            )
            conn.commit()
        finally:
            conn.close()

def get_all_embeddings() -> List[Dict[str, Any]]:
    with DB_LOCK:
        conn = get_db()
        try:
            rows = conn.execute('SELECT * FROM article_embeddings').fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

def get_embedding(article_id: int) -> Optional[bytes]:
    with DB_LOCK:
        conn = get_db()
        try:
            row = conn.execute(
                'SELECT tfidf_vector FROM article_embeddings WHERE article_id = ?',
                (article_id,)
            ).fetchone()
            return row[0] if row else None
        finally:
            conn.close()

def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d['topics'] = json.loads(d.get('topics') or '[]')
    d['ethical_flags'] = json.loads(d.get('ethical_flags') or '{}')
    return d
