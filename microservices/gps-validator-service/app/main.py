import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.gps_engine import Rules, analyze, gps_engine, parse_zone, zone_area_sqm
from app.schemas import ApiResponse, ParticipantResult, ValidateBody, ValidateResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    gps_engine.load()
    yield


app = FastAPI(
    title="CARES GPS Validator Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and exc.detail.get("ok") is False:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "message": str(exc.detail), "errors": None},
    )


def success(message: str, data: dict) -> ApiResponse:
    return ApiResponse(ok=True, message=message, data=data)


def failure(message: str, status_code: int, errors: dict | None = None) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"ok": False, "message": message, "errors": errors},
    )


@app.get("/health")
async def health() -> ApiResponse:
    return success(
        "Service healthy",
        {
            "status": "ok",
            "model_loaded": gps_engine.model_loaded,
            "required_coverage_ratio": settings.required_coverage_ratio,
            "late_entry_ratio": settings.late_entry_ratio,
            "max_ping_gap_seconds": settings.max_ping_gap_seconds,
            "boundary_tolerance_m": settings.boundary_tolerance_m,
            "max_speed_mps": settings.max_speed_mps,
            "max_accuracy_m": settings.max_accuracy_m,
        },
    )


@app.post("/api/v1/validate")
async def validate(body: ValidateBody) -> ApiResponse:
    """Judge every participant's recorded movement against the event's geofence.

    Chronological analysis per volunteer: when they first entered the zone
    (timeIn), when they last left it (timeOut), how long they were inside,
    whether that meets the coverage / late-entry rules, and any GPS anomalies.
    """
    if not gps_engine.model_loaded:
        raise failure("GPS validator not ready", 503)

    if body.event.ended_at <= body.event.started_at:
        raise failure("Event end must be after its start", 422)

    try:
        zone = parse_zone(body.event.geojson)
    except (ValueError, TypeError, KeyError) as exc:
        raise failure(f"Invalid event geofence: {exc}", 422) from exc

    rules = Rules.resolve(body.thresholds)

    results: list[ParticipantResult] = []
    for participant in body.participants:
        analysis = analyze(zone, body.event, participant.pings, rules)
        results.append(
            ParticipantResult(
                userId=participant.user_id,
                status=analysis.status,
                isValid=analysis.is_valid,
                timeIn=analysis.time_in,
                timeOut=analysis.time_out,
                insideSeconds=analysis.inside_seconds,
                hoursRendered=round(analysis.inside_seconds / 3600.0, 2),
                coverageRatio=analysis.coverage_ratio,
                lateBySeconds=analysis.late_by_seconds,
                isLate=analysis.is_late,
                pingCount=analysis.ping_count,
                insidePingCount=analysis.inside_ping_count,
                lastPingAt=analysis.last_ping_at,
                lastInside=analysis.last_inside,
                lastDistanceToZoneM=analysis.last_distance_to_zone_m,
                visits=analysis.visits,
                anomalies=analysis.anomalies,
                reasons=analysis.reasons,
            )
        )

    valid = sum(1 for r in results if r.is_valid)
    logger.info(
        "GPS validate complete event=%s participants=%s valid=%s absent=%s",
        body.event.id,
        len(results),
        valid,
        len(results) - valid,
    )

    result = ValidateResult(
        eventId=body.event.id,
        eventDurationSeconds=(body.event.ended_at - body.event.started_at).total_seconds(),
        zoneAreaSqm=round(zone_area_sqm(zone), 1),
        thresholds=rules.as_dict(),
        results=results,
    )
    return success("Attendance validated", result.model_dump(by_alias=True, mode="json"))
