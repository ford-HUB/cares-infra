from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiResponse(BaseModel):
    ok: bool
    message: str | None = None
    data: dict | None = None
    errors: dict | None = None


# ---------------------------------------------------------------------------
# Survey vocabulary — mirrors site/src/types/residential-needs.ts
# ---------------------------------------------------------------------------

NeedCategory = Literal["food", "healthcare", "education", "livelihood", "financial", "other"]
# The named Q1 categories the model flags — "Other" is free text, so it is left out.
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
# Feature order the model clusters on; the response centroid is keyed the same way.
FEATURE_KEYS: list[str] = ["members", "seriousness", *CLUSTER_NEEDS]


# ---------------------------------------------------------------------------
# Request (camelCase on the wire, as the portal's Household rows are shaped)
# ---------------------------------------------------------------------------


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
    # Groups to find. Omitted → Settings.default_k. Clamped to the row count.
    k: int | None = Field(default=None, ge=1, le=50)
    # Random start for k-means++; the same seed over the same rows is reproducible.
    seed: int = Field(default=0, ge=0)
    max_iterations: int | None = Field(default=None, alias="maxIterations", ge=1, le=1000)


# ---------------------------------------------------------------------------
# Response (camelCase — the portal's NeedsClusteringResult, field for field)
# ---------------------------------------------------------------------------


class ClusterBarangay(BaseModel):
    name: str
    count: int
    # `count` over the cluster's size — how concentrated the group is there.
    share: float


class NeedsCluster(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # 0-based, ordered highest need first — cluster 0 is the group to serve first.
    index: int
    household_ids: list[str] = Field(..., alias="householdIds")
    # Mean of every feature over the members, in original units; a need category
    # is the share of members (0–1) who ticked it.
    centroid: dict[str, float]
    dominant_need: ClusterNeed = Field(..., alias="dominantNeed")
    top_barrier: NeedBarrier = Field(..., alias="topBarrier")
    priority: NeedPriority = Field(...)
    barangay: ClusterBarangay
    # Mean seriousness weighted by how many needs the members ticked — the number
    # the clusters are ranked on. Higher means a group in deeper need.
    need_level: float = Field(..., alias="needLevel")


class ClusterResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    k: int
    clusters: list[NeedsCluster]
    assignments: dict[str, int]
    # Sum of squared distances to centroids in standardised feature space.
    inertia: float
    iterations: int
    converged: bool
    seed: int
    algorithm: str = "sklearn.cluster.KMeans"
    features: list[str] = Field(default_factory=lambda: list(FEATURE_KEYS))
