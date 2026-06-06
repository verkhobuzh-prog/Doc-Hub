"""Time Machine — valid-time document snapshots and diffs (MVP)."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import get_logger
from app.core.telemetry import traced_span
from app.db.postgres import get_pool
from app.db.supabase import get_supabase, run_supabase
from app.schemas.time_machine import (
    SupersededPair,
    TimeMachineDiff,
    TimeMachineDocument,
    TimelineEvent,
    TimeMachineSnapshotResponse,
    TimeMachineTimelineResponse,
)

logger = get_logger("dochub.time_machine")

DOCUMENTS_TABLE = "documents"


def _parse_dt(value: object) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = str(value)
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    return datetime.fromisoformat(text)


def _row_to_document(row: dict) -> TimeMachineDocument:
    return TimeMachineDocument(
        id=UUID(str(row["id"])),
        filename=row["filename"],
        title=row.get("title") or row["filename"],
        status=row.get("status", "indexed"),
        document_type=row.get("document_type"),
        subject=row.get("subject"),
        size_bytes=int(row.get("size_bytes", 0)),
        valid_from=_parse_dt(row.get("valid_from")),
        valid_to=_parse_dt(row.get("valid_to")),
        supersedes_doc_id=(
            UUID(str(row["supersedes_doc_id"])) if row.get("supersedes_doc_id") else None
        ),
        created_at=_parse_dt(row["created_at"]) or datetime.now(timezone.utc),
        metadata=row.get("metadata") or {},
    )


async def _fetch_valid_at_postgres(user_id: str, as_of: datetime) -> list[TimeMachineDocument]:
    pool = get_pool()
    if pool is None:
        return []

    sql = "SELECT * FROM documents_valid_at($1::uuid, $2::timestamptz)"
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, user_id, as_of)

    return [_row_to_document(dict(row)) for row in rows]


async def _fetch_valid_at_supabase(user_id: str, as_of: datetime) -> list[TimeMachineDocument]:
    client = get_supabase()
    as_of_iso = as_of.isoformat()

    def _rpc():
        return client.rpc(
            "documents_valid_at",
            {"user_id_param": user_id, "as_of": as_of_iso},
        ).execute()

    try:
        result = await run_supabase(_rpc)
        rows = result.data or []
        return [_row_to_document(row) for row in rows]
    except Exception as exc:
        logger.warning("RPC documents_valid_at failed, using fallback filter: %s", exc)

    def _query():
        return (
            client.table(DOCUMENTS_TABLE)
            .select(
                "id, filename, title, status, document_type, subject, size_bytes, "
                "valid_from, valid_to, supersedes_doc_id, created_at, metadata"
            )
            .eq("user_id", user_id)
            .eq("status", "indexed")
            .is_("deleted_at", "null")
            .execute()
        )

    result = await run_supabase(_query)
    docs: list[TimeMachineDocument] = []
    for row in result.data or []:
        doc = _row_to_document(row)
        effective_from = doc.valid_from or doc.created_at
        if effective_from > as_of:
            continue
        if doc.valid_to is not None and doc.valid_to <= as_of:
            continue
        docs.append(doc)
    return docs


def _build_superseded_pairs(
    superseded: list[TimeMachineDocument],
    added: list[TimeMachineDocument],
) -> list[SupersededPair]:
    """Match expired docs to replacements via supersedes_doc_id."""
    replacements = {
        doc.supersedes_doc_id: doc for doc in added if doc.supersedes_doc_id is not None
    }
    pairs: list[SupersededPair] = []
    for old in superseded:
        new = replacements.get(old.id)
        if new is not None:
            pairs.append(SupersededPair(old=old, new=new))
    return pairs


async def _earliest_document_at(user_id: str) -> datetime | None:
    client = get_supabase()

    def _query():
        return (
            client.table(DOCUMENTS_TABLE)
            .select("created_at, valid_from")
            .eq("user_id", user_id)
            .eq("status", "indexed")
            .is_("deleted_at", "null")
            .order("created_at")
            .limit(1)
            .execute()
        )

    result = await run_supabase(_query)
    if not result.data:
        return None
    row = result.data[0]
    created = _parse_dt(row.get("created_at"))
    valid_from = _parse_dt(row.get("valid_from"))
    if created and valid_from:
        return min(created, valid_from)
    return valid_from or created


async def _snapshot_at_impl(user_id: str | UUID, as_of: datetime) -> list[TimeMachineDocument]:
    """Documents valid (effective) as of given timestamp."""
    if as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=timezone.utc)

    uid = str(user_id)
    with traced_span("time_machine.snapshot", {"time_machine.as_of": as_of.isoformat()}):
        docs = await _fetch_valid_at_postgres(uid, as_of)
        if not docs:
            docs = await _fetch_valid_at_supabase(uid, as_of)
        docs.sort(key=lambda d: d.filename.lower())
        return docs


async def _diff_between_impl(user_id: str | UUID, t1: datetime, t2: datetime) -> TimeMachineDiff:
    """What changed between t1 and t2 (valid-time snapshots)."""
    if t1.tzinfo is None:
        t1 = t1.replace(tzinfo=timezone.utc)
    if t2.tzinfo is None:
        t2 = t2.replace(tzinfo=timezone.utc)
    if t1 > t2:
        t1, t2 = t2, t1

    with traced_span(
        "time_machine.diff",
        {
            "time_machine.t1": t1.isoformat(),
            "time_machine.t2": t2.isoformat(),
        },
    ):
        snap_t1 = await _snapshot_at_impl(user_id, t1)
        snap_t2 = await _snapshot_at_impl(user_id, t2)

        ids_t1 = {d.id for d in snap_t1}
        ids_t2 = {d.id for d in snap_t2}

        added = [d for d in snap_t2 if d.id not in ids_t1]
        removed = [d for d in snap_t1 if d.id not in ids_t2]
        superseded = await _superseded_in_range(str(user_id), t1, t2)
        pairs = _build_superseded_pairs(superseded, added)

        return TimeMachineDiff(
            t1=t1,
            t2=t2,
            added=added,
            removed=removed,
            superseded=superseded,
            superseded_pairs=pairs,
        )


async def _superseded_in_range(
    user_id: str,
    t1: datetime,
    t2: datetime,
) -> list[TimeMachineDocument]:
    """Documents that became invalid (superseded/expired) during (t1, t2]."""
    pool = get_pool()
    if pool is not None:
        sql = """
            SELECT id, filename, title, status, document_type, subject, size_bytes,
                   valid_from, valid_to, supersedes_doc_id, created_at, metadata
            FROM documents
            WHERE user_id = $1::uuid
              AND status = 'indexed'
              AND deleted_at IS NULL
              AND valid_to IS NOT NULL
              AND valid_to > $2::timestamptz
              AND valid_to <= $3::timestamptz
            ORDER BY valid_to ASC
        """
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql, user_id, t1, t2)
        return [_row_to_document(dict(row)) for row in rows]

    client = get_supabase()

    def _query():
        return (
            client.table(DOCUMENTS_TABLE)
            .select(
                "id, filename, title, status, document_type, subject, size_bytes, "
                "valid_from, valid_to, supersedes_doc_id, created_at, metadata"
            )
            .eq("user_id", user_id)
            .eq("status", "indexed")
            .is_("deleted_at", "null")
            .not_.is_("valid_to", "null")
            .gt("valid_to", t1.isoformat())
            .lte("valid_to", t2.isoformat())
            .order("valid_to")
            .execute()
        )

    result = await run_supabase(_query)
    return [_row_to_document(row) for row in result.data or []]


async def _timeline_events_impl(user_id: str | UUID) -> TimeMachineTimelineResponse:
    """Upload and version markers for horizontal timeline UI."""
    uid = str(user_id)
    client = get_supabase()

    def _query():
        return (
            client.table(DOCUMENTS_TABLE)
            .select(
                "id, filename, created_at, valid_from, valid_to, supersedes_doc_id, status"
            )
            .eq("user_id", uid)
            .is_("deleted_at", "null")
            .neq("status", "failed")
            .order("created_at")
            .execute()
        )

    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage service is not configured",
        )

    result = await run_supabase(_query)
    events: list[TimelineEvent] = []
    earliest: datetime | None = None

    for row in result.data or []:
        doc_id = UUID(str(row["id"]))
        filename = row["filename"]
        created = _parse_dt(row.get("created_at"))
        valid_from = _parse_dt(row.get("valid_from"))
        valid_to = _parse_dt(row.get("valid_to"))

        if created:
            events.append(
                TimelineEvent(
                    document_id=doc_id,
                    filename=filename,
                    event_type="upload",
                    occurred_at=created,
                    label=f"Uploaded {filename}",
                )
            )
            earliest = created if earliest is None else min(earliest, created)

        if valid_from and (created is None or valid_from != created):
            events.append(
                TimelineEvent(
                    document_id=doc_id,
                    filename=filename,
                    event_type="effective",
                    occurred_at=valid_from,
                    label=f"Effective from {valid_from.date().isoformat()}",
                )
            )
            earliest = valid_from if earliest is None else min(earliest, valid_from)

        if valid_to:
            events.append(
                TimelineEvent(
                    document_id=doc_id,
                    filename=filename,
                    event_type="superseded",
                    occurred_at=valid_to,
                    label=f"Superseded {filename}",
                )
            )

        if row.get("supersedes_doc_id"):
            effective = valid_from or created
            if effective:
                events.append(
                    TimelineEvent(
                        document_id=doc_id,
                        filename=filename,
                        event_type="version",
                        occurred_at=effective,
                        label=f"Amendment replaces prior version",
                    )
                )

    events.sort(key=lambda e: e.occurred_at)
    if earliest is None:
        earliest = await _earliest_document_at(uid)

    return TimeMachineTimelineResponse(events=events, earliest_at=earliest)


async def _get_snapshot_response_impl(
    user_id: str | UUID, as_of: datetime
) -> TimeMachineSnapshotResponse:
    docs = await _snapshot_at_impl(user_id, as_of)
    earliest = await _earliest_document_at(str(user_id))
    return TimeMachineSnapshotResponse(
        as_of=as_of,
        documents=docs,
        total=len(docs),
        earliest_document_at=earliest,
    )


def get_time_machine_service() -> TimeMachineService:
    return TimeMachineService()


class TimeMachineService:
    async def snapshot_at(self, user_id: str | UUID, as_of: datetime) -> list[TimeMachineDocument]:
        return await _snapshot_at_impl(user_id, as_of)

    async def diff_between(
        self, user_id: str | UUID, t1: datetime, t2: datetime
    ) -> TimeMachineDiff:
        return await _diff_between_impl(user_id, t1, t2)

    async def timeline_events(self, user_id: str | UUID) -> TimeMachineTimelineResponse:
        return await _timeline_events_impl(user_id)

    async def get_snapshot_response(
        self, user_id: str | UUID, as_of: datetime
    ) -> TimeMachineSnapshotResponse:
        return await _get_snapshot_response_impl(user_id, as_of)
