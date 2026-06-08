import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.ocr_engine import ocr_engine
from app.schemas import ApiResponse, IdExtractResult

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


async def read_upload(file: UploadFile) -> bytes:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise failure("File must be an image", 400)
    data = await file.read()
    if not data:
        raise failure("Empty image upload", 400)
    return data


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
