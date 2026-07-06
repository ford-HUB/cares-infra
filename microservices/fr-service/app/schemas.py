from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


class CompareEmbeddingsBody(BaseModel):
    reference_embedding: list[float] = Field(..., min_length=512, max_length=512)
    probe_embedding: list[float] = Field(..., min_length=512, max_length=512)
