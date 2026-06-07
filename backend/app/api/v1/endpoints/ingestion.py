from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.config import settings
from app.core.security import get_admin_user, get_current_user
from app.schemas.ingestion import IngestionResponse, IngestionStatus
from app.services.ingestion_service import IngestionService, get_ingestion_service
from app.services.job_queue import get_job_queue

ingestion_router = APIRouter()


async def _save_celery_task_id(document_id: UUID, task_id: str, user_id: str) -> None:
    """Merge celery_task_id into document metadata for status polling."""
    from app.tasks.ingest_task import save_celery_task_id

    await save_celery_task_id(document_id, task_id, user_id)


@ingestion_router.get(
    "/ingestion/queue/stats",
    summary="Ingestion queue statistics (admin)",
)
async def get_ingestion_queue_stats(
    _admin: Annotated[dict, Depends(get_admin_user)],
) -> dict:
    stats = await get_job_queue().get_queue_stats()
    if not stats.get("available"):
        return {
            "available": False,
            "queued": 0,
            "processing": 0,
            "failed": 0,
        }
    return {
        "available": True,
        "queued": int(stats.get("queued", 0)) + int(stats.get("queued_high", 0)),
        "processing": int(stats.get("processing", 0)),
        "failed": int(stats.get("failed", 0)),
    }


@ingestion_router.post(
    "/{document_id}/ingest",
    response_model=IngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start document ingestion (parse, chunk, embed)",
)
async def ingest_document(
    document_id: UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
    service: Annotated[IngestionService, Depends(get_ingestion_service)],
    background_tasks: BackgroundTasks,
    sync: bool = False,
) -> IngestionResponse:
    """
    Trigger ingestion pipeline.

    - `sync=true`: blocks until ingestion completes (useful for dev/tests).
    - Celery when INGESTION_USE_CELERY=true, else Redis job queue, else BackgroundTasks.
    """
    if sync:
        return await service.start_ingestion(document_id, current_user)

    if settings.ingestion_use_celery:
        from app.tasks.ingest_task import dispatch_ingestion

        task_id = dispatch_ingestion(
            document_id=document_id,
            user=current_user,
            use_celery=True,
        )
        if task_id:
            await _save_celery_task_id(
                document_id,
                task_id,
                str(current_user["id"]),
            )
            return IngestionResponse(
                document_id=document_id,
                status=IngestionStatus.PARSING,
                message=f"queued celery:{task_id}",
            )

    queue = get_job_queue()
    enqueued = await queue.enqueue(
        doc_id=str(document_id),
        user_id=str(current_user["id"]),
        priority=0,
    )

    if enqueued:
        return IngestionResponse(
            document_id=document_id,
            status=IngestionStatus.PARSING,
            message="queued",
        )

    background_tasks.add_task(service.start_ingestion, document_id, current_user)
    return IngestionResponse(
        document_id=document_id,
        status=IngestionStatus.PARSING,
        message="processing",
    )
