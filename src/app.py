"""USMLE Study Helper — Streamlit UI (Phase 1, Mode A only).

Linear flow: auth -> upload PDF -> pick a chunk -> choose count -> generate ->
quiz. History/accuracy lives in a second tab. No mode switcher yet (Mode B is
Phase 2). All Gemini Notebook calls go through ``notebook_engine`` and surface
as friendly errors, never tracebacks.
"""

from __future__ import annotations

import io

import pandas as pd
import streamlit as st

import notebook_engine
import pdf_engine
import quiz_state
import registry
from init_db import init_db

st.set_page_config(
    page_title="USMLE Study Helper",
    page_icon="🩺",
    layout="wide",
)

# Tables must exist before any read/write; idempotent, cheap.
init_db()

_PAGE_CSS = """
<style>
.block-container { padding-top: 2.2rem; max-width: 900px; }
.app-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.01em; }
.app-sub { opacity: 0.65; font-size: 0.92rem; margin-top: -0.2rem; }
.auth-badge {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.35rem 0.7rem; border-radius: 8px; font-size: 0.88rem;
  font-weight: 600; margin-bottom: 0.4rem;
}
.auth-ok   { background: rgba(46,160,67,0.14);  color: #2ea043; }
.auth-miss { background: rgba(218,54,51,0.12);  color: #da3633; }
</style>
"""
st.markdown(_PAGE_CSS, unsafe_allow_html=True)


@st.cache_data(show_spinner=False)
def _chunks_for(pdf_bytes: bytes, chunk_size: int) -> list[dict]:
    """Chunk the uploaded PDF, cached on (bytes, chunk_size) so it isn't
    recomputed on every rerun/keystroke. Returns plain dicts (cache-friendly)."""
    chunks = pdf_engine.build_chunks(io.BytesIO(pdf_bytes), chunk_size=chunk_size)
    return [
        {
            "title": c.title,
            "start_page": c.start_page,
            "end_page": c.end_page,
            "text": c.text,
        }
        for c in chunks
    ]


def _sidebar() -> None:
    st.sidebar.markdown("### Setup")

    # --- auth badge (local file check only, no network) ---
    if notebook_engine.check_session_exists():
        st.sidebar.markdown(
            '<div class="auth-badge auth-ok">● Gemini Notebook session detected</div>',
            unsafe_allow_html=True,
        )
    else:
        st.sidebar.markdown(
            '<div class="auth-badge auth-miss">● No Gemini Notebook session</div>',
            unsafe_allow_html=True,
        )
        st.sidebar.caption(
            "Run `notebooklm login` on a machine with a real browser, then copy the "
            "resulting `storage_state.json` into `.notebooklm_session/` in this "
            "project. This devcontainer is headless — login can't happen here."
        )

    st.sidebar.divider()

    # --- upload ---
    uploaded = st.sidebar.file_uploader(
        "Upload a textbook or notes (PDF)", type=["pdf"], accept_multiple_files=False
    )
    if uploaded is None:
        st.session_state.pop("pdf_bytes", None)
        st.session_state.pop("pdf_name", None)
        return

    pdf_bytes = uploaded.getvalue()
    st.session_state["pdf_bytes"] = pdf_bytes
    st.session_state["pdf_name"] = uploaded.name

    chunk_size = st.sidebar.slider(
        "Pages per section (fixed-size chunking)",
        min_value=10, max_value=100, value=50, step=5,
        help="Ignored if the PDF has clear chapter/section headers, which are "
             "detected and used automatically.",
    )

    with st.spinner("Reading and chunking PDF…"):
        try:
            chunks = _chunks_for(pdf_bytes, chunk_size)
        except Exception:
            st.sidebar.error(
                "This PDF couldn't be read. It may be encrypted, corrupted, or "
                "image-only with no extractable text. Try a different file."
            )
            return

    if not chunks:
        st.sidebar.warning("No extractable text found in this PDF.")
        return

    labels = [f"{c['title']}  ·  {c['end_page'] - c['start_page'] + 1} pp" for c in chunks]
    choice = st.sidebar.selectbox(
        "Section to practice", options=range(len(chunks)), format_func=lambda i: labels[i]
    )
    chunk = chunks[choice]

    num_questions = st.sidebar.slider(
        "Number of questions", min_value=1, max_value=25, value=5
    )

    st.sidebar.divider()
    disabled = not notebook_engine.check_session_exists()
    if st.sidebar.button(
        "Generate questions", type="primary", use_container_width=True, disabled=disabled,
        help="Set up your Gemini Notebook session first." if disabled else None,
    ):
        _generate(pdf_bytes, st.session_state["pdf_name"], chunk, num_questions)


def _generate(pdf_bytes: bytes, book_title: str, chunk: dict, num_questions: int) -> None:
    chunk_key = notebook_engine.chunk_key_for(chunk["text"])
    with st.spinner(
        f"Generating {num_questions} question(s) from “{chunk['title']}” via "
        "Gemini Notebook… first run on a new book also uploads it, which can take "
        "a minute."
    ):
        try:
            question_set = notebook_engine.generate_questions(
                pdf_bytes=pdf_bytes,
                book_title=book_title,
                chunk_key=chunk_key,
                chunk_title=chunk["title"],
                chunk_text=chunk["text"],
                num_questions=num_questions,
            )
        except notebook_engine.NotebookEngineError as e:
            st.session_state["generation_error"] = str(e)
            return

    st.session_state.pop("generation_error", None)
    questions = [q.model_dump() for q in question_set.questions]
    quiz_state.start_quiz(questions, book_title=book_title, chunk_title=chunk["title"])
    st.rerun()


def _quiz_tab() -> None:
    err = st.session_state.get("generation_error")
    if err:
        st.error(err)

    if quiz_state.has_active_quiz():
        quiz_state.render_quiz()
    elif not err:
        st.info(
            "Upload a PDF in the sidebar, pick a section, and generate a set of "
            "USMLE-style questions to begin."
        )


def _history_tab() -> None:
    st.subheader("Your history")
    conn = registry.get_connection()
    try:
        df = pd.read_sql_query(
            "SELECT timestamp, book_title, chunk_title, user_answer, correct_answer, "
            "is_correct FROM user_history ORDER BY id DESC",
            conn,
        )
    finally:
        conn.close()

    if df.empty:
        st.info("No attempts yet. Complete some questions and they'll show up here.")
        return

    total = len(df)
    correct = int(df["is_correct"].sum())
    pct = correct / total * 100 if total else 0.0
    c1, c2, c3 = st.columns(3)
    c1.metric("Questions answered", total)
    c2.metric("Correct", correct)
    c3.metric("Accuracy", f"{pct:.0f}%")

    display = df.copy()
    display["Result"] = display["is_correct"].map({1: "✅ Correct", 0: "❌ Wrong"})
    display = display.rename(
        columns={
            "timestamp": "When",
            "book_title": "Book",
            "chunk_title": "Section",
            "user_answer": "Your answer",
            "correct_answer": "Correct",
        }
    )[["When", "Book", "Section", "Your answer", "Correct", "Result"]]
    st.dataframe(display, use_container_width=True, hide_index=True)


def main() -> None:
    st.markdown('<div class="app-title">🩺 USMLE Study Helper</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="app-sub">Turn your own notes into NBME-style practice, '
        'powered by your Gemini Notebook account.</div>',
        unsafe_allow_html=True,
    )
    st.write("")

    _sidebar()

    quiz_tab, history_tab = st.tabs(["Practice", "History"])
    with quiz_tab:
        _quiz_tab()
    with history_tab:
        _history_tab()


if __name__ == "__main__":
    main()
