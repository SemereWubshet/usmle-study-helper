"""Parsing, JSON extraction, schema validation, and run_async fallback."""

from __future__ import annotations

import asyncio
import json

import pytest

import notebook_engine as ne
from notebook_engine import NotebookEngineError


def _valid_question(letter_correct="B"):
    return {
        "vignette": "A 55-year-old man presents with...",
        "options": {
            L: {"text": f"option {L}", "rationale": f"rationale {L}"}
            for L in ["A", "B", "C", "D", "E"]
        },
        "correct_option": letter_correct,
        "key_takeaway": "the point",
        "vignette_breakdown": "parse it thus",
        "source_citation": "verbatim excerpt",
    }


def _valid_payload(n=1):
    return {"questions": [_valid_question() for _ in range(n)]}


# --- happy path & fence handling -------------------------------------------

def test_parses_clean_json():
    raw = json.dumps(_valid_payload())
    result = ne.parse_question_set(raw)
    assert len(result.questions) == 1
    assert result.questions[0].correct_option == "B"


def test_parses_markdown_fenced_json():
    raw = "```json\n" + json.dumps(_valid_payload()) + "\n```"
    result = ne.parse_question_set(raw)
    assert result.questions[0].options["A"].text == "option A"


def test_parses_plain_fence_without_lang():
    raw = "```\n" + json.dumps(_valid_payload()) + "\n```"
    assert len(ne.parse_question_set(raw).questions) == 1


def test_parses_json_with_surrounding_prose():
    raw = "Sure! Here are your questions:\n" + json.dumps(_valid_payload()) + "\nHope that helps."
    result = ne.parse_question_set(raw)
    assert len(result.questions) == 1


def test_nested_braces_in_rationale_not_truncated():
    payload = _valid_payload()
    payload["questions"][0]["options"]["A"]["rationale"] = (
        "Consider the set {x : x > 0} and note {nested {deep}} braces."
    )
    raw = "prose before " + json.dumps(payload) + " prose after"
    result = ne.parse_question_set(raw)
    assert "{nested {deep}}" in result.questions[0].options["A"].rationale


def test_brace_inside_string_does_not_confuse_scanner():
    # A stray '}' inside a string must not close the object early.
    payload = _valid_payload()
    payload["questions"][0]["vignette"] = "weird } brace { inside"
    raw = "noise " + json.dumps(payload) + " tail"
    result = ne.parse_question_set(raw)
    assert result.questions[0].vignette == "weird } brace { inside"


# --- failure paths (should raise, not return partial) ----------------------

def test_malformed_json_raises():
    with pytest.raises(NotebookEngineError):
        ne.parse_question_set("this is not json at all {{{")


def test_missing_correct_option_is_parse_failure():
    payload = _valid_payload()
    del payload["questions"][0]["correct_option"]
    with pytest.raises(NotebookEngineError):
        ne.parse_question_set(json.dumps(payload))


def test_fewer_than_five_options_is_parse_failure():
    # Schema requires exactly A-E; a 4-option response must trigger the retry
    # path, i.e. parse as a failure rather than a half-rendered question.
    payload = _valid_payload()
    del payload["questions"][0]["options"]["E"]
    with pytest.raises(NotebookEngineError):
        ne.parse_question_set(json.dumps(payload))


def test_out_of_range_correct_option_is_parse_failure():
    payload = _valid_payload()
    payload["questions"][0]["correct_option"] = "F"
    with pytest.raises(NotebookEngineError):
        ne.parse_question_set(json.dumps(payload))


def test_empty_questions_list_raises():
    with pytest.raises(NotebookEngineError):
        ne.parse_question_set(json.dumps({"questions": []}))


# --- helpers ---------------------------------------------------------------

def test_strip_markdown_fence():
    assert ne._strip_markdown_fence("```json\n{\"a\":1}\n```") == '{"a":1}'
    assert ne._strip_markdown_fence('{"a":1}') == '{"a":1}'


def test_extract_outermost_json_balanced():
    assert ne._extract_outermost_json('x {"a": {"b": 1}} y') == '{"a": {"b": 1}}'


def test_extract_outermost_json_none_when_no_brace():
    assert ne._extract_outermost_json("no json here") is None


def test_hash_pdf_bytes_stable():
    assert ne.hash_pdf_bytes(b"abc") == ne.hash_pdf_bytes(b"abc")
    assert ne.hash_pdf_bytes(b"abc") != ne.hash_pdf_bytes(b"abd")


def test_chunk_key_deterministic_and_short():
    k = ne.chunk_key_for("some chunk text")
    assert len(k) == 16
    assert k == ne.chunk_key_for("some chunk text")
    assert k != ne.chunk_key_for("different text")


# --- run_async -------------------------------------------------------------

def test_run_async_normal():
    async def coro():
        return 42
    assert ne.run_async(coro()) == 42


def test_run_async_falls_back_when_loop_running():
    """When a loop is already running in-thread, run_async must still return
    via the ThreadPoolExecutor branch rather than raising."""
    async def outer():
        async def inner():
            return "ok"
        # We're inside a running loop here; run_async should NOT call
        # asyncio.run directly (that would raise) but use the pool fallback.
        return ne.run_async(inner())

    assert asyncio.run(outer()) == "ok"


# --- session helpers -------------------------------------------------------

def test_session_path_env_override(monkeypatch, tmp_path):
    target = tmp_path / "custom.json"
    monkeypatch.setenv("NOTEBOOKLM_SESSION_PATH", str(target))
    assert ne.get_session_path() == target
    assert ne.check_session_exists() is False
    target.write_text("{}")
    assert ne.check_session_exists() is True


def test_session_path_default(monkeypatch):
    monkeypatch.delenv("NOTEBOOKLM_SESSION_PATH", raising=False)
    assert ne.get_session_path() == ne.DEFAULT_SESSION_PATH
