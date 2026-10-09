import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.openrouter_service import call_openrouter_chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Explanation"])


class ExplainQuestionRequest(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    selected_answer: Optional[str] = None
    subject: Optional[str] = None
    user_api_key: Optional[str] = None


class ExplainQuestionResponse(BaseModel):
    explanation: str
    model_used: str


SYSTEM_PROMPT = """You are an elite USMLE medical educator and board specialist attending physician.
Provide a clear, high-yield, and definitive clinical breakdown for this USMLE question.

Formatting Guidelines:
1. **Core Clinical Concept & Pathophysiology**: State the underlying disease mechanism and why this presentation fits in 2-3 concise sentences.
2. **Why the Correct Answer is Right**: Explain the specific diagnostic or management criteria that confirm the correct choice.
3. **High-Yield Distractor Breakdown**: Briefly explain why the other options are incorrect, identifying the classic traps or what clinical scenario would have made each distractor correct.
4. Keep the tone academic, high-yield, and focused on USMLE board principles. Do not repeat the entire vignette."""


@router.post("/api/v1/explain-question", response_model=ExplainQuestionResponse)
async def explain_question(payload: ExplainQuestionRequest):
    """
    Generates an on-demand clinical rationale for questions lacking an official explanation.
    Uses OpenRouter via the local engine.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question text cannot be empty.")
    if not payload.correct_answer.strip():
        raise HTTPException(status_code=400, detail="Correct answer cannot be empty.")

    options_formatted = "\n".join(
        f"{chr(65 + i)}) {opt}" for i, opt in enumerate(payload.options)
    )

    user_attempt_part = ""
    if payload.selected_answer:
        is_correct_str = "(Correct Choice)" if payload.selected_answer == payload.correct_answer else "(Incorrect Choice)"
        user_attempt_part = f"\nStudent Selected Answer: {payload.selected_answer} {is_correct_str}\n"

    subject_part = f"Subject: {payload.subject}\n" if payload.subject else ""

    user_prompt = f"""{subject_part}Clinical Vignette:
{payload.question}

Answer Choices:
{options_formatted}

Correct Answer:
{payload.correct_answer}
{user_attempt_part}
Please provide the high-yield clinical explanation."""

    try:
        explanation, model_used = await call_openrouter_chat(
            prompt=f"{SYSTEM_PROMPT}\n\n{user_prompt}",
            user_api_key=payload.user_api_key,
            temperature=0.2,
        )
        if not explanation:
            raise HTTPException(status_code=502, detail="AI provider returned an empty explanation.")

        return ExplainQuestionResponse(
            explanation=explanation,
            model_used=model_used
        )
    except Exception as e:
        logger.error("Failed to generate AI explanation: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
