import sqlite3
from typing import Optional, Dict, Any, Tuple
from app.models import (
    AttemptIn,
    AttemptOut,
    QuestionOut,
    SessionCreate,
    SessionOut,
)


def create_session(db: sqlite3.Connection, request: SessionCreate) -> Optional[SessionOut]:
    """Generates a study session from filtered random questions and persists it."""
    cursor = db.cursor()
    query = f"SELECT * FROM {request.qbank}.bank_questions"
    params = []
    conditions = []
    scope_str = "All"
    
    valid_subjects = [s for s in (request.subjects or []) if s != "All Systems"]
    
    if request.qbank == "medqa_usmle":
        if request.exam_type:
            conditions.append("exam_type = ?")
            params.append(request.exam_type)
            scope_str = request.exam_type
            
        if valid_subjects:
            placeholders = ",".join("?" for _ in valid_subjects)
            conditions.append(f"subject IN ({placeholders})")
            params.extend(valid_subjects)
            scope_str = f"{request.exam_type or 'USMLE'} ({', '.join(valid_subjects)})"
            
    elif request.qbank == "medmcqa" and valid_subjects:
        placeholders = ",".join("?" for _ in valid_subjects)
        conditions.append(f"subject IN ({placeholders})")
        params.extend(valid_subjects)
        scope_str = ", ".join(valid_subjects)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY RANDOM() LIMIT ?"
    params.append(request.block_size)
    
    rows = cursor.execute(query, params).fetchall()
    if not rows:
        return None
        
    cursor.execute(
        "INSERT INTO study_sessions (qbank, scope) VALUES (?, ?)", 
        (request.qbank, scope_str)
    )
    session_id = cursor.lastrowid
    
    questions = []
    question_ids = []
    
    for r in rows:
        q_id = r["id"]
        question_ids.append(q_id)
        options = [r["opa"], r["opb"], r["opc"], r["opd"]]
        
        questions.append(QuestionOut(
            id=q_id,
            question=r["question"],
            options=options,
            subject=r["subject"],
            explanation=r["explanation"],
            correct_text=r["correct_text"],
            exam_type=r["exam_type"],
            metamap_phrases=r["metamap_phrases"]
        ))
        
        cursor.execute(
            "INSERT INTO session_questions (session_id, question_id, correct_option) VALUES (?, ?, ?)",
            (session_id, q_id, r["correct_option"])
        )
        
    db.commit()
    
    return SessionOut(
        session_id=session_id, 
        qbank=request.qbank,
        question_ids=question_ids, 
        questions=questions
    )


def record_session_attempt(
    db: sqlite3.Connection,
    session_id: int,
    attempt: AttemptIn
) -> Tuple[Optional[AttemptOut], Optional[str]]:
    """Evaluates the submitted answer and persists attempt to DB. Returns (AttemptOut, error_str)."""
    cursor = db.cursor()
    
    session_row = cursor.execute(
        "SELECT qbank FROM study_sessions WHERE id = ?;", (session_id,)
    ).fetchone()
    if not session_row:
        return None, "Session not found"
        
    qbank = session_row["qbank"] or "medqa_usmle"
    
    row = cursor.execute(
        f"SELECT correct_option, explanation FROM {qbank}.bank_questions WHERE id = ?;",
        (attempt.question_id,)
    ).fetchone()
    
    if not row:
        other_bank = "medmcqa" if qbank == "medqa_usmle" else "medqa_usmle"
        row = cursor.execute(
            f"SELECT correct_option, explanation FROM {other_bank}.bank_questions WHERE id = ?;",
            (attempt.question_id,)
        ).fetchone()
        
    if not row:
        return None, "Question not found"

    correct_option = int(row["correct_option"])
    is_correct = (attempt.selected_option == correct_option)

    cursor.execute(
        """
        INSERT INTO session_attempts 
        (session_id, question_id, selected_option, is_correct, time_spent_seconds)
        VALUES (?, ?, ?, ?, ?);
        """,
        (session_id, attempt.question_id, attempt.selected_option, is_correct, attempt.time_spent_seconds)
    )
    db.commit()

    return AttemptOut(
        question_id=attempt.question_id,
        selected_option=attempt.selected_option,
        correct_option=correct_option,
        is_correct=is_correct,
        explanation=row["explanation"]
    ), None


def complete_session(db: sqlite3.Connection, session_id: int) -> bool:
    """Marks a session as completed."""
    cursor = db.cursor()
    cursor.execute("UPDATE study_sessions SET is_completed = 1 WHERE id = ?;", (session_id,))
    db.commit()
    return True


def get_session_review(db: sqlite3.Connection, session_id: int) -> Optional[Dict[str, Any]]:
    """Reconstructs questions and student attempt data for reviewing a past session."""
    cursor = db.cursor()
    
    session_row = cursor.execute(
        "SELECT id, qbank, scope, created_at, is_completed FROM study_sessions WHERE id = ?;",
        (session_id,)
    ).fetchone()
    
    if not session_row:
        return None
        
    qbank = session_row["qbank"] or "medqa_usmle"
    
    question_rows = cursor.execute(
        f"""
        SELECT 
            sq.question_id,
            sq.correct_option as saved_correct_option,
            bq.question,
            bq.opa, bq.opb, bq.opc, bq.opd,
            bq.correct_text,
            bq.explanation,
            bq.subject,
            bq.exam_type,
            bq.metamap_phrases
        FROM session_questions sq
        LEFT JOIN {qbank}.bank_questions bq ON sq.question_id = bq.id
        WHERE sq.session_id = ?
        ORDER BY sq.rowid ASC;
        """,
        (session_id,)
    ).fetchall()
    
    attempt_rows = cursor.execute(
        """
        SELECT question_id, selected_option, is_correct, time_spent_seconds
        FROM session_attempts
        WHERE session_id = ?;
        """,
        (session_id,)
    ).fetchall()
    
    attempts_map = {
        r["question_id"]: {
            "selected_option": r["selected_option"],
            "is_correct": bool(r["is_correct"]),
            "time_spent": r["time_spent_seconds"]
        }
        for r in attempt_rows
    }
    
    questions = []
    question_ids = []
    attempts_dict = {}
    
    for idx, r in enumerate(question_rows):
        q_id = r["question_id"]
        question_ids.append(q_id)
        options = [r["opa"], r["opb"], r["opc"], r["opd"]]
        
        questions.append(QuestionOut(
            id=q_id,
            question=r["question"] or "",
            options=options,
            subject=r["subject"],
            explanation=r["explanation"],
            correct_text=r["correct_text"],
            exam_type=r["exam_type"],
            metamap_phrases=r["metamap_phrases"]
        ))
        
        att = attempts_map.get(q_id)
        if att:
            attempts_dict[str(idx)] = {
                "questionId": q_id,
                "questionIndex": idx,
                "selectedOption": att["selected_option"],
                "correctOption": int(r["saved_correct_option"]),
                "isCorrect": att["is_correct"],
                "timeSpent": att["time_spent"],
                "explanation": r["explanation"],
                "subject": r["subject"],
                "questionText": r["question"] or "",
                "options": options,
                "correctText": r["correct_text"]
            }
            
    return {
        "sessionData": SessionOut(
            session_id=session_id,
            qbank=qbank,
            question_ids=question_ids,
            questions=questions
        ),
        "attempts": attempts_dict,
        "isReviewMode": True
    }


def retry_session(db: sqlite3.Connection, session_id: int) -> Tuple[Optional[SessionOut], Optional[str]]:
    """Creates a brand new study session containing the exact same questions from a past session."""
    cursor = db.cursor()
    
    old_session = cursor.execute(
        "SELECT qbank, scope FROM study_sessions WHERE id = ?;", (session_id,)
    ).fetchone()
    
    if not old_session:
        return None, "Session not found"
        
    qbank = old_session["qbank"] or "medqa_usmle"
    
    rows = cursor.execute(
        f"""
        SELECT 
            sq.question_id,
            sq.correct_option,
            bq.question,
            bq.opa, bq.opb, bq.opc, bq.opd,
            bq.correct_text,
            bq.explanation,
            bq.subject,
            bq.exam_type,
            bq.metamap_phrases
        FROM session_questions sq
        LEFT JOIN {qbank}.bank_questions bq ON sq.question_id = bq.id
        WHERE sq.session_id = ?
        ORDER BY sq.rowid ASC;
        """,
        (session_id,)
    ).fetchall()
    
    if not rows:
        return None, "No questions found in original session to retry."
        
    cursor.execute(
        "INSERT INTO study_sessions (qbank, scope) VALUES (?, ?);",
        (qbank, f"{old_session['scope']} (Retry #{session_id})")
    )
    new_session_id = cursor.lastrowid
    
    questions = []
    question_ids = []
    
    for r in rows:
        q_id = r["question_id"]
        question_ids.append(q_id)
        options = [r["opa"], r["opb"], r["opc"], r["opd"]]
        
        questions.append(QuestionOut(
            id=q_id,
            question=r["question"] or "",
            options=options,
            subject=r["subject"],
            explanation=r["explanation"],
            correct_text=r["correct_text"],
            exam_type=r["exam_type"],
            metamap_phrases=r["metamap_phrases"]
        ))
        
        cursor.execute(
            "INSERT INTO session_questions (session_id, question_id, correct_option) VALUES (?, ?, ?);",
            (new_session_id, q_id, r["correct_option"])
        )
        
    db.commit()
    
    return SessionOut(
        session_id=new_session_id,
        qbank=qbank,
        question_ids=question_ids,
        questions=questions
    ), None

