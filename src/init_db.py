"""Create the local SQLite database and its Phase 1 tables.

Idempotent: every statement is ``CREATE TABLE IF NOT EXISTS``, so this is safe
to run on every app startup and safe to re-run by hand. Deliberately does NOT
create or seed a ``bank_questions`` table — that belongs to Mode B (Phase 2),
which is out of scope here.

Usage:
    uv run python init_db.py
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path("./usmle_app.db")

# --- Schema ----------------------------------------------------------------
# One statement per table. Kept here (not in registry.py) so the whole schema
# lives in one obvious place and `init_db.py` is the single source of truth.

SCHEMA = [
    # Per-question attempt log. No `mode` / `system_tag` / `discipline_tag`
    # columns yet — those only make sense once Mode B exists, and are a
    # trivial `ALTER TABLE ... ADD COLUMN` away when it does.
    """
    CREATE TABLE IF NOT EXISTS user_history (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id      TEXT NOT NULL,
        timestamp       TEXT NOT NULL DEFAULT (datetime('now')),
        book_title      TEXT NOT NULL,
        chunk_title     TEXT NOT NULL,
        question_id     TEXT NOT NULL,
        user_answer     TEXT NOT NULL,
        correct_answer  TEXT NOT NULL,
        is_correct      INTEGER NOT NULL          -- SQLite has no native BOOLEAN
    )
    """,
    # book (hashed PDF bytes) -> a persistent Gemini Notebook notebook.
    """
    CREATE TABLE IF NOT EXISTS notebook_registry (
        book_hash    TEXT PRIMARY KEY,            -- sha256 of raw PDF bytes
        book_title   TEXT NOT NULL,
        notebook_id  TEXT NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    # chunk (hashed text) -> a source within its notebook.
    """
    CREATE TABLE IF NOT EXISTS source_registry (
        notebook_id  TEXT NOT NULL,
        chunk_key    TEXT NOT NULL,               -- sha256(chunk.text)[:16]
        chunk_title  TEXT NOT NULL,               -- also used verbatim in the prompt's scoping instruction
        source_id    TEXT NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (notebook_id, chunk_key)
    )
    """,
]


def init_db(db_path: Path = DB_PATH) -> None:
    """Create every Phase 1 table if it doesn't already exist."""
    conn = sqlite3.connect(db_path)
    try:
        for statement in SCHEMA:
            conn.execute(statement)
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Initialized {DB_PATH} with user_history, notebook_registry, source_registry.")
