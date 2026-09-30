from fastapi import APIRouter, HTTPException
from app.models.clinical_graph import ExtractCluesRequest, ClueExtractionResponse
from app.services.clue_extractor import extract_clinical_clues

router = APIRouter(prefix="/api/v1/clinical-graph", tags=["clinical-graph"])


@router.post("/extract-clues", response_model=ClueExtractionResponse)
async def extract_clues_endpoint(request: ExtractCluesRequest):
    """
    Extracts 3 hallmark clinical clues from a vignette leading to the correct answer.
    Uses OpenRouter with Ling 3.0 Flash Santé as primary, falling back seamlessly to Llama/Qwen.
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
