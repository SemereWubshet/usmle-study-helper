import sqlite3
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import get_db
from .models import AnalyticsOut, AttemptIn, AttemptOut, QuestionOut

app = FastAPI(title="USMLE Study Helper API", version="0.1.0")

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/v1/questions/next", response_model=QuestionOut)
def get_next_question(db: sqlite3.Connection = Depends(get_db)):
    """Fetch an uncompleted question randomly."""
    cursor = db.cursor()
    query = """
        SELECT id, question, opa, opb, opc, opd, subject
        FROM bank_questions
        WHERE id NOT IN (SELECT question_id FROM user_history)
        ORDER BY RANDOM()
        LIMIT 1;
    """
    row = cursor.execute(query).fetchone()

    # Fallback to any random question if all have been attempted
    if not row:
        row = cursor.execute(
            """
            SELECT id, question, opa, opb, opc, opd, subject
            FROM bank_questions
            ORDER BY RANDOM()
            LIMIT 1;
        """
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=404, detail="No questions found in database."
        )

    return dict(row)


@app.post("/api/v1/questions/{question_id}/attempt", response_model=AttemptOut)
def record_attempt(
    question_id: str,
    attempt: AttemptIn,
    db: sqlite3.Connection = Depends(get_db),
):
    """Evaluate user answer, persist attempt in history, and return rationale."""
    cursor = db.cursor()

    row = cursor.execute(
        """
        SELECT correct_option, explanation
        FROM bank_questions
        WHERE id = ?;
    """,
        (question_id,),
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Question not found.")

    correct_option = int(row["correct_option"])
    is_correct = attempt.selected_option == correct_option

    cursor.execute(
        """
        INSERT INTO user_history (question_id, selected_option, is_correct)
        VALUES (?, ?, ?);
    """,
        (question_id, attempt.selected_option, is_correct),
    )
    db.commit()

    return AttemptOut(
        question_id=question_id,
        selected_option=attempt.selected_option,
        correct_option=correct_option,
        is_correct=is_correct,
        explanation=row["explanation"],
    )


@app.get("/api/v1/analytics/overview", response_model=AnalyticsOut)
def get_analytics(db: sqlite3.Connection = Depends(get_db)):
    """Calculate progress and accuracy."""
    cursor = db.cursor()

    row = cursor.execute(
        """
        SELECT 
            COUNT(*) as total_answered,
            COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0) as total_correct
        FROM user_history;
    """
    ).fetchone()

    total_answered = row["total_answered"]
    total_correct = row["total_correct"]
    accuracy = (
        (total_correct / total_answered * 100.0) if total_answered > 0 else 0.0
    )

    return AnalyticsOut(
        total_answered=total_answered,
        total_correct=total_correct,
        accuracy_percentage=round(accuracy, 2),
    )