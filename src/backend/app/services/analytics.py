import sqlite3
from typing import List, Dict, Any
from app.models import DashboardOut, SessionSummary, SubjectPerformance


def get_dashboard_stats(db: sqlite3.Connection) -> DashboardOut:
    """Calculates global metrics, pacing, recent sessions, and subject-level readiness."""
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

    # 2. Recent Sessions
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

    # 3. Subject-Level Readiness
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

        subject_performance.append(SubjectPerformance(
            subject=r["subject"],
            total_answered=s_total,
            accuracy_percentage=round(s_acc, 1),
            exam_group=r["exam_group"]
        ))

    return DashboardOut(
        total_answered=total,
        global_accuracy=round(global_acc, 1),
        recent_sessions=recent_sessions,
        subject_performance=subject_performance
    )

