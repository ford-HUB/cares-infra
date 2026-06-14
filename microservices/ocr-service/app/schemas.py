from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


class IdExtractResult(BaseModel):
    firstname: str = ""
    lastname: str = ""
    middleName: str = ""
    gender: str = ""
    age: int = 0
    currentAddress: str = ""
    phoneNumber: str = ""
    idNumber: str = ""
    departmentName: str = ""
    majorName: str = ""
    yearLevelName: str = ""
    graduationYear: int = 0
    graduationMonth: int = 0
    graduationDay: int = 0
    volunteerType: str = "STUDENT"
    rawTextFront: str = Field(default="", alias="rawTextFront")
    rawTextBack: str = Field(default="", alias="rawTextBack")

    model_config = {"populate_by_name": True}
