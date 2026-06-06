"""Time Machine REST API — valid-time snapshots and diffs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.schemas.time_machine import (
    TimeMachineDiff,
    TimeMachineSnapshotResponse,
    TimeMachineTimelineResponse,
)
from app.services.time_machine_service import TimeMachineService, get_time_machine_service

time_machine_router = APIRouter()


def _parse_as_of(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


@time_machine_router.get(
    "/snapshot",
    response_model=TimeMachineSnapshotResponse,
    summary="Documents valid as of a point in time",
)
async def get_snapshot(
    current_user: Annotated[dict, Depends(get_current_user)],
    service: Annotated[TimeMachineService, Depends(get_time_machine_service)],
    as_of: Annotated[datetime, Query(description="ISO timestamp — valid-time as-of date")],
) -> TimeMachineSnapshotResponse:
    """
    Returns indexed documents where:
    `valid_from <= as_of` AND (`valid_to` IS NULL OR `valid_to > as_of`).

    MVP uses valid_time only; NULL `valid_from` means effective since upload.
    """
    as_of = _parse_as_of(as_of)
    user_id = current_user["id"]
    try:
        return await service.get_snapshot_response(user_id, as_of)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Time Machine snapshot failed: {exc}",
        ) from exc


@time_machine_router.get(
    "/diff",
    response_model=TimeMachineDiff,
    summary="Document set changes between two timestamps",
)
async def get_diff(
    current_user: Annotated[dict, Depends(get_current_user)],
    service: Annotated[TimeMachineService, Depends(get_time_machine_service)],
    t1: Annotated[datetime, Query(description="Start of comparison window (ISO)")],
    t2: Annotated[datetime, Query(description="End of comparison window (ISO)")],
) -> TimeMachineDiff:
    """Compare valid-time snapshots at t1 and t2."""
    user_id = current_user["id"]
    try:
        return await service.diff_between(user_id, _parse_as_of(t1), _parse_as_of(t2))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Time Machine diff failed: {exc}",
        ) from exc


@time_machine_router.get(
    "/timeline",
    response_model=TimeMachineTimelineResponse,
    summary="Timeline markers for uploads and version events",
)
async def get_timeline(
    current_user: Annotated[dict, Depends(get_current_user)],
    service: Annotated[TimeMachineService, Depends(get_time_machine_service)],
) -> TimeMachineTimelineResponse:
    """Upload, effective, superseded, and amendment events for timeline UI."""
    try:
        return await service.timeline_events(current_user["id"])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Time Machine timeline failed: {exc}",
        ) from exc
