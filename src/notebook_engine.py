"""The only module that talks to ``notebooklm-py`` (imported as ``notebooklm``).

Responsibilities:
  - Resolve the session file and expose a cheap "is it there?" check for the UI.
  - Get-or-create the notebook/source via ``registry.py`` BEFORE ever calling
    the library's non-idempotent ``add_text`` (calling it twice duplicates a
    source; the registry is what prevents that across reruns/restarts).
  - Build the question-generation prompt and scope generation to a single
    source — both mechanically (``chat.ask(..., source_ids=[source_id])``) and
    in the prompt text, as belt-and-suspenders.
  - Parse the model's JSON defensively (strip fences, brace-depth extraction,
    one stricter retry, then a user-facing ``NotebookEngineError``). Callers
    never see a raw library/network exception.

All library calls cross the async boundary through ``run_async`` — Streamlit
reruns the whole script synchronously with no stable event loop across reruns,
so we open and close a fresh client per call rather than persisting one in
session state.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path

from pydantic import BaseModel, ValidationError, field_validator, model_validator

import notebooklm
from notebooklm import NotebookLMClient
from notebooklm.exceptions import AuthError, NetworkError, NotebookLMError

import registry

DEFAULT_SESSION_PATH = Path("./.notebooklm_session/storage_state.json")


class NotebookEngineError(Exception):
    """User-facing error. Its ``str`` is safe to show directly in the UI —
    it says what happened and what to do about it, never a raw traceback."""


# --- schema ----------------------------------------------------------------

class QuestionOption(BaseModel):
    text: str
    rationale: str


_EXPECTED_OPTIONS = {"A", "B", "C", "D", "E"}


class GeneratedQuestion(BaseModel):
    vignette: str
    options: dict[str, QuestionOption]  # keys exactly "A".."E"
    correct_option: str
    key_takeaway: str
    vignette_breakdown: str
    source_citation: str  # verbatim excerpt requested in the JSON — our grounding proof
    # Populated opportunistically from the library's real citation metadata
    # (AskResult.references[].cited_text) when present; never required.
    library_citation: str | None = None

    @field_validator("options")
    @classmethod
    def _exactly_five_options(cls, v: dict[str, QuestionOption]):
        # A response missing options (or with stray keys) is a schema failure
        # that must trigger the retry path, not a half-rendered quiz question.
        if set(v.keys()) != _EXPECTED_OPTIONS:
            raise ValueError(
                f"options must have exactly keys A-E, got {sorted(v.keys())}"
            )
        return v

    @model_validator(mode="after")
    def _correct_option_valid(self):
        if self.correct_option not in _EXPECTED_OPTIONS:
            raise ValueError(
                f"correct_option must be one of A-E, got {self.correct_option!r}"
            )
        return self


class GeneratedQuestionSet(BaseModel):
    questions: list[GeneratedQuestion]


# --- session / hashing -----------------------------------------------------

def get_session_path() -> Path:
    """Session file path: ``NOTEBOOKLM_SESSION_PATH`` env var, else the default
    ``./.notebooklm_session/storage_state.json``."""
    env = os.environ.get("NOTEBOOKLM_SESSION_PATH")
    return Path(env) if env else DEFAULT_SESSION_PATH


def check_session_exists() -> bool:
    """Cheap local file check for the sidebar badge — no network call."""
    return get_session_path().is_file()


def hash_pdf_bytes(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()


def chunk_key_for(chunk_text: str) -> str:
    """Content-based chunk key. Kept here so callers and tests agree on the
    exact derivation (sha256 of the chunk text, first 16 hex chars)."""
    return hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()[:16]


# --- prompt ----------------------------------------------------------------

def _build_prompt(chunk_title: str, num_questions: int) -> str:
    return f"""You are an experienced NBME item writer creating USMLE Step 1 practice questions.

Use ONLY the source titled exactly "{chunk_title}". Ignore and do not draw from \
any other source in this notebook, even if present.

Write {num_questions} multi-step clinical vignette question(s) in the NBME style: \
each should require the examinee to reason across at least two steps (e.g., \
identify the diagnosis, then its mechanism/management), not recall a single fact. \
Each question must have exactly five options labeled A through E, with plausible \
distractors.

Respond with a SINGLE JSON object and nothing else — no prose before or after, no \
markdown code fence. The object must match exactly this shape:

{{
  "questions": [
    {{
      "vignette": "the full clinical case stem and the lead-in question",
      "options": {{
        "A": {{"text": "option A text", "rationale": "why A is correct or incorrect"}},
        "B": {{"text": "...", "rationale": "..."}},
        "C": {{"text": "...", "rationale": "..."}},
        "D": {{"text": "...", "rationale": "..."}},
        "E": {{"text": "...", "rationale": "..."}}
      }},
      "correct_option": "one of A, B, C, D, E",
      "key_takeaway": "the single high-yield teaching point",
      "vignette_breakdown": "how to parse the vignette's key clues step by step",
      "source_citation": "a short VERBATIM excerpt copied from the source that grounds this question"
    }}
  ]
}}

Every option A-E must be present. "correct_option" must be exactly one uppercase \
letter. "source_citation" must be copied verbatim from the source text so it can \
be verified against the original."""


def _build_strict_retry_prompt(original_prompt: str) -> str:
    return (
        original_prompt
        + "\n\nIMPORTANT: Your previous response could not be parsed. Output ONLY "
        "the raw JSON object — no explanation, no markdown fences, nothing before "
        "or after the opening and closing braces."
    )


# --- JSON parsing ----------------------------------------------------------

def _strip_markdown_fence(text: str) -> str:
    """Remove a surrounding ```json ... ``` (or plain ```) fence if present."""
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    # Drop the opening fence line (```or ```json) and the closing fence.
    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip().startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _extract_outermost_json(text: str) -> str | None:
    """Extract the first balanced ``{...}`` object via a brace-depth scan.

    Not a naive first-``{``/last-``}`` slice: that truncates or over-captures
    when the answer has prose around it or braces inside a rationale string.
    String literals (including escaped quotes) are tracked so a ``{`` inside a
    string doesn't change depth."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def parse_question_set(raw_answer: str) -> GeneratedQuestionSet:
    """Parse the model's answer into a validated ``GeneratedQuestionSet``.

    Tries, in order: fence-stripped ``json.loads`` -> Pydantic validate; then
    brace-depth-extracted substring -> the same. Raises ``NotebookEngineError``
    only if BOTH the JSON parse and schema validation fail on every candidate,
    so a well-formed-but-schema-invalid response (missing ``correct_option``,
    fewer than 5 options) is treated as a parse failure the caller can retry."""
    candidates: list[str] = []
    fenced = _strip_markdown_fence(raw_answer)
    candidates.append(fenced)
    extracted = _extract_outermost_json(fenced)
    if extracted and extracted != fenced:
        candidates.append(extracted)

    last_error: Exception | None = None
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError as e:
            last_error = e
            continue
        try:
            question_set = GeneratedQuestionSet.model_validate(data)
        except ValidationError as e:
            last_error = e
            continue
        if not question_set.questions:
            last_error = ValueError("no questions in response")
            continue
        return question_set

    raise NotebookEngineError(
        "Gemini Notebook returned a response we couldn't parse as valid question "
        "data. Try again or reduce the number of questions requested."
    ) from last_error


# --- async boundary --------------------------------------------------------

def run_async(coro):
    """Run ``coro`` to completion from Streamlit's synchronous script.

    Normally there's no running loop, so ``asyncio.run`` is used directly. The
    ``else`` branch is a defensive fallback for the rare case a loop is already
    running in-thread (custom components, some embedding contexts), where
    ``asyncio.run`` would raise."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(asyncio.run, coro).result()


# --- notebook / source get-or-create --------------------------------------

async def _get_or_create_notebook(client, conn, book_hash: str, book_title: str) -> str:
    """Return the notebook_id for this book, creating (and registering) one
    only if it isn't already in the registry."""
    existing = registry.get_notebook_id(conn, book_hash)
    if existing is not None:
        return existing
    notebook = await client.notebooks.create(title=book_title)
    registry.upsert_book(conn, book_hash, book_title, notebook.id)
    # Re-read: if a concurrent run registered first, its id is authoritative.
    return registry.get_notebook_id(conn, book_hash) or notebook.id


async def _get_or_add_source(
    client, conn, notebook_id: str, chunk_key: str, chunk_title: str, chunk_text: str
) -> str:
    """Return the source_id for this chunk, adding it only if not already
    registered. ``add_text`` is non-idempotent, so it is guarded by the
    registry and never called twice for the same chunk_key."""
    existing = registry.get_source_id(conn, notebook_id, chunk_key)
    if existing is not None:
        return existing
    source = await client.sources.add_text(
        notebook_id, chunk_title, chunk_text, wait=True
    )
    registry.upsert_source(conn, notebook_id, chunk_key, chunk_title, source.id)
    return registry.get_source_id(conn, notebook_id, chunk_key) or source.id


def _first_cited_text(ask_result) -> str | None:
    """Opportunistically pull a real citation excerpt from the library's
    AskResult, if it exposed one. Never required."""
    references = getattr(ask_result, "references", None) or []
    for ref in references:
        cited = getattr(ref, "cited_text", None)
        if cited:
            return cited
    return None


async def _generate_questions_async(
    pdf_bytes: bytes,
    book_title: str,
    chunk_key: str,
    chunk_title: str,
    chunk_text: str,
    num_questions: int,
) -> GeneratedQuestionSet:
    book_hash = hash_pdf_bytes(pdf_bytes)
    conn = registry.get_connection()
    try:
        session_path = get_session_path()
        async with NotebookLMClient.from_storage(path=str(session_path)) as client:
            notebook_id = await _get_or_create_notebook(
                client, conn, book_hash, book_title
            )
            source_id = await _get_or_add_source(
                client, conn, notebook_id, chunk_key, chunk_title, chunk_text
            )

            prompt = _build_prompt(chunk_title, num_questions)
            result = await client.chat.ask(
                notebook_id, prompt, source_ids=[source_id]
            )

            try:
                question_set = parse_question_set(result.answer)
            except NotebookEngineError:
                # One stricter retry before giving up.
                retry_prompt = _build_strict_retry_prompt(prompt)
                retry_result = await client.chat.ask(
                    notebook_id, retry_prompt, source_ids=[source_id]
                )
                question_set = parse_question_set(retry_result.answer)
                result = retry_result

            # Attach the library's own citation excerpt where the model didn't
            # supply one, so the "Source" panel always has something verifiable.
            cited = _first_cited_text(result)
            if cited:
                for q in question_set.questions:
                    if not q.source_citation:
                        q.source_citation = cited
                    q.library_citation = cited
            return question_set
    finally:
        conn.close()


def generate_questions(
    pdf_bytes: bytes,
    book_title: str,
    chunk_key: str,
    chunk_title: str,
    chunk_text: str,
    num_questions: int,
) -> GeneratedQuestionSet:
    """Synchronous entry point for Streamlit. Translates every library/network
    failure into a distinct, user-facing ``NotebookEngineError`` so a raw
    traceback never reaches the UI."""
    try:
        return run_async(
            _generate_questions_async(
                pdf_bytes,
                book_title,
                chunk_key,
                chunk_title,
                chunk_text,
                num_questions,
            )
        )
    except NotebookEngineError:
        raise  # already user-facing (e.g. unparseable-after-retry)
    except (FileNotFoundError, ValueError, AuthError) as e:
        # Missing session file (FileNotFoundError), malformed/incomplete
        # cookies (ValueError), or expired-at-request (AuthError).
        raise NotebookEngineError(
            "Your Gemini Notebook session has expired or isn't set up. Run "
            "`notebooklm login` locally (on a machine with a real browser) and "
            "copy the refreshed `storage_state.json` into `.notebooklm_session/`."
        ) from e
    except NetworkError as e:
        raise NotebookEngineError(
            "Could not reach Gemini Notebook — check your connection and try again."
        ) from e
    except NotebookLMError as e:
        # Any other library-level failure: don't leak the raw repr, but stay
        # honest that it came from the notebook backend.
        raise NotebookEngineError(
            "Gemini Notebook could not complete this request. Please try again in "
            "a moment; if it keeps happening, re-run `notebooklm login` locally to "
            "refresh your session."
        ) from e
