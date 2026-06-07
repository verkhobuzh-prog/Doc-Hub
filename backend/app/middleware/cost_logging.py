"""
AI cost logging — records OpenAI calls in ai_request_logs.

Schema 009 / 002 stub column mapping:
  request_type, prompt_tokens, completion_tokens, trace_id, status, error
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Callable

from app.core.logging import get_logger
from app.db.supabase import run_supabase

logger = get_logger("dochub.cost_logging")

# USD per 1K tokens — https://openai.com/api/pricing/
_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {"input": 0.0025, "output": 0.010},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "text-embedding-3-small": {"input": 0.00002, "output": 0.0},
    "text-embedding-3-large": {"input": 0.00013, "output": 0.0},
    "text-embedding-ada-002": {"input": 0.0001, "output": 0.0},
    "whisper-1": {"input": 0.006, "output": 0.0},
}

_DEFAULT_PRICING = {"input": 0.005, "output": 0.015}


def _calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    base_model = model
    for key in _PRICING:
        if model.startswith(key):
            base_model = key
            break

    pricing = _PRICING.get(base_model, _DEFAULT_PRICING)
    cost = (input_tokens / 1000) * pricing["input"] + (output_tokens / 1000) * pricing["output"]
    return round(cost, 8)


async def _log_to_db(
    *,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    user_id: str | None,
    request_type: str | None,
    latency_ms: int,
    trace_id: str | None,
    status: str,
    error_message: str | None,
) -> None:
    """Insert ai_request_logs row (fail-open on DB errors)."""
    try:
        row = {
            "model": model,
            "request_type": request_type or "unknown",
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost_usd": cost_usd,
            "user_id": None if not user_id or user_id == "system" else user_id,
            "trace_id": trace_id,
            "latency_ms": latency_ms,
            "status": status,
            "error": error_message,
        }
        await run_supabase(lambda sb: sb.table("ai_request_logs").insert(row).execute())
    except Exception as exc:
        logger.warning("Cost logging DB write failed: %s", exc)


async def track_openai_call(
    call: Callable[..., Any],
    *,
    model: str,
    user_id: str | None = None,
    request_type: str | None = None,
    trace_id: str | None = None,
) -> Any:
    """
    Wrap an OpenAI call, log tokens and cost to ai_request_logs.
    DB write is fire-and-forget via asyncio.create_task.
    """
    start_ms = time.monotonic()
    error_message: str | None = None
    response: Any = None
    status = "success"
    input_tokens = 0
    output_tokens = 0

    try:
        if asyncio.iscoroutinefunction(call):
            response = await call()
        else:
            response = await asyncio.to_thread(call)
        return response

    except Exception as exc:
        status = "error"
        error_message = str(exc)[:500]
        raise

    finally:
        latency_ms = int((time.monotonic() - start_ms) * 1000)

        if response is not None:
            usage = getattr(response, "usage", None)
            if usage:
                input_tokens = getattr(usage, "prompt_tokens", 0) or 0
                output_tokens = getattr(usage, "completion_tokens", 0) or 0
                if input_tokens == 0:
                    input_tokens = getattr(usage, "total_tokens", 0) or 0

        cost_usd = _calculate_cost(model, input_tokens, output_tokens)

        logger.info(
            "OpenAI call | model=%s type=%s user=%s tokens=%d+%d cost=$%.6f latency=%dms",
            model,
            request_type or "unknown",
            user_id or "anon",
            input_tokens,
            output_tokens,
            cost_usd,
            latency_ms,
        )

        asyncio.create_task(
            _log_to_db(
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
                user_id=user_id,
                request_type=request_type,
                latency_ms=latency_ms,
                trace_id=trace_id,
                status=status,
                error_message=error_message,
            )
        )
