import sqlite3
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models import AttemptIn, AttemptOut, SessionCreate, SessionOut
from app.services import sessions as sessions_service

router = APIRouter(tags=["Sessions"])


@router.post("/api/v1/sessions/", response_model=SessionOut)
def create_session(request: SessionCreate, db: sqlite3.Connection = Depends(get_db)):
    """Creates a new study session with randomized questions according to user filters."""
    session_out = sessions_service.create_session(db=db, request=request)
    if not session_out:
        raise HTTPException(status_code=400, detail="No questions match the selected filters.")
    return session_out


@router.post("/api/v1/sessions/{session_id}/attempt", response_model=AttemptOut)
def record_attempt(
    session_id: int,
    attempt: AttemptIn,
    db: sqlite3.Connection = Depends(get_db)
):
    """Evaluates the answer, records time spent, and logs it to the specific session."""
    attempt_out, err = sessions_service.record_session_attempt(
        db=db, session_id=session_id, attempt=attempt
    )
    if err:
        raise HTTPException(status_code=404, detail=err)
    return attempt_out


@router.post("/api/v1/sessions/{session_id}/complete")
def complete_session(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Marks a session as completed in the profile database."""
    sessions_service.complete_session(db=db, session_id=session_id)
    return {"status": "completed", "session_id": session_id}


@router.get("/api/v1/sessions/{session_id}/review")
def get_session_review(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Reconstructs the full questions and student attempt data for reviewing a past session."""
    review_data = sessions_service.get_session_review(db=db, session_id=session_id)
    if not review_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return review_data


@router.post("/api/v1/sessions/{session_id}/retry", response_model=SessionOut)
def retry_session(session_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Creates a brand new study session containing the exact same questions from a past session."""
    session_out, err = sessions_service.retry_session(db=db, session_id=session_id)
    if err:
        if err == "Session not found":
            raise HTTPException(status_code=404, detail=err)
        raise HTTPException(status_code=400, detail=err)
    return session_out

