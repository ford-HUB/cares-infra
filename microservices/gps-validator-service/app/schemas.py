from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------


class Ping(BaseModel):
    """One `EventLocationPing` row. Field names mirror the Prisma model."""

    model_config = ConfigDict(populate_by_name=True)

    captured_at: datetime = Field(..., alias="capturedAt")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy_m: float | None = Field(default=None, alias="accuracyM", ge=0.0)
    # The device's own check at capture time; reported back only for comparison.
    in_area: bool | None = Field(default=None, alias="inArea")


class Participant(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., alias="userId", min_length=1)
    pings: list[Ping] = Field(default_factory=list, max_length=200_000)


class EventZone(BaseModel):
    """The event's window plus its geofence as stored on `Event.geojson`.

    `geojson` may be a bare Polygon / MultiPolygon geometry, a Feature wrapping
    one, or a FeatureCollection whose first polygon feature is the fence."""

    model_config = ConfigDict(populate_by_name=True)

    id: int | str
    started_at: datetime = Field(..., alias="startedAt")
    ended_at: datetime = Field(..., alias="endedAt")
    geojson: dict[str, Any]


class Thresholds(BaseModel):
    """Per-request overrides. Anything omitted falls back to Settings."""

    model_config = ConfigDict(populate_by_name=True)

    required_coverage_ratio: float | None = Field(
        default=None, alias="requiredCoverageRatio", ge=0.0, le=1.0
    )
    late_entry_ratio: float | None = Field(default=None, alias="lateEntryRatio", ge=0.0, le=1.0)
    max_ping_gap_seconds: int | None = Field(default=None, alias="maxPingGapSeconds", ge=1)
    boundary_tolerance_m: float | None = Field(default=None, alias="boundaryToleranceM", ge=0.0)
    max_speed_mps: float | None = Field(default=None, alias="maxSpeedMps", gt=0.0)
    max_accuracy_m: float | None = Field(default=None, alias="maxAccuracyM", gt=0.0)


class ValidateBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event: EventZone
    participants: list[Participant] = Field(..., min_length=1, max_length=2000)
    thresholds: Thresholds | None = None


# ---------------------------------------------------------------------------
# Response (camelCase on the wire, like ucid-service)
# ---------------------------------------------------------------------------

AttendanceStatus = Literal["COMPLETED", "ABSENT"]
AnomalySeverity = Literal["info", "warning", "critical"]


class Anomaly(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    code: str
    severity: AnomalySeverity
    message: str
    at: datetime | None = None
    details: dict[str, Any] | None = None


class ZoneVisit(BaseModel):
    """One continuous stay inside the zone."""

    model_config = ConfigDict(populate_by_name=True)

    entered_at: datetime = Field(..., alias="enteredAt")
    exited_at: datetime = Field(..., alias="exitedAt")
    duration_seconds: float = Field(..., alias="durationSeconds")


class ParticipantResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., alias="userId")
    status: AttendanceStatus
    is_valid: bool = Field(..., alias="isValid")
    time_in: datetime | None = Field(default=None, alias="timeIn")
    time_out: datetime | None = Field(default=None, alias="timeOut")
    inside_seconds: float = Field(..., alias="insideSeconds")
    hours_rendered: float = Field(..., alias="hoursRendered")
    coverage_ratio: float = Field(..., alias="coverageRatio")
    late_by_seconds: float | None = Field(default=None, alias="lateBySeconds")
    is_late: bool = Field(..., alias="isLate")
    ping_count: int = Field(..., alias="pingCount")
    inside_ping_count: int = Field(..., alias="insidePingCount")
    # The most recent reading of any kind — what a live monitor shows per row.
    last_ping_at: datetime | None = Field(default=None, alias="lastPingAt")
    last_inside: bool | None = Field(default=None, alias="lastInside")
    last_distance_to_zone_m: float | None = Field(default=None, alias="lastDistanceToZoneM")
    visits: list[ZoneVisit]
    anomalies: list[Anomaly]
    reasons: list[str]


class ValidateResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    event_id: int | str = Field(..., alias="eventId")
    event_duration_seconds: float = Field(..., alias="eventDurationSeconds")
    zone_area_sqm: float = Field(..., alias="zoneAreaSqm")
    thresholds: dict[str, float | int]
    results: list[ParticipantResult]
