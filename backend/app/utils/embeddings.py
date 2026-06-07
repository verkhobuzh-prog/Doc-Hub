"""Embedding generation via OpenAI API."""

from __future__ import annotations

from typing import List

from openai import OpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.utils.cost_logging import track_openai_call

logger = get_logger("dochub.embeddings")


async def embed_texts(
    texts: list[str],
    user_id: str | None = None,
    request_id: str | None = None,
) -> list[list[float] | None]:
    """
    Batch-embed texts. Returns None per item when OpenAI is not configured.
    """
    if not texts:
        return []

    if not settings.openai_configured:
        logger.warning("OPENAI_API_KEY not set — skipping embeddings")
        return [None] * len(texts)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = await track_openai_call(
        lambda: client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=texts,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        ),
        model=settings.EMBEDDING_MODEL,
        user_id=user_id or "system",
        operation="embed_chunks",
        trace_id=request_id,
    )
    return [item.embedding for item in response.data]
