# USMLE Step 1 AI Practice Platform

A local-first, full-stack web app for USMLE Step 1 practice. It serves board-style
multiple-choice questions from a standardized medical dataset (Hugging Face
`medmcqa`) stored locally in SQLite, with instant rationales, a strikethrough
reasoning tool, and progress analytics.

Built per [`plans/my_plan.md`](plans/my_plan.md).

## Architecture

```
backend/    FastAPI + SQLite REST API  (http://localhost:8000)
frontend/   React + TypeScript + Vite + Tailwind + shadcn-style UI  (http://localhost:5173)
```

- **Backend** — FastAPI serving `/api/v1/*`. Pure `sqlite3` (no ORM needed),
  Pydantic v2 request/response models. `bank_questions` holds the seeded question
  bank; `user_history` records every answered question for analytics.
- **Frontend** — SPA with three screens: Dashboard/Setup, Interactive Quiz, and
  Analytics. TanStack Query for server state, React Router for navigation.
- **Seed pipeline** — `backend/scripts/seed_db.py` downloads the `medmcqa`
  parquet from Hugging Face, normalizes it into `bank_questions`, maps
  `subject_name → discipline_tag`, and derives an organ-system `system_tag` with a
  keyword heuristic (the dataset has no organ-system field).

## Prerequisites

- Python 3.10+ with [`uv`](https://docs.astral.sh/uv/) (installed in the devcontainer)
- Node 20+ / npm

## Setup & Run

### 1. Backend

```bash
cd backend
uv sync                                   # install dependencies
uv run python scripts/seed_db.py          # download medmcqa + seed usmle_app.db (~6000 Qs)
uv run uvicorn app.main:app --reload      # serve API on http://localhost:8000
```

Seed options: `--limit N` (default 6000, balanced across disciplines) or `--all`
(every valid row, ~183k). The 86 MB parquet is cached in `backend/.cache/`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                               # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:8000`, so no CORS or env
config is needed in development. For a non-proxied deployment set
`VITE_API_BASE_URL`.

## API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET  | `/api/v1/meta/tags`           | Distinct systems / disciplines / datasets for filters |
| POST | `/api/v1/quiz/batch`          | Random batch of questions matching optional filters |
| POST | `/api/v1/quiz/submit-session` | Record a completed batch's answers, return the score |
| GET  | `/api/v1/analytics/summary`   | Overall accuracy, per-system breakdown, recent sessions |

Interactive docs at http://localhost:8000/docs.

## Tests

```bash
cd backend && uv run pytest      # API + persistence tests
cd frontend && npm run lint      # TypeScript type-check
```

## Notes

- The app is intentionally single-user with no auth; `user_history` is a local log.
- An earlier, abandoned Streamlit + Gemini Notebook approach (`src/`, root
  `pyproject.toml`) predates this plan and is no longer used.
