from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ExtractCluesRequest(BaseModel):
    vignette: str = Field(..., min_length=5, description="Full text of the clinical vignette")
    correct_answer: str = Field(..., min_length=1, description="The correct answer diagnosis or medical option")
    api_key: Optional[str] = Field(None, description="Optional user-provided OpenRouter API key")


class ClueExtractionResponse(BaseModel):
    clues: List[str] = Field(default_factory=list, description="Extracted hallmark clinical findings")
    model_used: str = Field(..., description="The LLM model that fulfilled the request")
    status: Literal["success", "fallback", "failed"] = Field(..., description="Status of the extraction")
    raw_count: int = Field(..., description="Number of valid clues extracted")
