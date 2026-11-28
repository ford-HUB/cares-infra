from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


# Mirrors site/src/types/residential-needs.ts

NeedCategory = Literal["food", "healthcare", "education", "livelihood", "financial", "other"]
# "other" is free text, so not a clustering feature.
ClusterNeed = Literal["food", "healthcare", "education", "livelihood", "financial"]
NeedBarrier = Literal[
    "money",
    "services",
    "distance",
    "information",
    "documents",
    "opportunities",
    "other",
    "none",
]
CommunityProblem = Literal[
    "food", "healthcare", "education", "livelihood", "financial", "environmental", "other"
]
NeedPriority = Literal["critical", "high", "moderate", "low"]

CLUSTER_NEEDS: list[ClusterNeed] = ["food", "healthcare", "education", "livelihood", "financial"]
BARRIER_ORDER: list[NeedBarrier] = [
    "money",
    "services",
    "distance",
    "information",
    "documents",
    "opportunities",
    "other",
    "none",
]
# Centroid keys follow this order.
FEATURE_KEYS: list[str] = ["members", "seriousness", *CLUSTER_NEEDS]


# Request: camelCase, as the portal's Household rows.


class HouseholdSurvey(BaseModel):
    """One household's Beneficiary Needs Assessment answers."""

    model_config = ConfigDict(populate_by_name=True)

    needs: list[NeedCategory] = Field(default_factory=list)
    other_need: str | None = Field(default=None, alias="otherNeed")
    seriousness: int = Field(..., ge=1, le=5)
    barriers: list[NeedBarrier] = Field(default_factory=list)
    other_barrier: str | None = Field(default=None, alias="otherBarrier")
    community_problem: CommunityProblem = Field(..., alias="communityProblem")
    other_community_problem: str | None = Field(default=None, alias="otherCommunityProblem")
    concern: str | None = None


class Household(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., min_length=1)
    family_name: str = Field(default="", alias="familyName")
    barangay: str = Field(..., min_length=1)
    members: int = Field(..., ge=1)
    survey: HouseholdSurvey
    surveyed_at: str | None = Field(default=None, alias="surveyedAt")


class ClusterBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    households: list[Household] = Field(default_factory=list)
    # Omitted → Settings.default_k; clamped to the row count.
    k: int | None = Field(default=None, ge=1, le=50)
    # Same seed + same rows is reproducible.
    seed: int = Field(default=0, ge=0)
    max_iterations: int | None = Field(default=None, alias="maxIterations", ge=1, le=1000)


# Response: mirrors the portal's NeedsClusteringResult.


class ClusterBarangay(BaseModel):
    name: str
    count: int
    # count / cluster size.
    share: float


class NeedsCluster(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # 0 = highest need.
    index: int
    household_ids: list[str] = Field(..., alias="householdIds")
    # Feature means in original units; need flags are member shares (0–1).
    centroid: dict[str, float]
    dominant_need: ClusterNeed = Field(..., alias="dominantNeed")
    top_barrier: NeedBarrier = Field(..., alias="topBarrier")
    priority: NeedPriority = Field(...)
    barangay: ClusterBarangay
    # Ranking key; higher = deeper need.
    need_level: float = Field(..., alias="needLevel")


class ClusterResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    k: int
    clusters: list[NeedsCluster]
    assignments: dict[str, int]
    # In standardised feature space.
    inertia: float
    iterations: int
    converged: bool
    seed: int
    algorithm: str = "sklearn.cluster.KMeans"
    features: list[str] = Field(default_factory=lambda: list(FEATURE_KEYS))
