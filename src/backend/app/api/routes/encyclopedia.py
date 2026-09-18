from typing import List
from fastapi import APIRouter
from app.models import EncyclopediaResponse
from app.services.encyclopedia import fetch_medlineplus_topic

router = APIRouter(tags=["Encyclopedia"])


@router.get("/api/v1/encyclopedia", response_model=List[EncyclopediaResponse])
def get_encyclopedia(term: str):
    """Fetch concise topic encyclopedia entries from MedlinePlus (NIH)."""
    if not term or len(term.strip()) < 2:
        return []
    return fetch_medlineplus_topic(term.strip())

