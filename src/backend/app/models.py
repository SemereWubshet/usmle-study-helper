from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class QuestionOut(BaseModel):
    id: str
    question: str
    opa: str
    opb: str
    opc: str
    opd: str
    subject: Optional[str] = None


class AttemptIn(BaseModel):
    selected_option: int  # 1, 2, 3, or 4 (or 0-3 depending on choice mapping)


class AttemptOut(BaseModel):
    question_id: str
    selected_option: int
    correct_option: int
    is_correct: bool
    explanation: Optional[str] = None


class AnalyticsOut(BaseModel):
    total_answered: int
    total_correct: int
    accuracy_percentage: float