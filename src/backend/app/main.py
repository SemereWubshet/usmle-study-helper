import sqlite3
from typing import List
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import get_db
from .models import (
    AttemptIn, AttemptOut, DashboardOut, QuestionOut, 
    SessionCreate, SessionOut, SessionSummary
)

app = FastAPI(title="USMLE Study Helper API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/sessions", response_model=SessionOut)
def create_session(req: SessionCreate, db: sqlite3.Connection = Depends(get_db)):
    """Generates a new study block and returns the queue of question IDs."""
    cursor = db.cursor()
    
    # 1. Create the session in the user profile
    cursor.execute(
        """
        INSERT INTO study_sessions (qbank_name, target_count)
        VALUES (?, ?);
        """,
        (req.qbank_name, req.target_count)
    )
    session_id = cursor.lastrowid
    
    # 2. Select N random questions from the read-only cartridge
    # (Prioritizing unseen questions first)
    rows = cursor.execute(
        """
        SELECT id FROM qbank.bank_questions 
        WHERE id NOT IN (SELECT question_id FROM session_attempts)
        ORDER BY RANDOM() LIMIT ?;
        """, 
        (req.target_count,)
    ).fetchall()
    
    # Fallback if they exhausted the unseen pool
    if len(rows) < req.target_count:
        rows = cursor.execute(
            "SELECT id FROM qbank.bank_questions ORDER BY RANDOM() LIMIT ?;",
            (req.target_count,)
        ).fetchall()

    db.commit()
    return SessionOut(
        session_id=session_id,
        question_ids=[row["id"] for row in rows]
    )

@app.get("/api/v1/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Fetches a specific question by ID for the active session."""
    row = db.cursor().execute(
        "SELECT id, question, opa, opb, opc, opd, subject FROM qbank.bank_questions WHERE id = ?;",
        (question_id,)
    ).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    return dict(row)

@app.post("/api/v1/sessions/{session_id}/attempt", response_model=AttemptOut)
def record_attempt(
    session_id: int, attempt: AttemptIn, db: sqlite3.Connection = Depends(get_db)
):
    """Evaluates the answer, records time spent, and logs it to the specific session."""
    cursor = db.cursor()
    row = cursor.execute(
        "SELECT correct_option, explanation FROM qbank.bank_questions WHERE id = ?;",
        (attempt.question_id,)
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Question not found")

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
    )

@app.get("/api/v1/analytics/dashboard", response_model=DashboardOut)
def get_dashboard_stats(db: sqlite3.Connection = Depends(get_db)):
    """Calculates global metrics and returns recent study blocks."""
    cursor = db.cursor()
    
    # Global Stats
    global_row = cursor.execute(
        """
        SELECT 
            COUNT(*) as total, 
            SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct
        FROM session_attempts;
        """
    ).fetchone()
    
    total = global_row["total"] or 0
    correct = global_row["correct"] or 0
    global_acc = (correct / total * 100.0) if total > 0 else 0.0

    # Recent Sessions
    session_rows = cursor.execute(
        """
        SELECT 
            s.id, s.created_at,
            COUNT(a.id) as answered,
            SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as session_correct
        FROM study_sessions s
        LEFT JOIN session_attempts a ON s.id = a.session_id
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT 5;
        """
    ).fetchall()
    
    recent_sessions = []
    for r in session_rows:
        ans = r["answered"]
        s_corr = r["session_correct"] or 0
        acc = (s_corr / ans * 100.0) if ans > 0 else 0.0
        
        recent_sessions.append(SessionSummary(
            session_id=r["id"],
            created_at=r["created_at"],
            questions_answered=ans,
            accuracy_percentage=round(acc, 1)
        ))

    return DashboardOut(
        total_answered=total,
        global_accuracy=round(global_acc, 1),
        recent_sessions=recent_sessions
    )