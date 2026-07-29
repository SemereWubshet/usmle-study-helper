# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains no application code yet — it's pre-implementation. Before writing code, read both:

- `specs.md` — the original feature specification (UI/UX layout, database schema wording, feature list).
- `plan.md` — the actual current architecture, which **supersedes `specs.md` wherever they conflict**. Most notably: `specs.md` describes calling the raw Gemini API directly; `plan.md` replaces that with driving the user's own Gemini Notebook (formerly NotebookLM) account via the unofficial `notebooklm-py` client, and defers the local SQLite question bank ("Mode B") to a later phase. When in doubt about which document is authoritative for a given detail, `plan.md` wins for architecture/scope, `specs.md` wins for UI layout/aesthetic intent not otherwise addressed in `plan.md`.

`plan.md` contains the full file-by-file breakdown (exact function signatures, database schema, prompt design, async-in-Streamlit pattern) for Phase 1. Read it before implementing rather than re-deriving the architecture.

## Commands

No `pyproject.toml`/lockfile exists yet. The project is intended to be managed with `uv` (already installed in the devcontainer). First-time setup and common commands, once the project is scaffolded per `plan.md`:

The application code lives in `src/` (tests in `src/tests/`); config/docs (`pyproject.toml`, `plan.md`, `specs.md`, `README.md`) stay at the repo root. Run everything from the repo root so the relative `usmle_app.db` and `.notebooklm_session/` paths resolve correctly.

```bash
uv sync                          # install dependencies from pyproject.toml/uv.lock
uv run python src/init_db.py     # create usmle_app.db and its tables (idempotent, safe to rerun)
uv run streamlit run src/app.py  # run the app
uv run pytest                    # run the full test suite
uv run pytest src/tests/test_pdf_engine.py::test_name  # run a single test
```

Gemini Notebook auth is out-of-band: the user runs `notebooklm login` on their own machine (a real browser — this devcontainer is headless and has no browser), then copies the resulting `storage_state.json` into `.notebooklm_session/` in this project. That file is a secret and must stay gitignored; never commit it.

## Architecture (per `plan.md`)

The app is a single-user Streamlit tool with no cloud backend of its own — it drives the user's personal Gemini Notebook account as the question-generation engine and keeps only local SQLite state.

- **`pdf_engine.py`** — pure PDF chunking logic (pypdf-based page extraction, fixed-size ~50-page chunks with a small-trailing-chunk merge rule, header-detection fallback with a false-positive sanity guard). Has no knowledge of Gemini Notebook or the database — it only produces `Chunk(title, start_page, end_page, text)` objects.
- **`registry.py`** — SQLite-backed lookup/insert layer mapping an uploaded book (hashed by PDF bytes) to a Gemini Notebook `notebook_id`, and a chunk (hashed by chunk text) to a `source_id` within that notebook. This exists because Gemini Notebook has no idempotent "add source" call and no per-book session state survives a process restart otherwise — one persistent notebook per uploaded book, reused across sessions, is the whole point of this table.
- **`notebook_engine.py`** — the only place that talks to `notebooklm-py`. Responsible for: resolving the session file, getting-or-creating the notebook/source via `registry.py` before ever calling the library's `add_text` (which is non-idempotent — calling it twice duplicates a source), building the question-generation prompt (which must explicitly scope the model to one source by title, since there's no confirmed API-level source scoping), and parsing the model's JSON response defensively (strip markdown fences, fall back to brace-depth-scanned extraction, retry once with a stricter prompt, then raise a user-facing `NotebookEngineError` — callers should never see a raw library/network exception). Since `notebooklm-py`'s client is async and Streamlit's execution model is a synchronous full-script rerun on every interaction, all calls cross the async boundary through a single `run_async()` helper rather than persisting a client/event loop in `st.session_state`.
- **`quiz_state.py`** — the shared quiz-taking state machine (`st.session_state`-driven): submit → grade → explanation accordion → next. Submission is guarded against double-logging into `user_history`, since a Streamlit rerun after a button click re-executes the whole script.
- **`app.py`** — Streamlit UI wiring: sidebar (auth status, PDF upload, chunk/question controls), the quiz workspace (delegates rendering to `quiz_state.py`), and a basic history/accuracy view over `user_history`.
- **`init_db.py`** — creates `usmle_app.db` (`user_history`, `notebook_registry`, `source_registry`) via idempotent `CREATE TABLE IF NOT EXISTS`. Deliberately does **not** create or seed a `bank_questions` table — that's Phase 2 (Mode B), out of scope for the current plan.

Two project skills capture standing conventions for this codebase and should be consulted when doing the corresponding work, not just when explicitly named:
- `.claude/skills/impeccable/` — the quality bar for finishing/polishing any feature (error-message discipline, tracing unhappy paths, verifying persistence survives a Streamlit rerun).
- `.claude/skills/design-motion-principles/` — motion/animation conventions for the Streamlit UI, including the constraint that Streamlit has no persistent client-side state across reruns, so animation has to be pure-CSS and keyed off state already present in each render.
