from pydantic import BaseModel, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


class MatchEvent(BaseModel):
    id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="", max_length=4000)


class MatchInterest(BaseModel):
    """One row of the server's Interest catalog. The code is the join key."""

    code: str = Field(..., min_length=1, max_length=64)
    label: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class MatchBody(BaseModel):
    events: list[MatchEvent] = Field(..., min_length=1, max_length=200)
    interests: list[MatchInterest] = Field(..., min_length=1, max_length=50)
    threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    top_k: int | None = Field(default=None, ge=1, le=20)


class InterestScore(BaseModel):
    code: str
    score: float
    semantic: float
    lexical: float


class EventMatch(BaseModel):
    event_id: int
    interests: list[InterestScore]


class MatchResult(BaseModel):
    model: str
    threshold: float
    matches: list[EventMatch]
