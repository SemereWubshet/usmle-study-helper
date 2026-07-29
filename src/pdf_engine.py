"""Pure PDF extraction + chunking. No knowledge of Gemini Notebook or SQLite.

Produces ``Chunk(title, start_page, end_page, text)`` objects. Callers derive
their own content-based ``chunk_key = sha256(chunk.text)[:16]`` — this module
never hashes or indexes anything, so changing the chunk-size slider can never
collide with a stale index-based key.

Chunking strategy (in order of preference):
  1. Header detection — if the PDF has clear structural markers (Markdown
     headings, "Chapter N", "Section N", or, weakest, standalone all-caps
     lines), split on those, subject to a false-positive sanity guard.
  2. Fixed-size — otherwise, groups of ``chunk_size`` pages, merging an
     undersized trailing chunk into the previous one.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from pypdf import PdfReader

# A header split whose largest section is more than this many times its
# smallest is treated as unreliable (likely all-caps false positives) and
# discarded in favor of fixed-size chunking.
_HEADER_RATIO_GUARD = 20

# Header regexes, checked in priority order (strongest signal first). Each is
# applied to a page's first few non-blank lines; the weakest tier (all-caps) is
# last so it only wins when nothing more reliable matched.
_MARKDOWN_HEADING = re.compile(r"^#{1,3}\s+(.+\S)\s*$")
_CHAPTER_HEADING = re.compile(r"^\s*(Chapter\s+\d+.*\S)\s*$", re.IGNORECASE)
_SECTION_HEADING = re.compile(r"^\s*(Section\s+\d+.*\S)\s*$", re.IGNORECASE)
# Conservative all-caps: a standalone line of mostly-uppercase letters, 3-60
# chars, at least two words OR one long word, no sentence-ending punctuation.
_ALLCAPS_HEADING = re.compile(r"^[A-Z][A-Z0-9 &',\-]{2,59}$")

_HEADER_LINES_TO_SCAN = 5


@dataclass
class Chunk:
    title: str
    start_page: int  # 0-based, inclusive
    end_page: int    # 0-based, inclusive
    text: str


def extract_pages(pdf_file) -> list[str]:
    """Extract text per page. ``pdf_file`` is anything ``PdfReader`` accepts
    (a path, a file-like object, or ``io.BytesIO`` of the raw bytes).

    A page whose text can't be extracted yields an empty string rather than
    raising — a scanned/image page shouldn't sink the whole upload.
    """
    reader = PdfReader(pdf_file)
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return pages


def _first_nonblank_lines(page_text: str, n: int) -> list[str]:
    lines: list[str] = []
    for raw in page_text.splitlines():
        stripped = raw.strip()
        if stripped:
            lines.append(stripped)
            if len(lines) >= n:
                break
    return lines


def _detect_header_title(page_text: str) -> str | None:
    """Return a header title for this page, or None. Priority order matters:
    a strong signal (Markdown/Chapter/Section) short-circuits before the weak
    all-caps tier is ever considered."""
    lines = _first_nonblank_lines(page_text, _HEADER_LINES_TO_SCAN)
    for pattern in (_MARKDOWN_HEADING, _CHAPTER_HEADING, _SECTION_HEADING):
        for line in lines:
            m = pattern.match(line)
            if m:
                return m.group(1).strip()
    # Weakest tier last.
    for line in lines:
        if _ALLCAPS_HEADING.match(line) and any(c.isalpha() for c in line):
            # Require either two words or a single word of >=4 letters, so a
            # stray "II" or "A" page number doesn't register as a header.
            words = line.split()
            if len(words) >= 2 or (len(words) == 1 and len(words[0]) >= 4):
                return line.strip()
    return None


def detect_header_chunks(pages: list[str]) -> list[Chunk] | None:
    """Split on detected page headers. Returns None (caller falls back to
    fixed-size) if fewer than 2 headers are found, or if the resulting
    sections are so lopsided they're probably false positives."""
    # Map each header-bearing page to its start.
    boundaries: list[tuple[int, str]] = []
    for i, text in enumerate(pages):
        title = _detect_header_title(text)
        if title is not None:
            boundaries.append((i, title))

    if len(boundaries) < 2:
        return None

    chunks: list[Chunk] = []
    for idx, (start, title) in enumerate(boundaries):
        end = boundaries[idx + 1][0] - 1 if idx + 1 < len(boundaries) else len(pages) - 1
        # A header on the very last page (start > end) would make an empty
        # section; skip it rather than emit a zero-page chunk.
        if start > end:
            continue
        text = "\n".join(pages[start : end + 1]).strip()
        chunks.append(Chunk(title=title, start_page=start, end_page=end, text=text))

    if len(chunks) < 2:
        return None

    # False-positive sanity guard: wildly uneven sections mean the detector
    # latched onto noise (e.g. every all-caps figure label). Fall back.
    page_counts = [c.end_page - c.start_page + 1 for c in chunks]
    if min(page_counts) > 0 and max(page_counts) / min(page_counts) > _HEADER_RATIO_GUARD:
        return None

    return chunks


def page_count_chunks(pages: list[str], chunk_size: int = 50) -> list[Chunk]:
    """Fixed-size chunking in groups of ``chunk_size`` pages. An undersized
    trailing chunk (< ``chunk_size // 4`` pages) is merged into the previous
    chunk rather than left as a near-empty final section."""
    if chunk_size < 1:
        raise ValueError("chunk_size must be >= 1")

    total = len(pages)
    if total == 0:
        return []

    chunks: list[Chunk] = []
    for start in range(0, total, chunk_size):
        end = min(start + chunk_size, total) - 1
        text = "\n".join(pages[start : end + 1]).strip()
        chunks.append(
            Chunk(
                title=f"Pages {start + 1}-{end + 1}",
                start_page=start,
                end_page=end,
                text=text,
            )
        )

    # Merge an undersized trailing chunk into its predecessor.
    min_tail = max(1, chunk_size // 4)
    if len(chunks) >= 2:
        last = chunks[-1]
        if (last.end_page - last.start_page + 1) < min_tail:
            prev = chunks[-2]
            merged = Chunk(
                title=f"Pages {prev.start_page + 1}-{last.end_page + 1}",
                start_page=prev.start_page,
                end_page=last.end_page,
                text="\n".join(pages[prev.start_page : last.end_page + 1]).strip(),
            )
            chunks[-2:] = [merged]

    return chunks


def build_chunks(pdf_file, chunk_size: int = 50) -> list[Chunk]:
    """Extract pages and chunk them: header-based if reliable, else fixed-size."""
    pages = extract_pages(pdf_file)
    header_chunks = detect_header_chunks(pages)
    if header_chunks is not None:
        return header_chunks
    return page_count_chunks(pages, chunk_size=chunk_size)
