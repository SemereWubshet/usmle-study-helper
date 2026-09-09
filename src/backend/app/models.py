from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# --- Question & Attempt Models ---
class QuestionOut(BaseModel):
    id: str
    question: str
    opa: str
    opb: str
    opc: str
    opd: str
    subject: Optional[str] = None

class AttemptIn(BaseModel):
    question_id: str
    selected_option: int
    time_spent_seconds: int  # New field for the Study Block engine

class AttemptOut(BaseModel):
    question_id: str
    selected_option: int
    correct_option: int
    is_correct: bool
    explanation: Optional[str] = None

# --- Session Models ---
class SessionCreate(BaseModel):
    qbank_name: str = "medmcqa"
    target_count: int = 40  # Standard USMLE block size

class SessionOut(BaseModel):
    session_id: int
    question_ids: List[str]  # The frontend will use this queue to navigate the block

# --- Dashboard Analytics Models ---
class SessionSummary(BaseModel):
    session_id: int
    created_at: datetime
    questions_answered: int
    accuracy_percentage: float

class DashboardOut(BaseModel):
    total_answered: int
    global_accuracy: float
    recent_sessions: List[SessionSummary]