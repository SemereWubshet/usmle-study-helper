"""Tests for pure chunking logic — no PDF I/O, we feed page lists directly."""

from __future__ import annotations

import pdf_engine
from pdf_engine import Chunk


def _pages(n: int) -> list[str]:
    return [f"body text page {i}" for i in range(n)]


# --- fixed-size chunking ---------------------------------------------------

def test_fixed_size_even_split():
    chunks = pdf_engine.page_count_chunks(_pages(100), chunk_size=50)
    assert len(chunks) == 2
    assert (chunks[0].start_page, chunks[0].end_page) == (0, 49)
    assert (chunks[1].start_page, chunks[1].end_page) == (50, 99)
    assert chunks[0].title == "Pages 1-50"
    assert chunks[1].title == "Pages 51-100"


def test_fixed_size_normal_trailing_chunk_kept():
    # 30-page tail with chunk_size 50 -> tail is >= 50//4 (=12), so it stays.
    chunks = pdf_engine.page_count_chunks(_pages(80), chunk_size=50)
    assert len(chunks) == 2
    assert (chunks[1].start_page, chunks[1].end_page) == (50, 79)


def test_fixed_size_small_trailing_chunk_merged():
    # 55 pages, chunk_size 50 -> 5-page tail (< 12) merges into the previous.
    chunks = pdf_engine.page_count_chunks(_pages(55), chunk_size=50)
    assert len(chunks) == 1
    assert (chunks[0].start_page, chunks[0].end_page) == (0, 54)
    assert chunks[0].title == "Pages 1-55"


def test_fixed_size_single_page():
    chunks = pdf_engine.page_count_chunks(_pages(1), chunk_size=50)
    assert len(chunks) == 1
    assert (chunks[0].start_page, chunks[0].end_page) == (0, 0)


def test_fixed_size_empty():
    assert pdf_engine.page_count_chunks([], chunk_size=50) == []


# --- header detection: each tier in isolation ------------------------------

def test_markdown_header_tier():
    pages = ["# Cardiology\nfoo", "more foo", "## Renal\nbar", "more bar"]
    chunks = pdf_engine.detect_header_chunks(pages)
    assert chunks is not None
    assert [c.title for c in chunks] == ["Cardiology", "Renal"]
    assert (chunks[0].start_page, chunks[0].end_page) == (0, 1)
    assert (chunks[1].start_page, chunks[1].end_page) == (2, 3)


def test_chapter_header_tier():
    pages = ["Chapter 1 Introduction\ntext", "x", "Chapter 2 Methods\ntext", "y"]
    chunks = pdf_engine.detect_header_chunks(pages)
    assert chunks is not None
    assert [c.title for c in chunks] == ["Chapter 1 Introduction", "Chapter 2 Methods"]


def test_section_header_tier():
    pages = ["Section 1 Basics\ntext", "x", "Section 2 Advanced\ntext", "y"]
    chunks = pdf_engine.detect_header_chunks(pages)
    assert chunks is not None
    assert [c.title for c in chunks] == ["Section 1 Basics", "Section 2 Advanced"]


def test_allcaps_header_tier():
    pages = ["PATHOLOGY OVERVIEW\ntext", "x", "PHARMACOLOGY BASICS\ntext", "y"]
    chunks = pdf_engine.detect_header_chunks(pages)
    assert chunks is not None
    assert [c.title for c in chunks] == ["PATHOLOGY OVERVIEW", "PHARMACOLOGY BASICS"]


def test_stronger_tier_wins_over_allcaps():
    # A page with both a markdown heading and an all-caps line -> markdown wins.
    pages = ["# Real Title\nSOME CAPS LINE", "x", "# Second\ntext", "y"]
    chunks = pdf_engine.detect_header_chunks(pages)
    assert chunks is not None
    assert chunks[0].title == "Real Title"


def test_fewer_than_two_headers_falls_back():
    pages = ["# Only One\ntext", "no header", "still none"]
    assert pdf_engine.detect_header_chunks(pages) is None


def test_header_ratio_guard_rejects_lopsided_split():
    # Two "headers": one at page 0, one at page 1, then 100 pages of body ->
    # sections of size 1 and 101, ratio > 20 -> treated as false positive.
    pages = ["CHAPTER TITLE ONE", "CHAPTER TITLE TWO"] + ["body"] * 100
    assert pdf_engine.detect_header_chunks(pages) is None


def test_allcaps_ignores_short_noise():
    # "II" and "A" are too short/one-word to count as headers.
    pages = ["II\ntext", "A\nbody", "more"]
    assert pdf_engine.detect_header_chunks(pages) is None


# --- build_chunks integration (via a fake reader) --------------------------

def test_build_chunks_prefers_headers(monkeypatch):
    pages = ["# One\na", "b", "# Two\nc", "d"]
    monkeypatch.setattr(pdf_engine, "extract_pages", lambda f: pages)
    chunks = pdf_engine.build_chunks(object())
    assert [c.title for c in chunks] == ["One", "Two"]


def test_build_chunks_falls_back_to_fixed(monkeypatch):
    pages = _pages(120)
    monkeypatch.setattr(pdf_engine, "extract_pages", lambda f: pages)
    chunks = pdf_engine.build_chunks(object(), chunk_size=50)
    assert all(c.title.startswith("Pages ") for c in chunks)
    assert len(chunks) == 3  # 50 / 50 / 20


def test_chunk_text_is_joined_pages():
    pages = ["alpha", "beta", "gamma"]
    chunks = pdf_engine.page_count_chunks(pages, chunk_size=2)
    # 2 + 1 tail; tail (1 page) < 2//4? 2//4 == 0 -> max(1,0)==1, so 1 is not < 1,
    # tail is kept.
    assert len(chunks) == 2
    assert chunks[0].text == "alpha\nbeta"
    assert chunks[1].text == "gamma"
