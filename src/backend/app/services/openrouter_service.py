import json
import logging
import httpx
from typing import Tuple, List, Optional
from app.core.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_API_URL,
    PRIMARY_CLUE_MODEL,
    FALLBACK_CLUE_MODELS,
    DEFAULT_HTTP_HEADERS,
)

logger = logging.getLogger(__name__)


async def call_openrouter_chat(
    prompt: str,
    user_api_key: Optional[str] = None,
    temperature: float = 0.1,
) -> Tuple[Optional[str], str]:
    """
    Sends a chat completion request to OpenRouter using an async HTTP client.
    Attempts PRIMARY_CLUE_MODEL first, then cascades through FALLBACK_CLUE_MODELS.

    Returns:
        (raw_response_content, model_name_used)
    """
    effective_api_key = (user_api_key or "").strip() or OPENROUTER_API_KEY.strip()
    if not effective_api_key:
        raise ValueError("OpenRouter API key is required. Set OPENROUTER_API_KEY or provide an api_key in the request.")

    models_to_try: List[str] = [PRIMARY_CLUE_MODEL] + [
        m for m in FALLBACK_CLUE_MODELS if m != PRIMARY_CLUE_MODEL
    ]

    headers = {
        **DEFAULT_HTTP_HEADERS,
        "Authorization": f"Bearer {effective_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "USMLE Study Helper",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                # "max_tokens": 400,
            }

            try:
                response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        msg = choices[0]["message"]
                        raw_content = msg.get("content") or ""
                        reasoning = msg.get("reasoning") or ""
                        logger.info("OpenRouter model '%s' responded. Content: %r, Reasoning: %r", model, raw_content, reasoning)
                        
                        text = raw_content.strip() or reasoning.strip()
                        if text:
                            resolved_model = data.get("model", model)
                            return text, resolved_model
                else:
                    logger.warning(
                        "OpenRouter model '%s' failed with HTTP %d: %s",
                        model,
                        response.status_code,
                        response.text[:200],
                    )
            except Exception as e:
                logger.warning("Error querying OpenRouter model '%s': %s", model, str(e))
                last_error = e

        if last_error:
            raise RuntimeError(f"All OpenRouter candidate models failed. Last error: {last_error}")
        raise RuntimeError("All OpenRouter candidate models failed to return valid completions.")

