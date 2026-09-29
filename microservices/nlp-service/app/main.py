import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.nlp_engine import nlp_engine
from app.schemas import ApiResponse, MatchBody, MatchResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        nlp_engine.load()
    except Exception:  # noqa: BLE001 — surface via /health and 503s, not a dead container
        logger.exception("Failed to load the sentence model")
    yield


app = FastAPI(
    title="CARES NLP Service",
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
            "model_loaded": nlp_engine.model_loaded,
            "model_name": settings.model_name,
            "match_threshold": settings.match_threshold,
            "top_k": settings.top_k,
            "semantic_weight": settings.semantic_weight,
        },
    )


@app.post("/api/v1/match")
async def match(body: MatchBody) -> ApiResponse:
    """Tag each event with the interest codes its title and description read as."""
    if not nlp_engine.model_loaded:
        raise failure("NLP model is not loaded", 503)

    threshold = body.threshold if body.threshold is not None else settings.match_threshold
    top_k = body.top_k if body.top_k is not None else settings.top_k

    try:
        matches = nlp_engine.match(body.events, body.interests, threshold, top_k)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Event matching failed")
        raise failure(f"Event matching failed: {exc}", 500) from exc

    result = MatchResult(model=settings.model_name, threshold=threshold, matches=matches)
    return success("Events matched", result.model_dump())
