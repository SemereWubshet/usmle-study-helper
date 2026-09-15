import sqlite3
from typing import List
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import os
import signal
import time
import threading
from contextlib import asynccontextmanager

from .database import get_db
from .models import (
    AttemptIn, AttemptOut, DashboardOut, QuestionOut, 
    SessionCreate, SessionOut, SessionSummary
)

APP_VERSION = "0.2.0"
MIN_FRONTEND_VERSION = "0.2.0"
LAST_HEARTBEAT = time.time()
WATCHDOG_TIMEOUT_SECONDS = 120
WATCHDOG_GRACE_PERIOD = 120
def watchdog_worker():
    """Background thread that shuts down the engine if all browser tabs are closed."""
    time.sleep(WATCHDOG_GRACE_PERIOD)
    while True:
        time.sleep(15)
        idle_time = time.time() - LAST_HEARTBEAT
        if idle_time > WATCHDOG_TIMEOUT_SECONDS:
            print(f"[Watchdog] No active browser tabs detected for {int(idle_time)}s. Shutting down cleanly...")
            os.kill(os.getpid(), signal.SIGINT)
            break
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the background watchdog thread
    thread = threading.Thread(target=watchdog_worker, daemon=True)
    thread.start()
    yield
    # Shutdown: (Cleanup if needed)

app = FastAPI(
    title="USMLE Study Helper API", 
    version=APP_VERSION,
    lifespan=lifespan
)

# Dynamic CORS: Allow localhost for dev, loopback domain, and wildcard/remote Vercel origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/heartbeat")
@app.post("/api/heartbeat/")
@app.get("/api/heartbeat")
@app.post("/api/v1/heartbeat")
def heartbeat():
    global LAST_HEARTBEAT
    LAST_HEARTBEAT = time.time()
    return {"status": "alive"}

@app.get("/api/health")
@app.get("/api/v1/health")
def health_check():
    """Heartbeat endpoint queried by the hosted frontend gate to check engine connectivity."""
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "engine": "USMLE-Study-Helper-Local-Engine"
    }

@app.get("/api/version")
@app.get("/api/v1/version")
def get_version():
    """Version handshake endpoint to verify compatibility between remote frontend and local engine."""
    return {
        "version": APP_VERSION,
        "min_frontend_version": MIN_FRONTEND_VERSION,
        "engine": "USMLE-Study-Helper-Local-Engine"
    }

# The response_model here maps to your SessionOut class in models.py
@app.post("/api/v1/sessions/", response_model=SessionOut)
def create_session(request: SessionCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # Base query routes to the correct attached database alias using request.qbank
    query = f"SELECT * FROM {request.qbank}.bank_questions"
    params = []
    conditions = []
    scope_str = "All"
    
    # Filter out "All Systems" if passed by frontend
    valid_subjects = [s for s in (request.subjects or []) if s != "All Systems"]
    
    # Dynamically build the WHERE clause based on the selected Q-Bank's filters
    if request.qbank == "medmcqa" and valid_subjects:
        placeholders = ",".join("?" for _ in valid_subjects)
        conditions.append(f"subject IN ({placeholders})")
        params.extend(valid_subjects)
        scope_str = ", ".join(valid_subjects)
        
    elif request.qbank == "medqa_usmle" and request.exam_type:
        conditions.append("exam_type = ?")
        params.append(request.exam_type)
        scope_str = request.exam_type
        
    # Safely inject the WHERE clause only if conditions exist
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY RANDOM() LIMIT ?"
    params.append(request.block_size)
    
    # Execute query
    rows = cursor.execute(query, params).fetchall()
    
    if not rows:
        raise HTTPException(status_code=400, detail="No questions match the selected filters.")
        
    # Create the session tracking record in the profile database
    cursor.execute(
        "INSERT INTO study_sessions (qbank, scope) VALUES (?, ?)", 
        (request.qbank, scope_str)
    )
    session_id = cursor.lastrowid
    
    questions = []
    question_ids = []
    
    for r in rows:
        # If your QuestionOut model uses a different ID field name, map it here
        q_id = r["id"]
        question_ids.append(q_id)
        
        # Packaging the flat database columns back into a list array
        options = [r["opa"], r["opb"], r["opc"], r["opd"]]
        
        # QuestionOut mapping: Check these kwargs against your current models.py classes
        # If you deleted 'split_name' or 'exam_type' from QuestionOut, remove them below.
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
        
        # Save the correct option mapping to validate future answer attempts
        cursor.execute(
            "INSERT INTO session_questions (session_id, question_id, correct_option) VALUES (?, ?, ?)",
            (session_id, q_id, r["correct_option"])
        )
        
    db.commit()
    
    # SessionOut mapping: Check these kwargs against your current models.py class
    # Used fields: session_id, qbank, question_ids, questions (List[QuestionOut])
    return SessionOut(
        session_id=session_id, 
        qbank=request.qbank,
        question_ids=question_ids, 
        questions=questions
    )

@app.get("/api/v1/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Fetches a specific question by ID from either cartridge for the active session."""
    cursor = db.cursor()
    
    row = cursor.execute(
        "SELECT * FROM medqa_usmle.bank_questions WHERE id = ?;", 
        (question_id,)
    ).fetchone()
    
    if not row:
        row = cursor.execute(
            "SELECT * FROM medmcqa.bank_questions WHERE id = ?;", 
            (question_id,)
        ).fetchone()
        
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
        
    return QuestionOut(
        id=row["id"],
        question=row["question"],
        options=[row["opa"], row["opb"], row["opc"], row["opd"]],
        subject=row["subject"],
        explanation=row["explanation"],
        correct_text=row["correct_text"],
        exam_type=row["exam_type"],
        metamap_phrases=row["metamap_phrases"]
    )

@app.post("/api/v1/sessions/{session_id}/attempt", response_model=AttemptOut)
def record_attempt(
    session_id: int, attempt: AttemptIn, db: sqlite3.Connection = Depends(get_db)
):
    """Evaluates the answer, records time spent, and logs it to the specific session."""
    cursor = db.cursor()
    
    # 1. Identify which qbank this session belongs to
    session_row = cursor.execute(
        "SELECT qbank FROM study_sessions WHERE id = ?;", (session_id,)
    ).fetchone()
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    qbank = session_row["qbank"] or "medqa_usmle"
    
    # 2. Fetch answer details from that qbank (with fallback)
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
        raise HTTPException(status_code=404, detail="Question not found")

    correct_option = int(row["correct_option"])
    is_correct = (attempt.selected_option == correct_option)

    # 3. Record the attempt
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
    """Calculates global metrics, pacing, and subject-level readiness."""
    cursor = db.cursor()
    
    # 1. Global Stats
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

    # 2. Recent Sessions (Including qbank and scope required by SessionSummary)
    session_rows = cursor.execute(
        """
        SELECT 
            s.id, s.created_at, s.qbank, s.scope,
            COUNT(a.id) as answered,
            SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as session_correct,
            AVG(a.time_spent_seconds) as avg_time
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
        avg_t = r["avg_time"] or 0.0
        
        recent_sessions.append(SessionSummary(
            session_id=r["id"],
            created_at=r["created_at"],
            questions_answered=ans,
            accuracy_percentage=round(acc, 1),
            average_time_seconds=round(avg_t, 1),
            qbank=r["qbank"] or "medqa_usmle",
            scope=r["scope"] or "All"
        ))

    # 3. Subject-Level Readiness (Unifying medmcqa subjects and medqa_usmle exam types)
    subject_rows = cursor.execute(
        """
        WITH all_questions AS (
            SELECT id, subject, exam_type FROM medmcqa.bank_questions
            UNION ALL
            SELECT id, subject, exam_type FROM medqa_usmle.bank_questions
        )
        SELECT 
            COALESCE(q.subject, q.exam_type) as subject,
            COUNT(a.id) as subject_total,
            SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as subject_correct
        FROM session_attempts a
        JOIN all_questions q ON a.question_id = q.id
        WHERE COALESCE(q.subject, q.exam_type) IS NOT NULL
        GROUP BY COALESCE(q.subject, q.exam_type)
        ORDER BY subject_total DESC;
        """
    ).fetchall()

    subject_performance = []
    for r in subject_rows:
        s_total = r["subject_total"]
        s_corr = r["subject_correct"] or 0
        s_acc = (s_corr / s_total * 100.0) if s_total > 0 else 0.0

        subject_performance.append({
            "subject": r["subject"],
            "total_answered": s_total,
            "accuracy_percentage": round(s_acc, 1)
        })

    return DashboardOut(
        total_answered=total,
        global_accuracy=round(global_acc, 1),
        recent_sessions=recent_sessions,
        subject_performance=subject_performance
    )