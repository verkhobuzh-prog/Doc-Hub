"""Tests for document_ids scoping in hybrid retrieval and chat endpoint."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

from app.schemas.chat import ChatResponse, Citation, Source
from app.services.rag_service import RAGService
from app.utils.retrieval import _get_allowed_document_ids, hybrid_search


@pytest.mark.asyncio
async def test_get_allowed_document_ids_scoped(monkeypatch):
    """When document_ids is set, Supabase query must filter with in_."""
    doc1 = uuid4()
    doc2 = uuid4()
    captured: dict[str, list[str]] = {}

    class QueryChain:
        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def is_(self, *_args, **_kwargs):
            return self

        def in_(self, _field, ids):
            captured["in_ids"] = ids
            return self

        def execute(self):
            return MagicMock(data=[{"id": str(doc1)}, {"id": str(doc2)}])

    mock_client = MagicMock()
    mock_client.table.return_value = QueryChain()
    monkeypatch.setattr("app.utils.retrieval.get_supabase", lambda: mock_client)
    monkeypatch.setattr(
        "app.utils.retrieval.run_supabase",
        lambda fn: fn(),
    )

    allowed = await _get_allowed_document_ids("user-1", [doc1, doc2])

    assert captured["in_ids"] == [str(doc1), str(doc2)]
    assert allowed == [str(doc1), str(doc2)]


@pytest.mark.asyncio
async def test_get_allowed_document_ids_unscoped(monkeypatch):
    """Without document_ids, in_ filter must not be applied."""
    called_in = False

    class QueryChain:
        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def is_(self, *_args, **_kwargs):
            return self

        def in_(self, *_args, **_kwargs):
            nonlocal called_in
            called_in = True
            return self

        def execute(self):
            return MagicMock(data=[{"id": str(uuid4())}])

    mock_client = MagicMock()
    mock_client.table.return_value = QueryChain()
    monkeypatch.setattr("app.utils.retrieval.get_supabase", lambda: mock_client)
    monkeypatch.setattr(
        "app.utils.retrieval.run_supabase",
        lambda fn: fn(),
    )

    await _get_allowed_document_ids("user-1", None)

    assert called_in is False


@pytest.mark.asyncio
async def test_hybrid_search_sql_where_includes_scoped_doc_ids(monkeypatch):
    """SQL hybrid path must pass allowed doc IDs into WHERE d.id = ANY(...)."""
    doc1 = uuid4()
    doc2 = uuid4()
    captured: dict[str, object] = {}

    class MockConn:
        async def fetch(self, sql, *args):
            captured["sql"] = sql
            captured["args"] = args
            return []

    class MockAcquire:
        async def __aenter__(self):
            return MockConn()

        async def __aexit__(self, *_args):
            return False

    mock_pool = MagicMock()
    mock_pool.acquire.return_value = MockAcquire()

    monkeypatch.setattr("app.utils.retrieval.get_pool", lambda: mock_pool)
    monkeypatch.setattr(
        "app.utils.retrieval._get_allowed_document_ids",
        AsyncMock(return_value=[str(doc1), str(doc2)]),
    )

    await hybrid_search(
        "lease terms",
        "user-1",
        [0.1] * 8,
        document_ids=[doc1, doc2],
        top_k=5,
    )

    sql = str(captured["sql"])
    assert "d.id = ANY($3::uuid[])" in sql
    assert captured["args"][2] == [str(doc1), str(doc2)]


def test_chat_endpoint_passes_document_ids(auth_client, monkeypatch, sample_document_id):
    """POST /api/v1/chat forwards document_ids to RAGService.query."""
    doc1 = uuid4()
    doc2 = uuid4()
    captured: dict[str, list[UUID] | None] = {}

    async def capturing_query(
        self,
        *,
        query,
        user_id,
        document_ids=None,
        top_k=None,
    ):
        captured["document_ids"] = document_ids
        return ChatResponse(
            answer=f"Answer: {query}",
            sources=[
                Source(
                    document_id=sample_document_id,
                    chunk_index=0,
                    snippet="snippet",
                    score=0.9,
                )
            ],
            citations=[
                Citation(
                    document_id=sample_document_id,
                    chunk_index=0,
                    snippet="snippet",
                    label="[1]",
                )
            ],
            model="gpt-4o-mini",
            query=query,
        )

    monkeypatch.setattr(RAGService, "query", capturing_query)

    response = auth_client.post(
        "/api/v1/chat",
        json={
            "query": "What is in my documents?",
            "document_ids": [str(doc1), str(doc2)],
        },
    )

    assert response.status_code == 200
    assert captured["document_ids"] is not None
    assert len(captured["document_ids"]) == 2
    assert {str(d) for d in captured["document_ids"]} == {str(doc1), str(doc2)}


def test_chat_endpoint_without_document_ids(auth_client, monkeypatch, sample_document_id):
    """Omitting document_ids keeps backward-compatible all-docs behavior."""
    captured: dict[str, list[UUID] | None] = {}

    async def capturing_query(
        self,
        *,
        query,
        user_id,
        document_ids=None,
        top_k=None,
    ):
        captured["document_ids"] = document_ids
        return ChatResponse(
            answer="Answer",
            sources=[],
            citations=[],
            model="gpt-4o-mini",
            query=query,
        )

    monkeypatch.setattr(RAGService, "query", capturing_query)

    response = auth_client.post(
        "/api/v1/chat",
        json={"query": "What is in my documents?"},
    )

    assert response.status_code == 200
    assert captured["document_ids"] is None
