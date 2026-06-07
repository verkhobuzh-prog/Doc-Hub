"""
GET /documents/{id}/status — polling endpoint for ingestion progress.

Returns document status plus Celery task info when INGESTION_USE_CELERY is enabled.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import get_current_user
from app.db.supabase import run_supabase

logger = get_logger("dochub.ingestion_status")
router = APIRouter()


class IngestionStatusResponse(BaseModel):
    document_id: UUID
    status: str
    filename: str | None = None
    progress: dict | None = None
    error: str | None = None
    celery_task_id: str | None = None
    celery_status: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@router.get(
    "/{document_id}/status",
    response_model=IngestionStatusResponse,
    summary="Get ingestion status for a document",
)
async def get_document_status(
    document_id: UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
) -> IngestionStatusResponse:
    """
    Return current ingestion status for a document.
    When Celery is enabled (INGESTION_USE_CELERY), includes Celery task state.
    """
    user_id = str(current_user["id"])

    resp = await run_supabase(
        lambda sb: sb.table("documents")
        .select("id, status, filename, metadata, created_at, updated_at")
        .eq("id", str(document_id))
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )

    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    doc = resp.data
    metadata = doc.get("metadata") or {}
    ingestion_meta = metadata.get("ingestion") or {}
    ingestion_error = metadata.get("ingestion_error")
    celery_task_id: str | None = metadata.get("celery_task_id")
    celery_status: str | None = None

    if celery_task_id and settings.ingestion_use_celery:
        celery_status = _get_celery_task_status(celery_task_id)

    progress = None
    if ingestion_meta:
        progress = {
            "parser": ingestion_meta.get("parser"),
            "chunks": ingestion_meta.get("chunks"),
            "embeddings": ingestion_meta.get("embeddings"),
            "completed_at": ingestion_meta.get("completed_at"),
        }

    return IngestionStatusResponse(
        document_id=document_id,
        status=doc["status"],
        filename=doc.get("filename"),
        progress=progress,
        error=ingestion_error,
        celery_task_id=celery_task_id,
        celery_status=celery_status,
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )


def _get_celery_task_status(task_id: str) -> str:
    """Return Celery task status without raising."""
    try:
        from celery.result import AsyncResult

        from app.tasks.celery_app import celery_app

        result = AsyncResult(task_id, app=celery_app)
        return result.status
    except Exception as exc:
        logger.warning("Could not fetch Celery task status: %s", exc)
        return "UNKNOWN"
