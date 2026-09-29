"""Chronological movement analysis of one volunteer against one event geofence.

Everything geographic lives here: parsing the event's GeoJSON into a Shapely
polygon, deciding per reading whether the volunteer is inside, stitching the
readings into IN/OUT visits, crediting time inside, and flagging readings that
do not look like a person walking around an event.

Distances are geodesic (WGS84 via pyproj) — Shapely itself works in plain
lon/lat degrees, which is fine for point-in-polygon on fences a few hundred
metres wide but not for metres or speeds.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from pyproj import Geod
from shapely.geometry import MultiPolygon, Point, Polygon, shape
from shapely.ops import nearest_points
from shapely.validation import make_valid

from app.config import settings
from app.schemas import Anomaly, EventZone, Ping, Thresholds, ZoneVisit

logger = logging.getLogger(__name__)

_GEOD = Geod(ellps="WGS84")


# ---------------------------------------------------------------------------
# Zone
# ---------------------------------------------------------------------------


def parse_zone(geojson: dict[str, Any]) -> Polygon | MultiPolygon:
    """Accepts a Polygon/MultiPolygon geometry, a Feature, or a FeatureCollection."""
    kind = geojson.get("type")
    if kind == "FeatureCollection":
        for feature in geojson.get("features") or []:
            geometry = (feature or {}).get("geometry") or {}
            if geometry.get("type") in ("Polygon", "MultiPolygon"):
                return parse_zone(geometry)
        raise ValueError("FeatureCollection has no Polygon feature")
    if kind == "Feature":
        return parse_zone(geojson.get("geometry") or {})
    if kind not in ("Polygon", "MultiPolygon"):
        raise ValueError(f"Unsupported geometry type: {kind!r}")

    geom = shape(geojson)
    if geom.is_empty:
        raise ValueError("Event zone is empty")
    if not geom.is_valid:
        geom = make_valid(geom)
        if geom.geom_type == "GeometryCollection":
            polys = [g for g in geom.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
            if not polys:
                raise ValueError("Event zone could not be repaired into a polygon")
            geom = polys[0] if len(polys) == 1 else MultiPolygon(
                [p for g in polys for p in (g.geoms if g.geom_type == "MultiPolygon" else [g])]
            )
    return geom


def zone_area_sqm(zone: Polygon | MultiPolygon) -> float:
    area, _ = _GEOD.geometry_area_perimeter(zone)
    return abs(area)


def distance_to_zone_m(zone: Polygon | MultiPolygon, point: Point) -> float:
    """0 when inside, otherwise geodesic metres to the nearest point on the fence."""
    if zone.contains(point):
        return 0.0
    on_zone, _ = nearest_points(zone, point)
    _, _, dist = _GEOD.inv(point.x, point.y, on_zone.x, on_zone.y)
    return float(dist)


def distance_m(a: Ping, b: Ping) -> float:
    _, _, dist = _GEOD.inv(a.longitude, a.latitude, b.longitude, b.latitude)
    return float(dist)


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Rules:
    required_coverage_ratio: float
    late_entry_ratio: float
    max_ping_gap_seconds: int
    boundary_tolerance_m: float
    max_speed_mps: float
    max_accuracy_m: float
    max_transitions_per_hour: int
    stationary_radius_m: float

    @classmethod
    def resolve(cls, overrides: Thresholds | None) -> "Rules":
        o = overrides.model_dump(exclude_none=True) if overrides else {}
        return cls(
            required_coverage_ratio=o.get("required_coverage_ratio", settings.required_coverage_ratio),
            late_entry_ratio=o.get("late_entry_ratio", settings.late_entry_ratio),
            max_ping_gap_seconds=o.get("max_ping_gap_seconds", settings.max_ping_gap_seconds),
            boundary_tolerance_m=o.get("boundary_tolerance_m", settings.boundary_tolerance_m),
            max_speed_mps=o.get("max_speed_mps", settings.max_speed_mps),
            max_accuracy_m=o.get("max_accuracy_m", settings.max_accuracy_m),
            max_transitions_per_hour=settings.max_transitions_per_hour,
            stationary_radius_m=settings.stationary_radius_m,
        )

    def as_dict(self) -> dict[str, float | int]:
        return {
            "requiredCoverageRatio": self.required_coverage_ratio,
            "lateEntryRatio": self.late_entry_ratio,
            "maxPingGapSeconds": self.max_ping_gap_seconds,
            "boundaryToleranceM": self.boundary_tolerance_m,
            "maxSpeedMps": self.max_speed_mps,
            "maxAccuracyM": self.max_accuracy_m,
            "maxTransitionsPerHour": self.max_transitions_per_hour,
        }


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------


@dataclass
class Reading:
    ping: Ping
    inside: bool
    distance_to_zone_m: float


@dataclass
class MovementAnalysis:
    status: str
    is_valid: bool
    time_in: datetime | None
    time_out: datetime | None
    inside_seconds: float
    coverage_ratio: float
    late_by_seconds: float | None
    is_late: bool
    ping_count: int
    inside_ping_count: int
    last_ping_at: datetime | None = None
    last_inside: bool | None = None
    last_distance_to_zone_m: float | None = None
    visits: list[ZoneVisit] = field(default_factory=list)
    anomalies: list[Anomaly] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def _classify(zone: Polygon | MultiPolygon, pings: list[Ping], rules: Rules) -> list[Reading]:
    readings: list[Reading] = []
    for ping in pings:
        dist = distance_to_zone_m(zone, Point(ping.longitude, ping.latitude))
        readings.append(Reading(ping=ping, inside=dist <= rules.boundary_tolerance_m, distance_to_zone_m=dist))
    return readings


def _visits(readings: list[Reading], window_start: datetime, window_end: datetime, rules: Rules) -> list[ZoneVisit]:
    """Stitch consecutive inside readings into visits.

    A reading credits the time until the next reading, capped at the max gap so
    a device that stopped recording for an hour does not earn that hour. Only
    the part of each stretch that overlaps the event window counts."""
    visits: list[ZoneVisit] = []
    entered: datetime | None = None
    exited: datetime | None = None
    credited = 0.0

    def close() -> None:
        nonlocal entered, exited, credited
        if entered is not None and exited is not None and credited > 0:
            visits.append(ZoneVisit(enteredAt=entered, exitedAt=exited, durationSeconds=round(credited, 1)))
        entered, exited, credited = None, None, 0.0

    for idx, reading in enumerate(readings):
        t = reading.ping.captured_at
        if not reading.inside:
            close()
            continue

        nxt = readings[idx + 1] if idx + 1 < len(readings) else None
        if nxt is not None:
            span = (nxt.ping.captured_at - t).total_seconds()
            gap_broken = span > rules.max_ping_gap_seconds
            span = min(span, rules.max_ping_gap_seconds)
        else:
            span, gap_broken = 0.0, False

        seg_start = max(t, window_start)
        seg_end = min(t + timedelta(seconds=span), window_end)
        overlap = max(0.0, (seg_end - seg_start).total_seconds())

        if entered is None:
            entered = t
        exited = t + timedelta(seconds=span) if nxt is not None and not gap_broken else t
        credited += overlap

        if gap_broken or nxt is None or not nxt.inside:
            close()
    close()
    return visits


def _anomalies(readings: list[Reading], window_start: datetime, window_end: datetime, rules: Rules) -> list[Anomaly]:
    found: list[Anomaly] = []
    if not readings:
        return found

    out_of_order = 0
    duplicates = 0
    poor_accuracy = 0
    outside_window = 0
    max_speed = 0.0
    max_speed_at: datetime | None = None
    longest_gap = 0.0
    longest_gap_at: datetime | None = None
    transitions = 0

    prev: Reading | None = None
    for reading in readings:
        p = reading.ping
        if p.captured_at < window_start or p.captured_at > window_end:
            outside_window += 1
        if p.accuracy_m is not None and p.accuracy_m > rules.max_accuracy_m:
            poor_accuracy += 1
        if prev is not None:
            dt = (p.captured_at - prev.ping.captured_at).total_seconds()
            if dt < 0:
                out_of_order += 1
            elif dt == 0:
                duplicates += 1
            else:
                speed = distance_m(prev.ping, p) / dt
                if speed > max_speed:
                    max_speed, max_speed_at = speed, p.captured_at
                if dt > longest_gap:
                    longest_gap, longest_gap_at = dt, prev.ping.captured_at
            if prev.inside != reading.inside:
                transitions += 1
        prev = reading

    if out_of_order:
        found.append(Anomaly(code="OUT_OF_ORDER", severity="warning",
                             message=f"{out_of_order} reading(s) arrived with a timestamp earlier than the previous one",
                             details={"count": out_of_order}))
    if duplicates:
        found.append(Anomaly(code="DUPLICATE_TIMESTAMP", severity="info",
                             message=f"{duplicates} reading(s) share a timestamp with the previous one",
                             details={"count": duplicates}))
    if max_speed > rules.max_speed_mps:
        found.append(Anomaly(code="IMPOSSIBLE_SPEED", severity="critical",
                             message=f"Moved at {max_speed:.1f} m/s between readings (limit {rules.max_speed_mps} m/s)",
                             at=max_speed_at, details={"speedMps": round(max_speed, 2)}))
    if longest_gap > rules.max_ping_gap_seconds:
        found.append(Anomaly(code="RECORDING_GAP", severity="warning",
                             message=f"No readings for {longest_gap / 60:.1f} min; that stretch was not credited",
                             at=longest_gap_at, details={"gapSeconds": round(longest_gap)}))
    if poor_accuracy:
        share = poor_accuracy / len(readings)
        found.append(Anomaly(code="POOR_ACCURACY", severity="warning" if share > 0.25 else "info",
                             message=f"{poor_accuracy} reading(s) reported accuracy worse than {rules.max_accuracy_m:.0f} m",
                             details={"count": poor_accuracy, "share": round(share, 3)}))
    if outside_window:
        found.append(Anomaly(code="OUTSIDE_EVENT_WINDOW", severity="info",
                             message=f"{outside_window} reading(s) fall outside the event window and were ignored for coverage",
                             details={"count": outside_window}))

    hours = max((readings[-1].ping.captured_at - readings[0].ping.captured_at).total_seconds() / 3600.0, 1 / 60)
    if transitions / hours > rules.max_transitions_per_hour:
        found.append(Anomaly(code="BOUNDARY_FLAPPING", severity="warning",
                             message=f"{transitions} IN/OUT transitions in {hours:.1f} h — device hovering on the fence line",
                             details={"transitions": transitions}))

    # A phone that reports the exact same spot for the whole event is more
    # likely left on a table (or spoofed) than carried by a volunteer.
    if len(readings) >= 30:
        first = readings[0].ping
        if all(distance_m(first, r.ping) <= rules.stationary_radius_m for r in readings):
            found.append(Anomaly(code="STATIONARY_DEVICE", severity="warning",
                                 message=f"Device never moved more than {rules.stationary_radius_m:.0f} m for the whole recording",
                                 details={"pings": len(readings)}))

    # Device said "inside" but the fence says otherwise (or vice versa).
    disagreements = sum(1 for r in readings if r.ping.in_area is not None and r.ping.in_area != r.inside)
    if disagreements:
        share = disagreements / len(readings)
        if share > 0.10:
            found.append(Anomaly(code="DEVICE_ZONE_MISMATCH", severity="warning",
                                 message=f"Device's own in-area flag disagreed with the fence on {disagreements} reading(s)",
                                 details={"count": disagreements, "share": round(share, 3)}))

    return found


def analyze(zone: Polygon | MultiPolygon, event: EventZone, pings: list[Ping], rules: Rules) -> MovementAnalysis:
    window_start = _utc(event.started_at)
    window_end = _utc(event.ended_at)
    duration = (window_end - window_start).total_seconds()

    normalised = [p.model_copy(update={"captured_at": _utc(p.captured_at)}) for p in pings]
    # Anomaly detection wants the raw order (to spot out-of-order rows); the
    # movement analysis wants a clean timeline.
    raw_readings = _classify(zone, normalised, rules)
    ordered = sorted(raw_readings, key=lambda r: r.ping.captured_at)

    anomalies = _anomalies(raw_readings, window_start, window_end, rules)
    visits = _visits(ordered, window_start, window_end, rules)

    inside = [r for r in ordered if r.inside and window_start <= r.ping.captured_at <= window_end]
    time_in = inside[0].ping.captured_at if inside else None
    time_out = inside[-1].ping.captured_at if inside else None
    inside_seconds = sum(v.duration_seconds for v in visits)
    coverage = inside_seconds / duration if duration > 0 else 0.0

    late_by: float | None = None
    is_late = False
    if time_in is not None:
        late_by = max(0.0, (time_in - window_start).total_seconds())
        is_late = late_by > duration * rules.late_entry_ratio

    reasons: list[str] = []
    if not pings:
        reasons.append("No coordinates were recorded for this volunteer")
    elif not inside:
        reasons.append("Never entered the event zone during the event window")
    else:
        if is_late:
            reasons.append(
                f"Entered the zone {late_by / 60:.0f} min after the event started "
                f"(later than {rules.late_entry_ratio:.0%} of the event)"
            )
        if coverage < rules.required_coverage_ratio:
            reasons.append(
                f"Inside the zone for {coverage:.0%} of the event, below the "
                f"{rules.required_coverage_ratio:.0%} required"
            )
    critical = [a for a in anomalies if a.severity == "critical"]
    if critical:
        reasons.extend(a.message for a in critical)

    is_valid = bool(inside) and not is_late and coverage >= rules.required_coverage_ratio and not critical

    return MovementAnalysis(
        status="COMPLETED" if is_valid else "ABSENT",
        is_valid=is_valid,
        time_in=time_in,
        time_out=time_out,
        inside_seconds=round(inside_seconds, 1),
        coverage_ratio=round(min(coverage, 1.0), 4),
        late_by_seconds=round(late_by, 1) if late_by is not None else None,
        is_late=is_late,
        ping_count=len(pings),
        inside_ping_count=len(inside),
        last_ping_at=ordered[-1].ping.captured_at if ordered else None,
        last_inside=ordered[-1].inside if ordered else None,
        last_distance_to_zone_m=round(ordered[-1].distance_to_zone_m, 1) if ordered else None,
        visits=visits,
        anomalies=anomalies,
        reasons=reasons,
    )


class GpsEngine:
    """No weights to load — `load()` only proves Shapely/pyproj import and work."""

    def __init__(self) -> None:
        self.model_loaded = False

    def load(self) -> None:
        probe = parse_zone({"type": "Polygon", "coordinates": [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0]]]})
        zone_area_sqm(probe)
        self.model_loaded = True
        logger.info("GPS validator engine ready")


gps_engine = GpsEngine()
