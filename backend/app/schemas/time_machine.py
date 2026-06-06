from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TimeMachineDocument(BaseModel):
    id: UUID
    filename: str
    title: str
    status: str
    document_type: Optional[str] = None
    subject: Optional[str] = None
    size_bytes: int = Field(..., ge=0)
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    supersedes_doc_id: Optional[UUID] = None
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class TimeMachineSnapshotResponse(BaseModel):
    as_of: datetime
    documents: list[TimeMachineDocument]
    total: int = Field(..., ge=0)
    earliest_document_at: Optional[datetime] = None


class SupersededPair(BaseModel):
    old: TimeMachineDocument
    new: TimeMachineDocument


class TimeMachineDiff(BaseModel):
    t1: datetime
    t2: datetime
    added: list[TimeMachineDocument] = Field(default_factory=list)
    removed: list[TimeMachineDocument] = Field(default_factory=list)
    superseded: list[TimeMachineDocument] = Field(default_factory=list)
    superseded_pairs: list[SupersededPair] = Field(default_factory=list)


class TimelineEvent(BaseModel):
    document_id: UUID
    filename: str
    event_type: str
    occurred_at: datetime
    label: Optional[str] = None


class TimeMachineTimelineResponse(BaseModel):
    events: list[TimelineEvent]
    earliest_at: Optional[datetime] = None
