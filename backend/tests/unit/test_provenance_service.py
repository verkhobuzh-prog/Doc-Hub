"""Unit tests for provenance_service (C6 filter injection hardening)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.provenance_service import (
    ProvenanceService,
    _validate_entity_name,
)


def test_provenance_injection_attempt():
    with pytest.raises(ValueError, match="invalid characters"):
        _validate_entity_name("x,y.like.%")


def test_validate_entity_name_accepts_safe_values():
    assert _validate_entity_name("  Acme Corp.  ") == "Acme Corp."


@pytest.mark.asyncio
async def test_get_provenance_raises_503_when_database_url_missing():
    service = ProvenanceService()
    user_id = str(uuid4())

    with patch("app.services.provenance_service.settings") as mock_settings:
        mock_settings.database_configured = False

        with pytest.raises(HTTPException) as exc_info:
            await service.get_provenance_for_entity("Acme", user_id)

    assert exc_info.value.status_code == 503
    assert "DATABASE_URL" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_get_provenance_raises_503_when_pool_unavailable():
    service = ProvenanceService()
    user_id = str(uuid4())

    with patch("app.services.provenance_service.settings") as mock_settings:
        mock_settings.database_configured = True
        with patch("app.services.provenance_service.get_pool", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                await service.get_provenance_for_entity("Acme", user_id)

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_get_provenance_uses_parameterized_asyncpg_query():
    service = ProvenanceService()
    user_id = str(uuid4())
    mock_conn = AsyncMock()
    mock_conn.fetch = AsyncMock(return_value=[])
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.provenance_service.settings") as mock_settings:
        mock_settings.database_configured = True
        with patch("app.services.provenance_service.get_pool", return_value=mock_pool):
            result = await service.get_provenance_for_entity("Acme", user_id)

    assert result == []
    mock_conn.fetch.assert_awaited_once()
    call_args = mock_conn.fetch.await_args.args
    sql = call_args[0]
    assert call_args[1] == "Acme"
    assert call_args[2] == user_id
    assert "$1" in sql and "$2" in sql
    assert "INNER JOIN documents" in sql
    assert "x,y.like" not in sql
