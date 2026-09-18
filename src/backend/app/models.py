import json
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator

# --- Question & Attempt Models ---
class QuestionOut(BaseModel):
    id: str
    question: str
    options: List[str]
    subject: Optional[str] = None
    explanation: Optional[str] = None
    correct_text: Optional[str] = None
    exam_type: Optional[str] = None
    metamap_phrases: Optional[List[str]] = None

    @field_validator("metamap_phrases", mode="before")
    @classmethod
    def parse_metamap(cls, v):
        """Automatically deserializes SQLite JSON strings into Python lists."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

class AttemptIn(BaseModel):
    question_id: str
    selected_option: int
    time_spent_seconds: int

class AttemptOut(BaseModel):
    question_id: str
    selected_option: int
    correct_option: int
    is_correct: bool
    explanation: Optional[str] = None

# --- Session Models ---
class SessionCreate(BaseModel):
    qbank: str = "medqa_usmle"
    block_size: int = 40
    subjects: Optional[List[str]] = None
    exam_type: Optional[str] = None

class SessionOut(BaseModel):
    session_id: int
    qbank: str
    question_ids: List[str]
    questions: List[QuestionOut]

# --- Dashboard Analytics Models ---
class SessionSummary(BaseModel):
    session_id: int
    created_at: datetime
    questions_answered: int
    accuracy_percentage: float
    average_time_seconds: float
    qbank: str
    scope: str

class SubjectPerformance(BaseModel):
    subject: str
    total_answered: int
    accuracy_percentage: float
    exam_group: Optional[str] = None

class DashboardOut(BaseModel):
    total_answered: int
    global_accuracy: float
    recent_sessions: List[SessionSummary]
    subject_performance: List[SubjectPerformance]

# --- Encyclopedia / MedlinePlus Models ---
class EncyclopediaSection(BaseModel):
    heading: str
    body: str
    clean_text: str

class EncyclopediaResponse(BaseModel):
    title: str
    url: str
    summary: str
    alt_titles: List[str] = []
    sections: List[EncyclopediaSection] = []