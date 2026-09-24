import sqlite3
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import QuestionOut
from app.services import questions as questions_service

router = APIRouter(tags=["Questions"])


@router.get("/api/v1/subjects")
def get_available_subjects(
    qbank: str = "medqa_usmle",
    exam_type: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Returns available subjects and their question counts for a qbank and optional exam_type."""
    return questions_service.get_available_subjects(db=db, qbank=qbank, exam_type=exam_type)


@router.get("/api/v1/questions/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Fetches a specific question by ID from either cartridge for the active session."""
    q = questions_service.get_question_by_id(db=db, question_id=question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q

