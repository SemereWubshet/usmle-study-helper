from typing import List, Optional
from fastapi import APIRouter, Query
from app.models import EncyclopediaResponse
from app.services.encyclopedia import fetch_medlineplus_topic
from app.services.openfda import fetch_openfda_drug
from app.services.rxnorm import fetch_rxnorm_drug
from app.services.statpearls import fetch_statpearls_topic

router = APIRouter(tags=["Encyclopedia / MedSearch"])


@router.get("/api/v1/encyclopedia", response_model=List[EncyclopediaResponse])
def get_encyclopedia(
    term: str = Query(..., min_length=2, description="Clinical term or drug to search"),
    source: Optional[str] = Query("medlineplus", description="Provider: medlineplus | statpearls | openfda | rxnorm")
):
    """
    Modular MedSearch provider hub:
    - medlineplus: Consumer-friendly disease/condition summaries (NIH)
    - statpearls: Peer-reviewed clinical pathophysiology & board review (NCBI)
    - openfda: Official FDA drug labeling, boxed warnings, & indications
    - rxnorm: Normalized clinical drug names, brands, & strengths (NLM)
    """
    clean_term = term.strip()
    if len(clean_term) < 2:
        return []

    src = (source or "medlineplus").lower().strip()

    if src == "openfda":
        return fetch_openfda_drug(clean_term)
    elif src == "rxnorm":
        return fetch_rxnorm_drug(clean_term)
    elif src == "statpearls":
        return fetch_statpearls_topic(clean_term)
    else:
        return fetch_medlineplus_topic(clean_term)

