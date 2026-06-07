"""Rate limit middleware tests (C7 audit)."""

from __future__ import annotations

import time
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.rate_limit import RateLimitMiddleware


class _FakeRedisPipeline:
    """Minimal in-memory sliding-window fake for Redis sorted-set ops."""

    def __init__(self, store: dict[str, dict[str, float]], window: int) -> None:
        self._store = store
        self._window = window
        self._key: str | None = None
        self._now = time.time()
        self._zcard_result = 0

    def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> _FakeRedisPipeline:
        self._key = key
        entries = self._store.get(key, {})
        window_start = self._now - self._window
        self._store[key] = {
            member: score
            for member, score in entries.items()
            if score > window_start
        }
        return self

    def zcard(self, key: str) -> _FakeRedisPipeline:
        self._key = key
        self._zcard_result = len(self._store.get(key, {}))
        return self

    def zadd(self, key: str, mapping: dict[str, float]) -> _FakeRedisPipeline:
        self._key = key
        bucket = self._store.setdefault(key, {})
        bucket.update(mapping)
        return self

    def expire(self, key: str, ttl: int) -> _FakeRedisPipeline:
        return self

    async def execute(self) -> list:
        return [0, self._zcard_result, True, True]


class _FakeRedis:
    def __init__(self, window: int = 60) -> None:
        self._store: dict[str, dict[str, float]] = {}
        self._window = window

    def pipeline(self) -> _FakeRedisPipeline:
        return _FakeRedisPipeline(self._store, self._window)

    async def zrange(self, key: str, start: int, end: int, withscores: bool = False):
        entries = sorted(self._store.get(key, {}).items(), key=lambda item: item[1])
        if not entries:
            return []
        oldest = entries[0]
        return [(oldest[0], oldest[1])] if withscores else [oldest[0]]

    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> None:
        entries = self._store.get(key, {})
        self._store[key] = {
            member: score
            for member, score in entries.items()
            if not (min_score <= score <= max_score)
        }


@pytest.fixture
def rate_limited_app():
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.get("/api/v1/ping")
    async def ping():
        return {"ok": True}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    fake_redis = _FakeRedis()

    with (
        patch("app.middleware.rate_limit.settings.RATE_LIMIT_PER_MINUTE", 60),
        patch("app.middleware.rate_limit._get_redis_client", lambda: fake_redis),
    ):
        with TestClient(app) as client:
            yield client, fake_redis


def test_rate_limit_exempt_health(rate_limited_app):
    client, _ = rate_limited_app

    for _ in range(100):
        response = client.get("/health")
        assert response.status_code == 200


def test_rate_limit_blocks_61st_request(rate_limited_app):
    """Default limit 60/min — the 61st request to a rate-limited path returns 429."""
    client, _ = rate_limited_app

    for index in range(1, 61):
        response = client.get("/api/v1/ping")
        assert response.status_code == 200, f"request {index} should pass"
        assert "X-RateLimit-Limit" in response.headers

    blocked = client.get("/api/v1/ping")
    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After") is not None
    assert blocked.headers.get("Retry-After").isdigit()
    assert blocked.headers["X-RateLimit-Remaining"] == "0"
    assert blocked.json()["error"] == "Too Many Requests"


def test_rate_limit_fail_open_when_redis_unavailable():
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.get("/api/v1/ping")
    async def ping():
        return {"ok": True}

    with patch("app.middleware.rate_limit._get_redis_client", lambda: None):
        with TestClient(app) as client:
            for _ in range(70):
                response = client.get("/api/v1/ping")
                assert response.status_code == 200
