from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_ingestion(document_id: str, user_id: str) -> None:
    from app.services.ingestion_service import IngestionService

    service = IngestionService()
    current_user = {"id": user_id}
    asyncio.run(service.start_ingestion(UUID(document_id), current_user))


@celery_app.task(
    name="app.tasks.ingest_task.ingest_document_task",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,
)
def ingest_document_task(self, document_id: str, user_id: str) -> dict:
    """Celery task для ingestion з retry та DLQ."""
    logger.info(
        "celery_ingest start document_id=%s attempt=%d",
        document_id,
        self.request.retries + 1,
    )
    try:
        _run_ingestion(document_id, user_id)
        return {"status": "success", "document_id": document_id}
    except Exception as exc:
        logger.warning(
            "celery_ingest failed document_id=%s attempt=%d error=%s",
            document_id,
            self.request.retries + 1,
            exc,
        )
        if self.request.retries >= self.max_retries - 1:
            _send_to_dlq(document_id=document_id, user_id=user_id, error=str(exc))
            _mark_failed(document_id=document_id, error=str(exc))
            return {"status": "failed", "document_id": document_id}
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))


@celery_app.task(name="app.tasks.ingest_task.ingest_document_dlq")
def ingest_document_dlq(document_id: str, user_id: str, error: str) -> None:
    logger.error("DLQ document_id=%s user_id=%s error=%s", document_id, user_id, error)


def _send_to_dlq(document_id: str, user_id: str, error: str) -> None:
    try:
        ingest_document_dlq.apply_async(
            kwargs={"document_id": document_id, "user_id": user_id, "error": error},
            queue="ingestion.dlq",
        )
    except Exception as exc:
        logger.error("dlq_send_failed: %s", exc)


def _mark_failed(document_id: str, error: str) -> None:
    from app.db.supabase import get_supabase, run_supabase

    async def _update() -> None:
        client = get_supabase()
        now = datetime.now(timezone.utc).isoformat()

        def _fetch():
            return (
                client.table("documents")
                .select("metadata")
                .eq("id", document_id)
                .maybe_single()
                .execute()
            )

        resp = await run_supabase(_fetch)
        meta = (resp.data or {}).get("metadata") or {}
        if not isinstance(meta, dict):
            meta = {}
        meta["error"] = error
        meta["ingestion_error"] = error

        def _patch():
            return (
                client.table("documents")
                .update(
                    {
                        "status": "failed",
                        "updated_at": now,
                        "metadata": meta,
                    }
                )
                .eq("id", document_id)
                .execute()
            )

        await run_supabase(_patch)

    try:
        asyncio.run(_update())
    except Exception as exc:
        logger.error("mark_failed_db_error: %s", exc)


async def save_celery_task_id(document_id: UUID, task_id: str, user_id: str) -> None:
    """Merge celery_task_id into document metadata for status polling."""
    from app.db.supabase import get_supabase, run_supabase

    client = get_supabase()

    def _fetch():
        return (
            client.table("documents")
            .select("metadata")
            .eq("id", str(document_id))
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

    resp = await run_supabase(_fetch)
    meta = (resp.data or {}).get("metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    meta["celery_task_id"] = task_id

    def _update():
        return (
            client.table("documents")
            .update(
                {
                    "metadata": meta,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", str(document_id))
            .eq("user_id", user_id)
            .execute()
        )

    await run_supabase(_update)


def dispatch_ingestion(
    document_id: str | UUID,
    user: dict[str, Any],
    *,
    use_celery: bool = False,
) -> str | None:
    """
    Dispatch ingestion to Celery when use_celery=True.
    Returns task id, or None when caller should use BackgroundTasks.
    """
    if not use_celery:
        return None

    user_id = str(user["id"])
    doc_id = str(document_id)
    task = ingest_document_task.apply_async(
        kwargs={"document_id": doc_id, "user_id": user_id},
        queue="ingestion",
    )
    logger.info("Celery ingestion dispatched task_id=%s document_id=%s", task.id, doc_id)
    return task.id
