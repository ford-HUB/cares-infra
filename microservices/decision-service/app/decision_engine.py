"""K-means over the needs survey on standardised features; clusters ordered highest need first."""

import logging
from collections import Counter
from dataclasses import dataclass

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.schemas import (
    BARRIER_ORDER,
    CLUSTER_NEEDS,
    FEATURE_KEYS,
    ClusterBarangay,
    ClusterResult,
    Household,
    NeedsCluster,
)

logger = logging.getLogger(__name__)

# Checked top-down; must match NEED_PRIORITY_THRESHOLDS on the portal.
PRIORITY_THRESHOLDS: list[tuple[str, int]] = [
    ("critical", 5),
    ("high", 4),
    ("moderate", 3),
    ("low", 1),
]


def priority_of(seriousness: float) -> str:
    rounded = int(round(seriousness))
    for band, threshold in PRIORITY_THRESHOLDS:
        if rounded >= threshold:
            return band
    return "low"


def feature_vector(household: Household) -> list[float]:
    """One row in FEATURE_KEYS order."""
    ticked = set(household.survey.needs)
    return [
        float(household.members),
        float(household.survey.seriousness),
        *(1.0 if need in ticked else 0.0 for need in CLUSTER_NEEDS),
    ]


@dataclass
class Fit:
    labels: np.ndarray
    inertia: float
    iterations: int
    converged: bool


class DecisionEngine:
    """No weights; load()/model_loaded only keep the shape of sibling services."""

    def __init__(self) -> None:
        self.model_loaded = False

    def load(self) -> None:
        # Surface sklearn import problems at boot.
        KMeans(n_clusters=1, n_init=1).fit(np.zeros((1, 1)))
        self.model_loaded = True
        logger.info("Decision engine ready (scikit-learn KMeans)")

    def fit(self, rows: np.ndarray, k: int, seed: int, max_iterations: int) -> Fit:
        scaled = StandardScaler().fit_transform(rows)
        model = KMeans(
            n_clusters=k,
            init="k-means++",
            n_init=settings.n_init,
            max_iter=max_iterations,
            random_state=seed,
        ).fit(scaled)
        return Fit(
            labels=model.labels_,
            inertia=float(model.inertia_),
            iterations=int(model.n_iter_),
            # Hitting the cap means assignments had not settled.
            converged=int(model.n_iter_) < max_iterations,
        )

    def cluster(
        self,
        households: list[Household],
        k: int,
        seed: int,
        max_iterations: int,
    ) -> ClusterResult:
        if not households:
            return ClusterResult(
                k=0,
                clusters=[],
                assignments={},
                inertia=0.0,
                iterations=0,
                converged=True,
                seed=seed,
            )

        effective_k = min(k, len(households))
        raw = np.array([feature_vector(h) for h in households], dtype=float)
        fit = self.fit(raw, effective_k, seed, max_iterations)

        clusters = [
            self._describe(label, households, raw, fit.labels) for label in range(effective_k)
        ]
        clusters.sort(key=lambda c: (-c.need_level, -len(c.household_ids)))
        for position, cluster in enumerate(clusters):
            cluster.index = position

        assignments: dict[str, int] = {}
        for cluster in clusters:
            for household_id in cluster.household_ids:
                assignments[household_id] = cluster.index

        return ClusterResult(
            k=effective_k,
            clusters=clusters,
            assignments=assignments,
            inertia=round(fit.inertia, 4),
            iterations=fit.iterations,
            converged=fit.converged,
            seed=seed,
        )

    @staticmethod
    def _describe(
        label: int,
        households: list[Household],
        raw: np.ndarray,
        labels: np.ndarray,
    ) -> NeedsCluster:
        member_idx = np.flatnonzero(labels == label)
        members = [households[i] for i in member_idx]

        if len(member_idx):
            centroid_values = raw[member_idx].mean(axis=0)
        else:
            # Empty cluster (repeated rows): keep the slot so indexes stay dense.
            centroid_values = np.zeros(len(FEATURE_KEYS))
        centroid = {
            key: round(float(value), 4) for key, value in zip(FEATURE_KEYS, centroid_values)
        }

        dominant_need = max(CLUSTER_NEEDS, key=lambda need: centroid[need])

        barrier_counts: Counter[str] = Counter()
        for h in members:
            barrier_counts.update(h.survey.barriers)
        top_barrier = (
            min(
                barrier_counts,
                key=lambda b: (-barrier_counts[b], BARRIER_ORDER.index(b)),
            )
            if barrier_counts
            else "none"
        )

        barangay_counts = Counter(h.barangay for h in members)
        if barangay_counts:
            top_name = min(barangay_counts, key=lambda b: (-barangay_counts[b], b))
            top_count = barangay_counts[top_name]
        else:
            top_name, top_count = "—", 0
        barangay = ClusterBarangay(
            name=top_name,
            count=top_count,
            share=round(top_count / len(members), 4) if members else 0.0,
        )

        # Seriousness (1–5) + mean named needs ticked (0–5).
        needs_selected = sum(centroid[need] for need in CLUSTER_NEEDS)
        need_level = round(centroid["seriousness"] + needs_selected, 4)

        return NeedsCluster(
            index=label,
            householdIds=[h.id for h in members],
            centroid=centroid,
            dominantNeed=dominant_need,
            topBarrier=top_barrier,
            priority=priority_of(centroid["seriousness"]),
            barangay=barangay,
            needLevel=need_level,
        )


decision_engine = DecisionEngine()
