# USMLE Study Helper

A local, single-user Streamlit tool that turns your own medical PDFs (textbooks, notes) into NBME-style USMLE Step 1 practice questions — graded, with per-distractor explanations and a running accuracy history.

Question generation is powered by **your own Gemini Notebook (NotebookLM) account** via the unofficial [`notebooklm-py`](https://github.com/teng-lin/notebooklm-py) client. Uploaded books become a persistent notebook, each ~50-page section a named source; a local SQLite registry ensures a book is never re-uploaded and a source never duplicated across restarts. No cloud backend of its own — all history lives in a local `usmle_app.db`.

## Project layout

```
src/                  # all application code
  app.py              # Streamlit UI (sidebar, quiz workspace, history tab)
  pdf_engine.py       # pure PDF extraction + chunking
  registry.py         # SQLite book->notebook / chunk->source mapping
  notebook_engine.py  # the only module that talks to notebooklm-py
  quiz_state.py       # quiz-taking state machine (submit/grade/explain/next)
  init_db.py          # creates usmle_app.db tables (idempotent)
  tests/              # pytest suite
pyproject.toml        # deps (managed with uv)
plan.md / specs.md    # architecture (plan.md wins) and original spec
```

## Setup

1. **Install dependencies** (from the repo root):
   ```bash
   uv sync
   ```

2. **Authenticate Gemini Notebook** — this is out-of-band and one-time. On a machine **with a real browser** (not a headless container):
   ```bash
   notebooklm login
   ```
   Then copy the resulting `storage_state.json` into `.notebooklm_session/` in this project:
   ```
   .notebooklm_session/storage_state.json
   ```
   This file is a secret and is gitignored — never commit it. To point elsewhere, set `NOTEBOOKLM_SESSION_PATH`.

3. **Initialize the database** (safe to re-run):
   ```bash
   uv run python src/init_db.py
   ```

## Run

```bash
uv run streamlit run src/app.py
```

Run from the repo root so `usmle_app.db` and `.notebooklm_session/` resolve. In the app: upload a PDF → pick a section → choose a question count → **Generate questions** → take the quiz. Results and accuracy show up in the **History** tab.

## Tests

```bash
uv run pytest
```

## Notes

- **Scope:** Phase 1 is Mode A only (upload → chunk → generate → quiz → log). The local question-bank "Mode B" is deferred.
- **Secrets & local state:** `.notebooklm_session/` and `usmle_app.db` are gitignored.
