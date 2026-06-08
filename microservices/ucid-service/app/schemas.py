from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


class SideValidationResult(BaseModel):
    valid: bool
    confidence: float
    label: str


class IdValidationResult(BaseModel):
    front_valid: bool = Field(alias="frontValid")
    back_valid: bool = Field(alias="backValid")
    is_valid: bool = Field(alias="isValid")
    front_confidence: float = Field(alias="frontConfidence")
    back_confidence: float = Field(alias="backConfidence")
    threshold: float

    model_config = {"populate_by_name": True}
