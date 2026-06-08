import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.face_engine import face_engine
from app.redis_client import connect_redis, disconnect_redis
from app.schemas import ApiResponse, CompareEmbeddingsBody

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    face_engine.load()
    await connect_redis()
    yield
    await disconnect_redis()


app = FastAPI(
    title="CARES Face Recognition Service",
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


async def read_upload(file: UploadFile) -> bytes:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise failure("File must be an image", 400)
    data = await file.read()
    if not data:
        raise failure("Empty image upload", 400)
    return data


def validate_embedding(embedding: list[float]) -> None:
    if len(embedding) != settings.embedding_dim:
        raise failure(
            f"Embedding must have length {settings.embedding_dim}",
            400,
            {"length": len(embedding)},
        )


@app.get("/health")
async def health() -> ApiResponse:
    return success("Service healthy", {"status": "ok", "model": settings.model_name})


@app.post("/api/v1/verify-images")
async def verify_images(
    id_image: UploadFile = File(...),
    selfie: UploadFile = File(...),
) -> ApiResponse:
    id_bytes = await read_upload(id_image)
    selfie_bytes = await read_upload(selfie)

    try:
        id_result = face_engine.extract_from_bytes(id_bytes)
        selfie_result = face_engine.extract_from_bytes(selfie_bytes)
    except ValueError as exc:
        raise failure(str(exc), 422) from exc

    validate_embedding(id_result.embedding)
    validate_embedding(selfie_result.embedding)

    similarity = face_engine.cosine_similarity(id_result.embedding, selfie_result.embedding)
    match = similarity >= settings.verify_threshold

    return success(
        "Image verification complete",
        {
            "match": match,
            "similarity": similarity,
            "threshold": settings.verify_threshold,
            "id_det_score": id_result.det_score,
            "selfie_det_score": selfie_result.det_score,
            "selfie_embedding": selfie_result.embedding,
        },
    )


@app.post("/api/v1/embed")
async def embed(image: UploadFile = File(...)) -> ApiResponse:
    data = await read_upload(image)
    try:
        result = face_engine.extract_from_bytes(data)
    except ValueError as exc:
        raise failure(str(exc), 422) from exc

    validate_embedding(result.embedding)
    return success(
        "Embedding extracted",
        {
            "embedding": result.embedding,
            "det_score": result.det_score,
            "embedding_dim": settings.embedding_dim,
        },
    )


@app.post("/api/v1/enroll")
async def enroll(images: list[UploadFile] = File(...)) -> ApiResponse:
    if not images:
        raise failure("At least one image is required", 400)

    embeddings: list[list[float]] = []
    det_scores: list[float] = []
    skipped = 0

    for upload in images:
        data = await read_upload(upload)
        try:
            result = face_engine.extract_from_bytes(data)
        except ValueError:
            skipped += 1
            continue
        embeddings.append(result.embedding)
        det_scores.append(result.det_score)

    if not embeddings:
        raise failure("No face detected in any uploaded image", 422)

    averaged = face_engine.average_embeddings(embeddings)
    validate_embedding(averaged)

    return success(
        "Enrollment embedding created",
        {
            "embedding": averaged,
            "embedding_dim": settings.embedding_dim,
            "images_received": len(images),
            "faces_detected": len(embeddings),
            "images_skipped": skipped,
            "avg_det_score": sum(det_scores) / len(det_scores),
        },
    )


@app.post("/api/v1/verify")
async def verify(
    image: UploadFile = File(...),
    reference_embedding: str = Form(...),
) -> ApiResponse:
    try:
        reference = json.loads(reference_embedding)
    except json.JSONDecodeError as exc:
        raise failure("reference_embedding must be a JSON array", 400) from exc

    if not isinstance(reference, list):
        raise failure("reference_embedding must be a JSON array", 400)

    validate_embedding(reference)

    data = await read_upload(image)
    try:
        result = face_engine.extract_from_bytes(data)
    except ValueError as exc:
        raise failure(str(exc), 422) from exc

    similarity = face_engine.cosine_similarity(reference, result.embedding)
    match = similarity >= settings.verify_threshold

    return success(
        "Verification complete",
        {
            "match": match,
            "similarity": similarity,
            "threshold": settings.verify_threshold,
        },
    )


@app.post("/api/v1/compare")
async def compare(body: CompareEmbeddingsBody) -> ApiResponse:
    validate_embedding(body.reference_embedding)
    validate_embedding(body.probe_embedding)

    similarity = face_engine.cosine_similarity(body.reference_embedding, body.probe_embedding)
    match = similarity >= settings.verify_threshold

    return success(
        "Comparison complete",
        {
            "match": match,
            "similarity": similarity,
            "threshold": settings.verify_threshold,
        },
    )
