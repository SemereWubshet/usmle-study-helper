"""SQLite lookup/insert layer: book -> notebook_id, chunk -> source_id.

Kept separate from ``notebook_engine.py`` so this DB layer is unit-testable
without touching any async or library code. This registry is the whole reason
one persistent Gemini Notebook per book can be reused across process restarts:
the library's ``add_text`` has no server-side dedupe key, so without a local
record of "this chunk already became this source" we'd duplicate a source on
every rerun.

``upsert_*`` use ``INSERT OR IGNORE`` on the primary key: if a row already
exists (the remote object was already created), the existing id wins and is
never overwritten.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path("./usmle_app.db")


def get_connection(db_path: Path | str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


# --- book <-> notebook_id --------------------------------------------------

def get_notebook_id(conn: sqlite3.Connection, book_hash: str) -> str | None:
    row = conn.execute(
        "SELECT notebook_id FROM notebook_registry WHERE book_hash = ?",
        (book_hash,),
    ).fetchone()
    return row["notebook_id"] if row else None


def upsert_book(
    conn: sqlite3.Connection, book_hash: str, book_title: str, notebook_id: str
) -> None:
    """Record book -> notebook_id. If the book is already registered, the
    existing notebook_id wins (INSERT OR IGNORE) — we never re-point a book at
    a different, freshly-created notebook."""
    conn.execute(
        "INSERT OR IGNORE INTO notebook_registry (book_hash, book_title, notebook_id) "
        "VALUES (?, ?, ?)",
        (book_hash, book_title, notebook_id),
    )
    conn.commit()


# --- chunk <-> source_id ---------------------------------------------------

def get_source_id(
    conn: sqlite3.Connection, notebook_id: str, chunk_key: str
) -> str | None:
    row = conn.execute(
        "SELECT source_id FROM source_registry WHERE notebook_id = ? AND chunk_key = ?",
        (notebook_id, chunk_key),
    ).fetchone()
    return row["source_id"] if row else None


def upsert_source(
    conn: sqlite3.Connection,
    notebook_id: str,
    chunk_key: str,
    chunk_title: str,
    source_id: str,
) -> None:
    """Record chunk -> source_id, scoped to its notebook. Existing row wins."""
    conn.execute(
        "INSERT OR IGNORE INTO source_registry "
        "(notebook_id, chunk_key, chunk_title, source_id) VALUES (?, ?, ?, ?)",
        (notebook_id, chunk_key, chunk_title, source_id),
    )
    conn.commit()


# --- browsing --------------------------------------------------------------

def list_books(conn: sqlite3.Connection) -> list[dict]:
    """All registered books, newest-first — for a 'resume a previous book'
    picker."""
    rows = conn.execute(
        "SELECT book_hash, book_title, notebook_id, created_at "
        "FROM notebook_registry ORDER BY created_at DESC, rowid DESC"
    ).fetchall()
    return [dict(row) for row in rows]
