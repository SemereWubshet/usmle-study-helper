"""The shared quiz-taking state machine (submit -> grade -> explain -> next).

Streamlit reruns the whole script on every interaction, so all state lives in
``st.session_state`` and every side effect (history logging in particular) is
guarded against re-execution on rerun. Rendering emits markup with stable CSS
class names; the one-shot motion is injected here so the quiz visuals travel
with the quiz.
"""

from __future__ import annotations

import html
import time
import uuid

import streamlit as st

import registry

OPTION_LETTERS = ["A", "B", "C", "D", "E"]

# --- session keys ----------------------------------------------------------
_K_QUESTIONS = "quiz_questions"
_K_INDEX = "quiz_index"
_K_SELECTED = "quiz_selected"          # dict[int, str]
_K_ELIMINATED = "quiz_eliminated"      # dict[int, set[str]]
_K_SUBMITTED = "quiz_submitted"        # set[int]
_K_RESULTS = "quiz_results"            # dict[int, bool]
_K_SESSION_ID = "quiz_session_id"
_K_START_TIME = "quiz_start_time"
_K_HISTORY_LOGGED = "quiz_history_logged"  # set[int]
_K_BOOK_TITLE = "quiz_book_title"
_K_CHUNK_TITLE = "quiz_chunk_title"
_K_CSS_INJECTED = "quiz_css_injected"
_K_LAST_RENDERED_INDEX = "quiz_last_rendered_index"


# --- lifecycle -------------------------------------------------------------

def start_quiz(questions: list[dict], book_title: str, chunk_title: str) -> None:
    """Begin a fresh quiz from a list of question dicts. Resets all per-quiz
    state, so re-generating replaces the previous block cleanly."""
    st.session_state[_K_QUESTIONS] = questions
    st.session_state[_K_INDEX] = 0
    st.session_state[_K_SELECTED] = {}
    st.session_state[_K_ELIMINATED] = {}
    st.session_state[_K_SUBMITTED] = set()
    st.session_state[_K_RESULTS] = {}
    st.session_state[_K_SESSION_ID] = uuid.uuid4().hex
    st.session_state[_K_START_TIME] = time.time()
    st.session_state[_K_HISTORY_LOGGED] = set()
    st.session_state[_K_BOOK_TITLE] = book_title
    st.session_state[_K_CHUNK_TITLE] = chunk_title
    st.session_state[_K_LAST_RENDERED_INDEX] = None


def has_active_quiz() -> bool:
    return bool(st.session_state.get(_K_QUESTIONS))


def running_accuracy() -> tuple[int, int, float]:
    """(correct, answered, pct) over questions submitted this session. Safe
    when nothing has been answered yet (returns 0, 0, 0.0)."""
    results = st.session_state.get(_K_RESULTS, {})
    answered = len(results)
    correct = sum(1 for v in results.values() if v)
    pct = (correct / answered * 100.0) if answered else 0.0
    return correct, answered, pct


# --- history persistence ---------------------------------------------------

def _log_history(index: int, question: dict, user_answer: str, is_correct: bool) -> None:
    """Write exactly one ``user_history`` row for this question. Guarded by
    ``quiz_history_logged`` so a rerun after submit never double-inserts."""
    logged: set = st.session_state[_K_HISTORY_LOGGED]
    if index in logged:
        return
    session_id = st.session_state[_K_SESSION_ID]
    conn = registry.get_connection()
    try:
        conn.execute(
            "INSERT INTO user_history "
            "(session_id, book_title, chunk_title, question_id, user_answer, "
            "correct_answer, is_correct) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                session_id,
                st.session_state[_K_BOOK_TITLE],
                st.session_state[_K_CHUNK_TITLE],
                f"{session_id}-{index}",
                user_answer,
                question["correct_option"],
                1 if is_correct else 0,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    logged.add(index)


# --- rendering -------------------------------------------------------------

def _inject_css() -> None:
    if st.session_state.get(_K_CSS_INJECTED):
        return
    st.session_state[_K_CSS_INJECTED] = True
    st.markdown(_QUIZ_CSS, unsafe_allow_html=True)


def _progress_header(index: int, total: int) -> None:
    correct, answered, pct = running_accuracy()
    elapsed = int(time.time() - st.session_state[_K_START_TIME])
    mins, secs = divmod(elapsed, 60)
    fill = ((index + 1) / total) * 100 if total else 0
    acc_text = f"{pct:.0f}%" if answered else "—"
    st.markdown(
        f"""
        <div class="quiz-header">
          <div class="quiz-header-row">
            <span class="quiz-qcount">Question {index + 1} of {total}</span>
            <span class="quiz-stats">
              <span title="Running accuracy">🎯 {acc_text}
                <span class="quiz-substat">({correct}/{answered})</span></span>
              <span title="Time on this block">⏱ {mins:02d}:{secs:02d}</span>
            </span>
          </div>
          <div class="quiz-progress-track">
            <div class="quiz-progress-fill" style="width: {fill:.1f}%;"></div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _vignette_card(index: int, vignette: str) -> None:
    # Animate the entrance only when the question actually changes, not on
    # every rerun within the same question (skill: one signature moment).
    animate = st.session_state.get(_K_LAST_RENDERED_INDEX) != index
    st.session_state[_K_LAST_RENDERED_INDEX] = index
    cls = "vignette-card animate-in" if animate else "vignette-card"
    st.markdown(
        f'<div class="{cls}">{html.escape(vignette)}</div>',
        unsafe_allow_html=True,
    )


def _render_options_interactive(index: int, question: dict) -> None:
    """Pre-submit: selectable options with per-option 'rule out' toggles."""
    selected = st.session_state[_K_SELECTED].get(index)
    eliminated: set = st.session_state[_K_ELIMINATED].setdefault(index, set())

    for letter in OPTION_LETTERS:
        opt = question["options"].get(letter)
        if opt is None:
            continue
        badge_col, body_col, elim_col = st.columns([0.06, 0.82, 0.12])
        with badge_col:
            st.markdown(
                f'<div class="opt-badge">{letter}</div>', unsafe_allow_html=True
            )
        is_elim = letter in eliminated
        with body_col:
            if is_elim:
                st.markdown(
                    f'<div class="opt-struck">{html.escape(opt["text"])}</div>',
                    unsafe_allow_html=True,
                )
            else:
                if st.button(
                    opt["text"],
                    key=f"opt_{index}_{letter}",
                    type="primary" if selected == letter else "secondary",
                    use_container_width=True,
                ):
                    st.session_state[_K_SELECTED][index] = letter
                    st.rerun()
        with elim_col:
            if st.button(
                "↺" if is_elim else "✕",
                key=f"elim_{index}_{letter}",
                help="Restore option" if is_elim else "Rule this option out",
                use_container_width=True,
            ):
                if is_elim:
                    eliminated.discard(letter)
                else:
                    eliminated.add(letter)
                    # Ruling out the current pick clears the selection.
                    if selected == letter:
                        st.session_state[_K_SELECTED].pop(index, None)
                st.rerun()


def _render_options_graded(index: int, question: dict) -> None:
    """Post-submit: static, color-coded options. No further interaction."""
    selected = st.session_state[_K_SELECTED].get(index)
    correct = question["correct_option"]
    for letter in OPTION_LETTERS:
        opt = question["options"].get(letter)
        if opt is None:
            continue
        if letter == correct:
            state = "opt-correct"
        elif letter == selected:
            state = "opt-incorrect"
        else:
            state = "opt-neutral"
        st.markdown(
            f"""
            <div class="opt-graded {state}">
              <span class="opt-badge">{letter}</span>
              <span class="opt-graded-text">{html.escape(opt["text"])}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _explanation(question: dict) -> None:
    selected = st.session_state[_K_SELECTED].get(st.session_state[_K_INDEX])
    correct = question["correct_option"]
    is_correct = selected == correct
    verdict_cls = "verdict-correct" if is_correct else "verdict-incorrect"
    verdict_text = "Correct" if is_correct else f"Incorrect — answer is {correct}"
    st.markdown(
        f'<div class="verdict {verdict_cls}">{verdict_text}</div>',
        unsafe_allow_html=True,
    )
    with st.expander("Explanation", expanded=True):
        st.markdown(f"**Key takeaway**\n\n{question['key_takeaway']}")
        st.markdown(f"**Vignette breakdown**\n\n{question['vignette_breakdown']}")
        st.markdown("**Why each option**")
        for letter in OPTION_LETTERS:
            opt = question["options"].get(letter)
            if opt is None:
                continue
            mark = "✅" if letter == correct else "❌"
            st.markdown(f"{mark} **{letter}.** {opt['rationale']}")
        # Source panel — optional key, so a future Mode B question without one
        # still renders fine.
        citation = question.get("source_citation")
        if citation:
            st.markdown("**Source**")
            st.markdown(f"> {citation}")


def _controls(index: int, question: dict, total: int) -> None:
    submitted: set = st.session_state[_K_SUBMITTED]
    if index in submitted:
        # Grading done — offer Next (or a finish note on the last question).
        if index + 1 < total:
            if st.button("Next question →", type="primary", key=f"next_{index}"):
                st.session_state[_K_INDEX] = index + 1
                st.rerun()
        else:
            correct, answered, pct = running_accuracy()
            st.success(
                f"Block complete — {correct}/{answered} correct ({pct:.0f}%). "
                "Generate another chunk from the sidebar to keep going."
            )
        return

    selected = st.session_state[_K_SELECTED].get(index)
    disabled = selected is None
    if st.button(
        "Submit answer",
        type="primary",
        disabled=disabled,
        key=f"submit_{index}",
        help="Select an option first" if disabled else None,
    ):
        is_correct = selected == question["correct_option"]
        submitted.add(index)
        st.session_state[_K_RESULTS][index] = is_correct
        _log_history(index, question, selected, is_correct)
        st.rerun()
    if disabled:
        st.caption("Select an option to submit.")


def render_quiz() -> None:
    """Render the current question's full workspace. Safe to call every rerun."""
    _inject_css()
    questions: list[dict] = st.session_state[_K_QUESTIONS]
    total = len(questions)
    index = st.session_state[_K_INDEX]
    question = questions[index]

    _progress_header(index, total)
    _vignette_card(index, question["vignette"])

    if index in st.session_state[_K_SUBMITTED]:
        _render_options_graded(index, question)
        _explanation(question)
    else:
        _render_options_interactive(index, question)

    st.write("")
    _controls(index, question, total)


# --- styles + motion -------------------------------------------------------
# Motion is restrained per the project's design-motion principles: one signature
# entrance on the vignette card, quick functional fades everywhere else, and
# prefers-reduced-motion honored.
_QUIZ_CSS = """
<style>
.quiz-header { margin-bottom: 1.1rem; }
.quiz-header-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 0.4rem;
}
.quiz-qcount { font-weight: 600; font-size: 0.95rem; letter-spacing: 0.01em; }
.quiz-stats { display: flex; gap: 1.1rem; font-size: 0.9rem; opacity: 0.9; }
.quiz-substat { opacity: 0.6; font-size: 0.8rem; }
.quiz-progress-track {
  height: 7px; background: rgba(128,128,128,0.18); border-radius: 4px;
  overflow: hidden;
}
.quiz-progress-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, #4f8cff, #6aa8ff);
  transition: width 250ms ease-out;   /* trustworthy fill, never bouncy */
}

.vignette-card {
  background: rgba(128,128,128,0.06);
  border: 1px solid rgba(128,128,128,0.18);
  border-left: 4px solid #4f8cff;
  border-radius: 10px;
  padding: 1.15rem 1.3rem;
  margin: 0.4rem 0 1.2rem 0;
  font-size: 1.04rem; line-height: 1.6;
  white-space: pre-wrap;
}
.vignette-card.animate-in { animation: vignette-enter 260ms ease-out both; }
@keyframes vignette-enter {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.opt-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(128,128,128,0.18); font-weight: 700; font-size: 0.85rem;
  margin-top: 0.15rem;
}
.opt-struck {
  padding: 0.55rem 0.2rem; text-decoration: line-through;
  opacity: 0.45; transition: opacity 150ms ease-out;
  animation: strike-in 150ms ease-out both;
}
@keyframes strike-in { from { opacity: 0.85; } to { opacity: 0.45; } }

.opt-graded {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.65rem 0.85rem; margin: 0.35rem 0;
  border: 1px solid rgba(128,128,128,0.2); border-radius: 8px;
  animation: grade-in 200ms ease-out both;
}
.opt-graded-text { line-height: 1.45; }
.opt-correct   { background: rgba(46,160,67,0.14); border-color: rgba(46,160,67,0.5); }
.opt-incorrect { background: rgba(218,54,51,0.13); border-color: rgba(218,54,51,0.5); }
.opt-neutral   { opacity: 0.72; }
@keyframes grade-in { from { opacity: 0; } to { opacity: 1; } }

.verdict {
  font-weight: 700; font-size: 1.02rem; margin: 0.6rem 0 0.3rem 0;
  animation: grade-in 200ms ease-out both;
}
.verdict-correct   { color: #2ea043; }
.verdict-incorrect { color: #da3633; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
</style>
"""
