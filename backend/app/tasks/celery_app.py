"""Celery application for Doc-Hub ingestion queues."""

from __future__ import annotations

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "doc-hub",
    broker=str(settings.REDIS_URL),
    backend=str(settings.REDIS_URL),
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.ingest_task.ingest_document_task": {"queue": "ingestion"},
        "app.tasks.ingest_task.ingest_document_dlq": {"queue": "ingestion.dlq"},
    },
)
