import json
import re
import logging
from typing import List, Optional
from app.models.clinical_graph import ClueExtractionResponse
from app.services.openrouter_service import call_openrouter_chat
from app.core.config import PRIMARY_CLUE_MODEL

logger = logging.getLogger(__name__)

BANNED_CLUE_TERMS = {
    "sudden onset", "acute", "chronic", "severe", "mild", "moderate",
    "unremarkable", "history", "presentation", "physical exam", "exam"
}


def build_clue_extraction_prompt(vignette: str, correct_answer: str) -> str:
    """Builds a prompt enforcing strictly medical findings/signs matching notebook prompt."""
    return f"""You are a USMLE Pathophysiology Expert.
Given this medical vignette and the correct diagnosis/answer, extract the 3 most salient CLINICAL FINDINGS (hallmark symptoms, physical exam signs, anatomical locations, or abnormal lab/ECG findings) that lead directly to the diagnosis.

Strict Rules:
1. ONLY return specific medical entities (e.g. "chest pain", "diaphoresis", "ST segment elevation", "podagra", "nuchal rigidity").
2. DO NOT return generic modifiers or temporal adjectives (e.g. NEVER return "sudden onset", "acute", "chronic", "severe", "elderly").
3. Normalize physical exam descriptions into canonical clinical signs (e.g. neck flexion causing hip flexion -> "Brudzinski sign").
4. Return ONLY a JSON list of 3 strings. No markdown fences, no explanations.

VIGNETTE:
{vignette}

CORRECT ANSWER:
{correct_answer}

JSON:"""


def parse_and_clean_clues(raw_content: str) -> List[str]:
    """Cleans LLM response and extracts valid medical clue strings."""
    logger.info("Raw content received by parser: %r", raw_content)
    clean_text = raw_content.strip()

    # Strip markdown code fences if present
    if "```" in clean_text:
        parts = clean_text.split("```")
        if len(parts) >= 2:
            clean_text = parts[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:].strip()

    # Search for JSON bracket slice [ ... ]
    start_idx = clean_text.find("[")
    end_idx = clean_text.rfind("]")
    parsed = []

    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_substr = clean_text[start_idx : end_idx + 1]
        try:
            parsed = json.loads(json_substr)
        except Exception as e:
            logger.warning("Failed to parse JSON bracket substring: %s", e)

    # Fallback to direct json.loads
    if not parsed:
        try:
            parsed = json.loads(clean_text)
        except Exception:
            parsed = []

    if not isinstance(parsed, list):
        return []

    valid_clues = []
    for item in parsed:
        if isinstance(item, str):
            val = item.strip().strip('"').strip("'")
            if val and val.lower() not in BANNED_CLUE_TERMS and len(val) >= 2:
                valid_clues.append(val)

    logger.info("Parsed valid clues: %r", valid_clues)
    return valid_clues


async def extract_clinical_clues(
    vignette: str,
    correct_answer: str,
    user_api_key: Optional[str] = None
) -> ClueExtractionResponse:
    """
    Coordinates LLM clue extraction with automatic model fallback and validation.
    """
    prompt = build_clue_extraction_prompt(vignette, correct_answer)
    raw_content, model_used = await call_openrouter_chat(
        prompt=prompt,
        user_api_key=user_api_key,
        temperature=0.1,
    )

    if not raw_content:
        return ClueExtractionResponse(
            clues=[],
            model_used=model_used,
            status="failed",
            raw_count=0,
        )

    clues = parse_and_clean_clues(raw_content)
    status = "success" if model_used == PRIMARY_CLUE_MODEL else "fallback"

    return ClueExtractionResponse(
        clues=clues,
        model_used=model_used,
        status=status,
        raw_count=len(clues),
    )

