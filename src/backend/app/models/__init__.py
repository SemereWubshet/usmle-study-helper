# Expose all models for backwards-compatibility and modular grouping
from app.models.clinical_graph import ExtractCluesRequest, ClueExtractionResponse
from app.models_legacy import (
    QuestionOut,
    AttemptIn,
    AttemptOut,
    SessionCreate,
    SessionOut,
    SessionSummary,
    SubjectPerformance,
    DashboardOut,
    EncyclopediaSection,
    EncyclopediaResponse,
)

__all__ = [
    "ExtractCluesRequest",
    "ClueExtractionResponse",
    "QuestionOut",
    "AttemptIn",
    "AttemptOut",
    "SessionCreate",
    "SessionOut",
    "SessionSummary",
    "SubjectPerformance",
    "DashboardOut",
    "EncyclopediaSection",
    "EncyclopediaResponse",
]
