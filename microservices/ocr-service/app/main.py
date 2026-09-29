import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.ocr_engine import count_populated_fields, ocr_engine
from app.residency_engine import extract_residency
from app.schemas import ApiResponse, IdExtractResult, ResidencyExtractResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("OCR service ready")
    yield


app = FastAPI(
    title="CARES OCR Service",
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


def _looks_like_pdf(data: bytes) -> bool:
    return data.lstrip()[:5] == b"%PDF-"


async def read_document_upload(file: UploadFile) -> bytes:
    """Residency papers arrive as a photo or a scanned / exported PDF."""
    data = await file.read()
    if not data:
        raise failure("Empty document upload", 400)

    content_type = file.content_type or ""
    if (
        content_type.startswith("image/")
        or content_type == "application/pdf"
        or _looks_like_image(data)
        or _looks_like_pdf(data)
    ):
        return data

    raise failure("File must be an image or a PDF", 400)


@app.get("/health")
async def health() -> ApiResponse:
    return success("Service healthy", {"status": "ok"})


@app.post("/api/v1/extract")
async def extract(
    front: UploadFile = File(...),
    back: UploadFile = File(...),
) -> ApiResponse:
    front_bytes = await read_upload(front)
    back_bytes = await read_upload(back)

    try:
        front_text = ocr_engine.extract_text(front_bytes)
        back_text = ocr_engine.extract_text(back_bytes)
        parsed = ocr_engine.parse_id_text(front_text, back_text)
    except ValueError as exc:
        raise failure(str(exc), 422) from exc

    populated = count_populated_fields(parsed)
    logger.info(
        "OCR extract complete front_bytes=%s back_bytes=%s front_text_len=%s "
        "back_text_len=%s populated_fields=%s",
        len(front_bytes),
        len(back_bytes),
        len(front_text),
        len(back_text),
        populated,
    )
    if populated == 0 and (front_text or back_text):
        logger.warning(
            "OCR parser matched no fields. front_preview=%r back_preview=%r",
            front_text[:300],
            back_text[:300],
        )

    result = IdExtractResult(
        firstname=parsed.firstname,
        lastname=parsed.lastname,
        middleName=parsed.middle_name,
        gender=parsed.gender,
        age=parsed.age,
        currentAddress=parsed.current_address,
        phoneNumber=parsed.phone_number,
        idNumber=parsed.id_number,
        departmentName=parsed.department_name,
        majorName=parsed.major_name,
        yearLevelName=parsed.year_level_name,
        graduationYear=parsed.graduation_year,
        graduationMonth=parsed.graduation_month,
        graduationDay=parsed.graduation_day,
        volunteerType=parsed.volunteer_type,
        rawTextFront=front_text,
        rawTextBack=back_text,
    )

    return success("ID fields extracted", result.model_dump(by_alias=True))


@app.post("/api/v1/extract-residency")
async def extract_residency_document(
    document: UploadFile = File(...),
) -> ApiResponse:
    """Reads the residential address off a barangay certificate or similar
    proof of residency. Accepts a photo (JPG/PNG/WebP) or a PDF; PDFs with an
    embedded text layer are read directly, scanned ones are rasterised first."""
    data = await read_document_upload(document)

    try:
        parsed = extract_residency(data)
    except ValueError as exc:
        raise failure(str(exc), 422) from exc

    logger.info(
        "Residency extract complete bytes=%s pages=%s text_len=%s address_found=%s",
        len(data),
        parsed.pages,
        len(parsed.raw_text),
        bool(parsed.address),
    )
    if not parsed.address:
        logger.warning("Residency parser found no address. preview=%r", parsed.raw_text[:300])
        raise failure(
            "We could not read an address off this document. Make sure the whole "
            "page is in frame and the text is sharp, then try again.",
            422,
            {"rawText": parsed.raw_text[:2000]},
        )

    result = ResidencyExtractResult(
        address=parsed.address,
        rawText=parsed.raw_text,
        pages=parsed.pages,
    )
    return success("Residency address extracted", result.model_dump())
