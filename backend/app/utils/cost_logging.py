from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger(__name__)

# USD per 1K tokens (2025 pricing)
_PRICE_TABLE: dict[str, dict[str, float]] = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4o-mini": {"input": 0.000150, "output": 0.000600},
    "gpt-4-turbo": {"input": 0.010, "output": 0.030},
    "gpt-4": {"input": 0.030, "output": 0.060},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "text-embedding-3-large": {"input": 0.000130, "output": 0.0},
    "text-embedding-3-small": {"input": 0.000020, "output": 0.0},
    "text-embedding-ada-002": {"input": 0.000100, "output": 0.0},
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    key = next((k for k in _PRICE_TABLE if model.startswith(k)), None)
    if not key:
        return 0.0
    prices = _PRICE_TABLE[key]
    return (
        prompt_tokens * prices["input"] / 1000
        + completion_tokens * prices["output"] / 1000
    )


def _normalize_user_id(user_id: str | None) -> str | None:
    if not user_id or user_id == "system":
        return None
    return user_id


async def _write_log(
    user_id: str | None,
    operation: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: float,
    latency_ms: int,
    status: str = "ok",
    error: str | None = None,
    trace_id: str | None = None,
) -> None:
    try:
        from app.db.supabase import get_supabase, run_supabase

        client = get_supabase()
        row = {
            "user_id": _normalize_user_id(user_id),
            "operation": operation,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost_usd": round(cost_usd, 8),
            "latency_ms": latency_ms,
            "status": status,
            "error": error,
            "trace_id": trace_id,
        }

        def _insert():
            return client.table("ai_request_logs").insert(row).execute()

        await run_supabase(_insert)
    except Exception as exc:
        logger.warning("cost_log_write_failed: %s", exc)


async def _await_call(target: Awaitable[Any] | Callable[..., Any]) -> Any:
    if isinstance(target, Awaitable):
        return await target
    if asyncio.iscoroutinefunction(target):
        return await target()
    return await asyncio.to_thread(target)


async def track_openai_call(
    coro: Awaitable[Any] | Callable[..., Any],
    *,
    model: str,
    user_id: str,
    operation: str,
    trace_id: str | None = None,
) -> Any:
    """
    Wrap any OpenAI awaitable or sync callable.
    Fire-and-forget DB write — does not block the response path.
    """
    start = time.monotonic()
    status = "ok"
    error: str | None = None
    prompt_tokens = 0
    completion_tokens = 0
    response: Any = None

    try:
        response = await _await_call(coro)
        if hasattr(response, "usage") and response.usage:
            prompt_tokens = getattr(response.usage, "prompt_tokens", 0) or 0
            completion_tokens = getattr(response.usage, "completion_tokens", 0) or 0
            if prompt_tokens == 0:
                prompt_tokens = getattr(response.usage, "total_tokens", 0) or 0
        return response
    except Exception as exc:
        status = "error"
        error = str(exc)[:500]
        raise
    finally:
        latency_ms = int((time.monotonic() - start) * 1000)
        cost = calculate_cost(model, prompt_tokens, completion_tokens)
        asyncio.create_task(
            _write_log(
                user_id=user_id,
                operation=operation,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_usd=cost,
                latency_ms=latency_ms,
                status=status,
                error=error,
                trace_id=trace_id,
            )
        )
