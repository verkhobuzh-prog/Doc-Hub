"""
OpenTelemetry setup for Doc-Hub FastAPI.

Provides:
  • init_telemetry(app) — FastAPI + httpx auto-instrumentation
  • traced_span(name, attrs) — sync spans for ingestion / Celery
  • ingestion_span / async_ingestion_span — pipeline child spans
  • trace_ingest — async decorator for root ingest span

Exports to Grafana Cloud Tempo when OTEL_EXPORTER_OTLP_ENDPOINT is set;
falls back to ConsoleSpanExporter in development.
"""

from __future__ import annotations

import base64
import functools
import os
from contextlib import asynccontextmanager, contextmanager
from typing import Any, AsyncGenerator, Callable, Generator

from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import Status, StatusCode, Tracer

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("dochub.telemetry")

_tracer: Tracer | None = None
_initialized = False


def _build_otlp_exporter():
    """HTTP OTLP exporter (matches requirements.txt proto-http package)."""
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

    endpoint = settings.otlp_endpoint
    if not endpoint.endswith("/v1/traces"):
        endpoint = endpoint.rstrip("/") + "/v1/traces"

    headers: dict[str, str] = {}
    instance_id = settings.OTEL_GRAFANA_INSTANCE_ID.strip()
    api_token = settings.OTEL_GRAFANA_API_TOKEN.strip()
    if instance_id and api_token:
        credentials = base64.b64encode(f"{instance_id}:{api_token}".encode()).decode()
        headers["Authorization"] = f"Basic {credentials}"

    raw_headers = (settings.OTLP_HEADERS or os.getenv("OTLP_HEADERS", "")).strip()
    if raw_headers:
        for pair in raw_headers.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                headers[key.strip()] = value.strip()

    return OTLPSpanExporter(endpoint=endpoint, headers=headers or None)


def setup_telemetry(app: Any) -> None:
    """Initialize OpenTelemetry — call from lifespan after startup_validation."""
    try:
        _setup_telemetry_impl(app)
    except Exception as exc:
        logger.warning(
            "telemetry: setup failed (%s), continuing without tracing",
            exc,
        )


def _setup_telemetry_impl(app: Any) -> None:
    global _tracer, _initialized

    if _initialized:
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", settings.OTEL_SERVICE_NAME)
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": settings.APP_VERSION,
            "deployment.environment": settings.ENVIRONMENT,
        }
    )

    provider = TracerProvider(resource=resource)
    otlp_endpoint = getattr(settings, "OTLP_ENDPOINT", None) or ""
    otlp_endpoint = str(otlp_endpoint).strip()

    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

            exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("telemetry: OTLP gRPC exporter → %s", otlp_endpoint)
        except Exception as exc:
            logger.warning(
                "telemetry: OTLP gRPC init failed (%s), trying HTTP exporter",
                exc,
            )
            try:
                provider.add_span_processor(BatchSpanProcessor(_build_otlp_exporter()))
                logger.info("telemetry: OTLP HTTP exporter configured")
            except Exception as http_exc:
                logger.warning(
                    "telemetry: OTLP HTTP init failed (%s), falling back to Console",
                    http_exc,
                )
                provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    elif settings.otlp_endpoint:
        try:
            provider.add_span_processor(BatchSpanProcessor(_build_otlp_exporter()))
            logger.info("telemetry: OTLP HTTP exporter configured")
        except Exception as exc:
            logger.warning("telemetry: OTLP HTTP setup failed, using console: %s", exc)
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    else:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        logger.info("telemetry: OTLP_ENDPOINT not set, using ConsoleSpanExporter")

    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer("doc-hub")

    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls="/health,/docs,/redoc,/openapi.json",
        http_capture_headers_server_request=["x-request-id", "x-user-id"],
    )
    try:
        HTTPXClientInstrumentor().instrument()
    except Exception as exc:
        logger.warning("telemetry: httpx instrumentation skipped: %s", exc)

    _initialized = True
    logger.info("telemetry: initialized (service=%s, env=%s)", service_name, settings.ENVIRONMENT)


def init_telemetry(app: Any) -> None:
    """Backward-compatible alias — prefer setup_telemetry from lifespan."""
    setup_telemetry(app)


def get_tracer() -> Tracer:
    return _tracer or trace.get_tracer("doc-hub")


@contextmanager
def traced_span(
    name: str,
    attributes: dict[str, Any] | None = None,
) -> Generator[trace.Span, None, None]:
    """Sync span used by IngestionService and Celery tasks."""
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        try:
            yield span
        except Exception as exc:
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            span.record_exception(exc)
            raise


@contextmanager
def ingestion_span(name: str, **attrs: Any) -> Generator[trace.Span, None, None]:
    """Sync context manager for child span in ingestion pipeline."""
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        for key, value in attrs.items():
            span.set_attribute(key, str(value))
        try:
            yield span
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


@asynccontextmanager
async def async_ingestion_span(
    name: str,
    **attrs: Any,
) -> AsyncGenerator[trace.Span, None]:
    """Async context manager for child span in ingestion pipeline."""
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        for key, value in attrs.items():
            span.set_attribute(key, str(value))
        try:
            yield span
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, str(exc)))
            raise


def trace_ingest(func: Callable) -> Callable:
    """Wrap async ingestion entrypoint in root span `ingest_document`."""

    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        doc_id = kwargs.get("document_id")
        if doc_id is None and len(args) > 1:
            doc_id = args[1]

        user_id = kwargs.get("user_id")
        if user_id is None and len(args) > 2:
            current_user = args[2]
            if isinstance(current_user, dict):
                user_id = current_user.get("id", "unknown")
        user_id = user_id or "unknown"

        tracer = get_tracer()
        with tracer.start_as_current_span("ingest_document") as span:
            span.set_attribute("document_id", str(doc_id))
            span.set_attribute("user_id", str(user_id))
            try:
                result = await func(*args, **kwargs)
                span.set_status(Status(StatusCode.OK))
                return result
            except Exception as exc:
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, str(exc)))
                raise

    return wrapper
