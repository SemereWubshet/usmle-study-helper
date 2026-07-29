"""Registry round-trips and non-overwrite guarantees against a temp DB."""

from __future__ import annotations

import sqlite3

import pytest

import registry
from init_db import init_db


@pytest.fixture()
def conn(tmp_path):
    db = tmp_path / "test.db"
    init_db(db)
    c = registry.get_connection(db)
    yield c
    c.close()


def test_book_roundtrip(conn):
    assert registry.get_notebook_id(conn, "hashA") is None
    registry.upsert_book(conn, "hashA", "First Aid", "nb-1")
    assert registry.get_notebook_id(conn, "hashA") == "nb-1"


def test_book_not_overwritten_on_second_upsert(conn):
    registry.upsert_book(conn, "hashA", "First Aid", "nb-1")
    # Same book_hash, different notebook_id -> original wins.
    registry.upsert_book(conn, "hashA", "First Aid", "nb-2")
    assert registry.get_notebook_id(conn, "hashA") == "nb-1"


def test_source_roundtrip(conn):
    assert registry.get_source_id(conn, "nb-1", "chunkX") is None
    registry.upsert_source(conn, "nb-1", "chunkX", "Pages 1-50", "src-1")
    assert registry.get_source_id(conn, "nb-1", "chunkX") == "src-1"


def test_source_not_overwritten(conn):
    registry.upsert_source(conn, "nb-1", "chunkX", "Pages 1-50", "src-1")
    registry.upsert_source(conn, "nb-1", "chunkX", "Pages 1-50", "src-2")
    assert registry.get_source_id(conn, "nb-1", "chunkX") == "src-1"


def test_source_scoped_by_notebook(conn):
    registry.upsert_source(conn, "nb-1", "chunkX", "t", "src-1")
    registry.upsert_source(conn, "nb-2", "chunkX", "t", "src-2")
    # Same chunk_key, different notebooks -> distinct sources.
    assert registry.get_source_id(conn, "nb-1", "chunkX") == "src-1"
    assert registry.get_source_id(conn, "nb-2", "chunkX") == "src-2"


def test_list_books_newest_first(conn):
    # Insert with explicit created_at so ordering is deterministic in-test.
    conn.execute(
        "INSERT INTO notebook_registry (book_hash, book_title, notebook_id, created_at) "
        "VALUES (?, ?, ?, ?)",
        ("h1", "Older", "nb-old", "2026-01-01 00:00:00"),
    )
    conn.execute(
        "INSERT INTO notebook_registry (book_hash, book_title, notebook_id, created_at) "
        "VALUES (?, ?, ?, ?)",
        ("h2", "Newer", "nb-new", "2026-06-01 00:00:00"),
    )
    conn.commit()
    books = registry.list_books(conn)
    assert [b["book_title"] for b in books] == ["Newer", "Older"]


def test_get_connection_returns_rows_as_mapping(conn):
    registry.upsert_book(conn, "h", "t", "nb")
    row = conn.execute("SELECT * FROM notebook_registry").fetchone()
    assert isinstance(row, sqlite3.Row)
    assert row["book_title"] == "t"
