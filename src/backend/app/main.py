import sqlite3
from typing import List
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import os
import signal
import time
import threading
from contextlib import asynccontextmanager

import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import html
import re
from functools import lru_cache

from .database import get_db
from .models import (
    AttemptIn, AttemptOut, DashboardOut, QuestionOut, 
    SessionCreate, SessionOut, SessionSummary,
    EncyclopediaResponse, EncyclopediaSection
)

APP_VERSION = "0.4.0"
MIN_FRONTEND_VERSION = "0.4.0"
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

@app.get("/api/subjects")
@app.get("/api/v1/subjects")
def get_available_subjects(qbank: str = "medqa_usmle", exam_type: str | None = None, db: sqlite3.Connection = Depends(get_db)):
    """Returns available subjects and their question counts for a qbank and optional exam_type."""
    cursor = db.cursor()
    query = f"SELECT subject, COUNT(*) as count FROM {qbank}.bank_questions WHERE subject IS NOT NULL AND TRIM(subject) != ''"
    params = []
    if exam_type:
        query += " AND exam_type = ?"
        params.append(exam_type)
    query += " GROUP BY subject ORDER BY count DESC"
    
    rows = cursor.execute(query, params).fetchall()
    return [{"subject": r["subject"], "count": r["count"]} for r in rows]

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

@app.post("/api/v1/sessions/{session_id}/complete")
def complete_session(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Marks a session as completed in the profile database."""
    cursor = db.cursor()
    cursor.execute("UPDATE study_sessions SET is_completed = 1 WHERE id = ?;", (session_id,))
    db.commit()
    return {"status": "completed", "session_id": session_id}

@app.get("/api/v1/sessions/{session_id}/review")
def get_session_review(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Reconstructs the full questions and student attempt data for reviewing a past session."""
    cursor = db.cursor()
    
    session_row = cursor.execute(
        "SELECT id, qbank, scope, created_at, is_completed FROM study_sessions WHERE id = ?;",
        (session_id,)
    ).fetchone()
    
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    qbank = session_row["qbank"] or "medqa_usmle"
    
    # 1. Fetch ordered session questions linked with their original bank content
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
    
    # 2. Fetch recorded attempts for this session
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
        
        # Build StoredAttempt format matching frontend Session.tsx expectations
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

@app.post("/api/v1/sessions/{session_id}/retry", response_model=SessionOut)
def retry_session(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Creates a brand new study session containing the exact same questions from a past session."""
    cursor = db.cursor()
    
    old_session = cursor.execute(
        "SELECT qbank, scope FROM study_sessions WHERE id = ?;", (session_id,)
    ).fetchone()
    
    if not old_session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    qbank = old_session["qbank"] or "medqa_usmle"
    
    # Fetch questions from original session
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
        raise HTTPException(status_code=400, detail="No questions found in original session to retry.")
        
    # Insert new session with fresh ID
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

    # 3. Subject-Level Readiness (Categorized by exam_group: USMLE Step 1, USMLE Step 2 and Step 3, MedMCQA)
    subject_rows = cursor.execute(
        """
        WITH all_questions AS (
            SELECT id, subject, exam_type, 'MedMCQA' as exam_group FROM medmcqa.bank_questions
            UNION ALL
            SELECT id, subject, exam_type, COALESCE(exam_type, 'USMLE Step 1') as exam_group FROM medqa_usmle.bank_questions
        )
        SELECT 
            q.exam_group,
            q.subject,
            COUNT(a.id) as subject_total,
            SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as subject_correct
        FROM session_attempts a
        JOIN all_questions q ON a.question_id = q.id
        WHERE q.subject IS NOT NULL AND TRIM(q.subject) != ''
        GROUP BY q.exam_group, q.subject
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
            "accuracy_percentage": round(s_acc, 1),
            "exam_group": r["exam_group"]
        })

    return DashboardOut(
        total_answered=total,
        global_accuracy=round(global_acc, 1),
        recent_sessions=recent_sessions,
        subject_performance=subject_performance
    )

MEDLINEPLUS_API_URL = "https://wsearch.nlm.nih.gov/ws/query"

def clean_xml_text(raw_text: str | None) -> str:
    if not raw_text:
        return ""
    unescaped = html.unescape(raw_text)
    no_tags = re.sub(r"<[^>]+>", "", unescaped)
    return re.sub(r"\s+", " ", no_tags).strip()

def parse_summary_sections(raw_html: str) -> list[dict]:
    """
    Splits full-summary by <h3> tags so questions and answers are structured.
    """
    if not raw_html or "<h3>" not in raw_html:
        return []
    chunks = re.split(r"(<h3>.*?</h3>)", raw_html, flags=re.DOTALL)
    sections = []
    for i in range(1, len(chunks), 2):
        heading = re.sub(r"</?h3>", "", chunks[i]).strip()
        body = chunks[i + 1].strip() if i + 1 < len(chunks) else ""
        sections.append({
            "heading": heading,
            "body": body,
            "clean_text": clean_xml_text(body),
        })
    return sections

@lru_cache(maxsize=512)
def fetch_medlineplus_topic(term: str) -> list[dict]:
    """
    Queries MedlinePlus for topic details with LRU caching.
    """
    params = {
        "db": "healthTopics",
        "term": term.strip(),
        "retmax": "1",
        "rettype": "topic",
    }
    url = f"{MEDLINEPLUS_API_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "USMLE-Study-Helper/1.0 (Educational App)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            raw_xml = resp.read()
    except Exception as e:
        print(f"[MedlinePlus] Error fetching '{term}': {e}")
        return []

    root = ET.fromstring(raw_xml)
    results = []
    for doc in root.findall(".//document"):
        item = {
            "title": "",
            "summary": "",
            "url": doc.get("url", ""),
            "alt_titles": [],
            "sections": [],
        }
        ht = doc.find(".//health-topic")
        if ht is not None:
            item["title"] = ht.get("title", "")
            item["url"] = ht.get("url", item["url"])
            also_called = ht.find("also-called")
            if also_called is not None and also_called.text:
                item["alt_titles"].append(clean_xml_text(also_called.text))

            fs = ht.find("full-summary")
            if fs is not None and fs.text:
                item["sections"] = parse_summary_sections(fs.text)
                item["summary"] = clean_xml_text(fs.text)

        # Fallback to <content> tags if health-topic attributes were absent
        for content in doc.findall("content"):
            name = content.get("name")
            text = content.text or ""
            if name == "title" and not item["title"]:
                item["title"] = clean_xml_text(text)
            elif name in ("FullSummary", "snippet") and not item["summary"]:
                item["summary"] = clean_xml_text(text)
                if not item["sections"] and "<h3>" in text:
                    item["sections"] = parse_summary_sections(text)
            elif name == "altTitle":
                cleaned_alt = clean_xml_text(text)
                if cleaned_alt and cleaned_alt not in item["alt_titles"]:
                    item["alt_titles"].append(cleaned_alt)

        if item["title"]:
            results.append(item)
    return results

@app.get("/api/v1/encyclopedia", response_model=List[EncyclopediaResponse])
def get_encyclopedia(term: str):
    """
    Fetch concise topic encyclopedia entries from MedlinePlus (NIH).
    """
    if not term or len(term.strip()) < 2:
        return []
    return fetch_medlineplus_topic(term.strip())