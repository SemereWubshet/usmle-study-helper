from fastapi import APIRouter, HTTPException
from app.models.clinical_graph import (
    ExtractCluesRequest,
    ClueExtractionResponse,
    BuildGraphRequest,
    ClinicalGraphResponse,
)
from app.services.clue_extractor import extract_clinical_clues
from app.services.graph_service import build_convergence_graph

router = APIRouter(prefix="/api/v1/clinical-graph", tags=["clinical-graph"])


@router.post("/extract-clues", response_model=ClueExtractionResponse)
async def extract_clues_endpoint(request: ExtractCluesRequest):
    """
    Extracts 3 hallmark clinical clues from a vignette leading to the correct answer.
    Uses OpenRouter with Ling 3.0 Flash Santé as primary, falling back to Mistral/Auto.
    """
    try:
        response = await extract_clinical_clues(
            vignette=request.vignette,
            correct_answer=request.correct_answer,
            user_api_key=request.api_key,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract clinical clues: {str(e)}")


@router.post("/build-graph", response_model=ClinicalGraphResponse)
def build_graph_endpoint(request: BuildGraphRequest):
    """
    Builds the pathophysiological convergence graph connecting clues to target diagnosis.
    Returns both the linear path chains and the full node/edge graph with background halo.
    """
    try:
        response = build_convergence_graph(request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build clinical graph: {str(e)}")
