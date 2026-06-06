"""Unit tests for Time Machine valid-time logic and tenant isolation."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.schemas.time_machine import TimeMachineSnapshotResponse
from app.services import time_machine_service as tm
from app.services.time_machine_service import TimeMachineService


def _doc_row(
    filename: str,
    *,
    valid_from: str | None = None,
    valid_to: str | None = None,
    supersedes: str | None = None,
    doc_id: str | None = None,
) -> dict:
    return {
        "id": doc_id or str(uuid4()),
        "filename": filename,
        "title": filename,
        "status": "indexed",
        "size_bytes": 100,
        "valid_from": valid_from,
        "valid_to": valid_to,
        "supersedes_doc_id": supersedes,
        "created_at": valid_from or "2026-01-01T00:00:00+00:00",
        "metadata": {},
    }


@pytest.mark.asyncio
async def test_snapshot_at_returns_valid_subset(monkeypatch):
    """Only documents passing valid_time filter are returned."""
    user_id = uuid4()
    as_of = datetime(2026, 3, 15, tzinfo=timezone.utc)

    monkeypatch.setattr(tm, "_fetch_valid_at_postgres", AsyncMock(return_value=[]))
    monkeypatch.setattr(
        tm,
        "_fetch_valid_at_supabase",
        AsyncMock(
            return_value=[
                tm._row_to_document(_doc_row("NDA_v2.pdf", valid_from="2026-02-01T00:00:00+00:00")),
            ]
        ),
    )

    docs = await tm._snapshot_at_impl(user_id, as_of)
    assert len(docs) == 1
    assert docs[0].filename == "NDA_v2.pdf"


@pytest.mark.asyncio
async def test_snapshot_at_different_dates(monkeypatch):
    """Earlier as_of date returns fewer documents than later date."""
    user_id = uuid4()
    early = datetime(2026, 1, 15, tzinfo=timezone.utc)
    late = datetime(2026, 5, 15, tzinfo=timezone.utc)

    doc_static = tm._row_to_document(_doc_row("LOI.pdf"))
    doc_nda = tm._row_to_document(
        _doc_row("NDA_v3.pdf", valid_from="2026-04-01T00:00:00+00:00")
    )

    async def fake_fetch(_uid: str, as_of: datetime):
        docs = [doc_static]
        if as_of >= datetime(2026, 4, 1, tzinfo=timezone.utc):
            docs.append(doc_nda)
        return docs

    monkeypatch.setattr(tm, "_fetch_valid_at_postgres", fake_fetch)
    monkeypatch.setattr(tm, "_fetch_valid_at_supabase", AsyncMock(return_value=[]))

    early_docs = await tm._snapshot_at_impl(user_id, early)
    late_docs = await tm._snapshot_at_impl(user_id, late)

    assert len(early_docs) == 1
    assert len(late_docs) == 2


@pytest.mark.asyncio
async def test_diff_between_classifies_added_removed_superseded(monkeypatch):
    user_id = uuid4()
    t1 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    t2 = datetime(2026, 6, 1, tzinfo=timezone.utc)

    old_id = uuid4()
    new_id = uuid4()
    doc_old = tm._row_to_document(_doc_row("NDA_v1.pdf", doc_id=str(old_id)))
    doc_new = tm._row_to_document(
        _doc_row("NDA_v2.pdf", doc_id=str(new_id), supersedes=str(old_id))
    )
    doc_static = tm._row_to_document(_doc_row("LOI.pdf"))

    async def fake_snapshot(_uid, as_of):
        if as_of == t1:
            return [doc_static, doc_old]
        return [doc_static, doc_new]

    monkeypatch.setattr(tm, "_snapshot_at_impl", fake_snapshot)
    monkeypatch.setattr(
        tm,
        "_superseded_in_range",
        AsyncMock(return_value=[doc_old]),
    )

    diff = await tm._diff_between_impl(user_id, t1, t2)

    assert len(diff.added) == 1
    assert diff.added[0].filename == "NDA_v2.pdf"
    assert len(diff.removed) == 1
    assert diff.removed[0].filename == "NDA_v1.pdf"
    assert len(diff.superseded) == 1
    assert len(diff.superseded_pairs) == 1
    assert diff.superseded_pairs[0].old.id == old_id
    assert diff.superseded_pairs[0].new.id == new_id


@pytest.mark.asyncio
async def test_snapshot_passes_user_id_to_fetch(monkeypatch):
    """JWT user_id must flow into retrieval (tenant scoping)."""
    user_a = uuid4()
    user_b = uuid4()
    captured: dict[str, str] = {}

    async def capture_postgres(user_id: str, _as_of: datetime):
        captured["user_id"] = user_id
        return []

    monkeypatch.setattr(tm, "_fetch_valid_at_postgres", capture_postgres)
    monkeypatch.setattr(tm, "_fetch_valid_at_supabase", AsyncMock(return_value=[]))

    await tm._snapshot_at_impl(user_a, datetime(2026, 3, 1, tzinfo=timezone.utc))
    assert captured["user_id"] == str(user_a)

    captured.clear()
    await tm._snapshot_at_impl(user_b, datetime(2026, 3, 1, tzinfo=timezone.utc))
    assert captured["user_id"] == str(user_b)
    assert captured["user_id"] != str(user_a)


@pytest.mark.asyncio
async def test_cross_tenant_isolation_via_user_filter(monkeypatch):
    """User A fetch must not reuse User B scoped results."""
    user_a = str(uuid4())
    user_b = str(uuid4())
    doc_a = tm._row_to_document(_doc_row("Secret_A.pdf"))

    async def postgres_by_user(user_id: str, _as_of: datetime):
        return [doc_a] if user_id == user_a else []

    monkeypatch.setattr(tm, "_fetch_valid_at_postgres", postgres_by_user)
    monkeypatch.setattr(tm, "_fetch_valid_at_supabase", AsyncMock(return_value=[]))

    docs_a = await tm._snapshot_at_impl(user_a, datetime(2026, 5, 1, tzinfo=timezone.utc))
    docs_b = await tm._snapshot_at_impl(user_b, datetime(2026, 5, 1, tzinfo=timezone.utc))

    assert len(docs_a) == 1
    assert docs_a[0].filename == "Secret_A.pdf"
    assert docs_b == []


def test_time_machine_snapshot_endpoint_uses_jwt_user(auth_client, monkeypatch):
    captured: dict[str, object] = {}

    async def mock_get_snapshot(self, user_id, as_of_dt):
        captured["user_id"] = user_id
        return TimeMachineSnapshotResponse(
            as_of=datetime(2026, 3, 15, tzinfo=timezone.utc),
            documents=[],
            total=0,
            earliest_document_at=None,
        )

    monkeypatch.setattr(TimeMachineService, "get_snapshot_response", mock_get_snapshot)

    response = auth_client.get(
        "/api/v1/time-machine/snapshot",
        params={"as_of": "2026-03-15T00:00:00Z"},
    )

    assert response.status_code == 200
    assert captured["user_id"] is not None


def test_build_superseded_pairs():
    old_id = uuid4()
    new_id = uuid4()
    old = tm._row_to_document(_doc_row("v1.pdf", doc_id=str(old_id)))
    new = tm._row_to_document(_doc_row("v2.pdf", doc_id=str(new_id), supersedes=str(old_id)))

    pairs = tm._build_superseded_pairs([old], [new])
    assert len(pairs) == 1
    assert pairs[0].old.filename == "v1.pdf"
    assert pairs[0].new.filename == "v2.pdf"
