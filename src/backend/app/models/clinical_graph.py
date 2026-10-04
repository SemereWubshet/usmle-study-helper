from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


# --- Clue Extraction Models ---
class ExtractCluesRequest(BaseModel):
    vignette: str = Field(..., min_length=5, description="Full text of the clinical vignette")
    correct_answer: str = Field(..., min_length=1, description="The correct answer diagnosis or medical option")
    api_key: Optional[str] = Field(None, description="Optional user-provided OpenRouter API key")


class ClueExtractionResponse(BaseModel):
    clues: List[str] = Field(default_factory=list, description="Extracted hallmark clinical findings")
    model_used: str = Field(..., description="The LLM model that fulfilled the request")
    status: Literal["success", "fallback", "failed"] = Field(..., description="Status of the extraction")
    raw_count: int = Field(..., description="Number of valid clues extracted")


# --- Graph & Path Convergence Models ---
class GraphNode(BaseModel):
    id: str = Field(..., description="Unique node CUI identifier")
    label: str = Field(..., description="Canonical human-readable medical concept name")
    type: Literal["clue", "intermediate", "target", "halo"] = Field(..., description="Node role in the clinical visualization")
    is_primary: bool = Field(True, description="True if on active convergence highway, False for faint background halo")


class GraphEdge(BaseModel):
    source: str = Field(..., description="Source node CUI identifier")
    target: str = Field(..., description="Target node CUI identifier")
    relation: str = Field("associated_with", description="Clinical relation predicate")
    is_primary: bool = Field(True, description="True if part of active convergence path, False for halo context")


class PathStep(BaseModel):
    from_id: str
    from_name: str
    relation: str
    to_id: str
    to_name: str


class CluePath(BaseModel):
    clue: str
    found: bool
    resolved_id: Optional[str] = None
    resolved_name: Optional[str] = None
    steps: List[PathStep] = Field(default_factory=list)


class BuildGraphRequest(BaseModel):
    clues: List[str] = Field(..., min_length=1, description="List of clinical clues/symptoms")
    target: str = Field(..., min_length=1, description="Target diagnosis or medical answer choice")
    include_halo: bool = Field(True, description="Whether to include 1-hop background stars/context")


class ClinicalGraphResponse(BaseModel):
    target_resolved: Dict[str, str] = Field(..., description="Resolved CUI and canonical name for target")
    paths: List[CluePath] = Field(default_factory=list, description="Linear step chains for each clue")
    nodes: List[GraphNode] = Field(default_factory=list, description="All unique nodes for visualization")
    edges: List[GraphEdge] = Field(default_factory=list, description="All unique edges with relations")
    stats: Dict[str, Any] = Field(default_factory=dict, description="Summary statistics")
