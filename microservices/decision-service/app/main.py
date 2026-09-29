import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.decision_engine import decision_engine
from app.schemas import ApiResponse, ClusterBody

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    decision_engine.load()
    yield


app = FastAPI(
    title="CARES Decision Service",
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
            "model_loaded": decision_engine.model_loaded,
            "default_k": settings.default_k,
            "max_iterations": settings.max_iterations,
            "n_init": settings.n_init,
            "max_households": settings.max_households,
        },
    )


@app.post("/api/v1/cluster-needs")
async def cluster_needs(body: ClusterBody) -> ApiResponse:
    """Group households with a similar need profile.

    Runs scikit-learn KMeans over the survey rows and describes each group: its
    defining need, the barrier its members name most, its priority band, the
    barangay it concentrates in, and where it ranks by need level.
    """
    if not decision_engine.model_loaded:
        raise failure("Decision engine not ready", 503)

    if len(body.households) > settings.max_households:
        raise failure(
            f"Too many households: {len(body.households)} > {settings.max_households}", 422
        )

    seen: set[str] = set()
    for household in body.households:
        if household.id in seen:
            raise failure(f"Duplicate household id: {household.id}", 422)
        seen.add(household.id)

    k = body.k or settings.default_k
    max_iterations = body.max_iterations or settings.max_iterations

    result = decision_engine.cluster(body.households, k, body.seed, max_iterations)

    logger.info(
        "Needs clustering complete households=%s k=%s seed=%s iterations=%s converged=%s inertia=%.3f",
        len(body.households),
        result.k,
        result.seed,
        result.iterations,
        result.converged,
        result.inertia,
    )
    return success("Households clustered", result.model_dump(by_alias=True, mode="json"))
