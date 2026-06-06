"""
Seed Time Machine demo documents for a user.

Usage (from backend/):
    python -m scripts.seed_time_machine_demo <USER_ID>

Creates 8 indexed documents:
  - 5 deal-room docs (always valid — NULL valid_from/valid_to)
  - 3 versions of Acme NDA (valid_time chain v1 → v2 → v3)

Demo scenario (relative to seed run date):
  - Today: 5 static + NDA v3 = 6 valid (or 5 if v3 not yet started — see dates below)
  - ~1 month ago: 5 static only (NDA v3 not yet effective)
  - Diff to today: Added NDA v3, Superseded NDA v2 → v3

Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon with service access).
Migration 008 must be applied (valid_from, valid_to, supersedes_doc_id).
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core.config import settings
from app.db.supabase import get_supabase


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _base_row(
    user_id: str,
    doc_id: str,
    filename: str,
    *,
    valid_from: datetime | None = None,
    valid_to: datetime | None = None,
    supersedes_doc_id: str | None = None,
    document_type: str = "contract",
    subject: str = "M&A Demo",
    created_at: datetime | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    created = created_at or now
    return {
        "id": doc_id,
        "user_id": user_id,
        "filename": filename,
        "title": filename.replace("_", " ").replace(".pdf", ""),
        "storage_path": f"{user_id}/{doc_id}/{filename}",
        "mime_type": "application/pdf",
        "size_bytes": 42_000,
        "status": "indexed",
        "document_type": document_type,
        "subject": subject,
        "metadata": {"demo": True, "seed": "time_machine"},
        "valid_from": _iso(valid_from) if valid_from else None,
        "valid_to": _iso(valid_to) if valid_to else None,
        "supersedes_doc_id": supersedes_doc_id,
        "created_at": _iso(created),
        "updated_at": _iso(now),
    }


def build_demo_documents(user_id: str) -> list[dict]:
    """Build 8 demo rows with relative valid_time windows."""
    now = datetime.now(timezone.utc)

    nda_v1_id = str(uuid4())
    nda_v2_id = str(uuid4())
    nda_v3_id = str(uuid4())

    # NDA version chain
    nda_v1_from = now - timedelta(days=365)
    nda_v1_to = now - timedelta(days=120)
    nda_v2_from = nda_v1_to
    nda_v2_to = now - timedelta(days=25)
    nda_v3_from = nda_v2_to

    static_created = now - timedelta(days=200)

    static_docs = [
        ("Acme_Beta_LOI.pdf", "LOI"),
        ("Acme_Beta_Purchase_Agreement.pdf", "SPA"),
        ("Board_Minutes_Q1.pdf", "corporate"),
        ("Disclosure_Schedule_3.pdf", "disclosure"),
        ("Financial_Statements_FY25.pdf", "financial"),
    ]

    rows: list[dict] = []
    for filename, doc_type in static_docs:
        rows.append(
            _base_row(
                user_id,
                str(uuid4()),
                filename,
                document_type=doc_type,
                created_at=static_created,
            )
        )

    rows.append(
        _base_row(
            user_id,
            nda_v1_id,
            "Acme_NDA_v1.pdf",
            document_type="NDA",
            valid_from=nda_v1_from,
            valid_to=nda_v1_to,
            created_at=nda_v1_from,
        )
    )
    rows.append(
        _base_row(
            user_id,
            nda_v2_id,
            "Acme_NDA_v2.pdf",
            document_type="NDA",
            valid_from=nda_v2_from,
            valid_to=nda_v2_to,
            supersedes_doc_id=nda_v1_id,
            created_at=nda_v2_from,
        )
    )
    rows.append(
        _base_row(
            user_id,
            nda_v3_id,
            "Acme_NDA_v3.pdf",
            document_type="NDA",
            valid_from=nda_v3_from,
            valid_to=None,
            supersedes_doc_id=nda_v2_id,
            created_at=nda_v3_from,
        )
    )

    return rows


def seed(user_id: str) -> int:
    if not settings.supabase_configured:
        print("ERROR: Supabase is not configured. Set SUPABASE_URL and keys.", file=sys.stderr)
        return 1

    client = get_supabase()
    rows = build_demo_documents(user_id)

    # Remove prior demo rows for idempotent re-run
    existing = (
        client.table("documents")
        .select("id")
        .eq("user_id", user_id)
        .eq("metadata->>seed", "time_machine")
        .execute()
    )
    for row in existing.data or []:
        client.table("documents").delete().eq("id", row["id"]).execute()

    result = client.table("documents").insert(rows).execute()
    inserted = len(result.data or [])
    print(f"✓ Seeded {inserted} Time Machine demo documents for user {user_id}")
    print("  - 5 deal-room docs (always valid)")
    print("  - Acme_NDA v1 → v2 → v3 (valid_time chain)")
    print(f"  - NDA v3 effective from {rows[-1]['valid_from']}")
    print("\nOpen /time-machine and try shortcuts: 1mo ago, 3mo ago")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed Time Machine demo documents")
    parser.add_argument("user_id", help="Supabase auth user UUID")
    args = parser.parse_args(argv)
    return seed(args.user_id)


if __name__ == "__main__":
    raise SystemExit(main())
