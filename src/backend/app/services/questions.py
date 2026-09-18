import sqlite3
from typing import List, Optional, Tuple, Dict, Any
from app.models import (
    AttemptIn,
    AttemptOut,
    QuestionOut,
    SessionCreate,
    SessionOut,
)


def get_available_subjects(
    db: sqlite3.Connection,
    qbank: str = "medqa_usmle",
    exam_type: Optional[str] = None
) -> List[Dict[str, Any]]:
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


def get_question_by_id(db: sqlite3.Connection, question_id: str) -> Optional[QuestionOut]:
    """Fetches a specific question by ID searching across both medqa_usmle and medmcqa banks."""
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
        return None
        
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

