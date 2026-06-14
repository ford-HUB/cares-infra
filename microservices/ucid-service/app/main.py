import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas import ApiResponse, IdValidationResult
from app.ucid_engine import ucid_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    ucid_engine.load()
    yield


app = FastAPI(
    title="CARES UCID Service",
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


def _looks_like_image(data: bytes) -> bool:
    if len(data) < 12:
        return False
    if data.startswith(b"\xff\xd8\xff"):
        return True
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    return data.startswith(b"RIFF") and data[8:12] == b"WEBP"


async def read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise failure("Empty image upload", 400)

    content_type = file.content_type or ""
    if content_type.startswith("image/") or _looks_like_image(data):
        return data

    raise failure("File must be an image", 400)


@app.get("/health")
async def health() -> ApiResponse:
    return success(
        "Service healthy",
        {
            "status": "ok",
            "model_loaded": ucid_engine.model_loaded,
            "front_model": settings.front_model_file,
            "back_model": settings.back_model_file,
            "threshold": settings.valid_threshold,
        },
    )


@app.post("/api/v1/validate")
async def validate(
    front: UploadFile = File(...),
    back: UploadFile = File(...),
) -> ApiResponse:
    if not ucid_engine.model_loaded:
        raise failure(
            "UCID models not trained yet — run scripts/train.py",
            503,
        )

    front_bytes = await read_upload(front)
    back_bytes = await read_upload(back)

    try:
        result = ucid_engine.validate_pair(front_bytes, back_bytes)
    except ValueError as exc:
        raise failure(str(exc), 422) from exc
    except RuntimeError as exc:
        raise failure(str(exc), 503) from exc

    payload = IdValidationResult(
        frontValid=result.front.valid,
        backValid=result.back.valid,
        isValid=result.is_valid,
        frontConfidence=result.front.confidence,
        backConfidence=result.back.confidence,
        threshold=result.threshold,
    )

    if not result.is_valid:
        errors = {
            "front": {
                "valid": result.front.valid,
                "confidence": result.front.confidence,
                "label": result.front.label,
            },
            "back": {
                "valid": result.back.valid,
                "confidence": result.back.confidence,
                "label": result.back.label,
            },
        }
        raise failure(
            "Uploaded images are not valid UCLM ID cards",
            422,
            errors=errors,
        )

    return success("ID images validated", payload.model_dump(by_alias=True))
