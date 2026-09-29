import logging
import re
import threading

import numpy as np

from app.config import settings
from app.interest_lexicon import INTEREST_LEXICON, INTEREST_PROTOTYPES
from app.schemas import EventMatch, InterestScore, MatchEvent, MatchInterest

logger = logging.getLogger(__name__)

_WORD_RE = re.compile(r"[a-z0-9]+(?:[-'][a-z0-9]+)*")


def _normalise(text: str) -> str:
    """Lowercase and collapse whitespace so lexicon phrases match across line breaks."""
    return " ".join(_WORD_RE.findall(text.lower()))


class NlpEngine:
    """
    Sentence-embedding matcher between event copy and the interest catalog.

    Each interest becomes a small set of prototype sentences — "Health: Medical
    missions and wellness drives", the example blurbs in INTEREST_PROTOTYPES, then
    one per lexicon term ("Health: blood donation") — and its semantic score is the
    best cosine against any of them.
    One long sentence stuffed with every keyword embeds to a blur that matches
    nothing well; short focused prototypes keep each facet sharp. Each event becomes
    `title. title. description`; the title is repeated because it is the strongest
    signal and would otherwise be drowned by a long description. The semantic score
    is then blended with a lexical hit rate so that local vocabulary the model does
    not know still counts, but never below the raw cosine — a clear semantic match
    with no keyword hits must still pass.
    """

    def __init__(self) -> None:
        self.model = None
        self.model_loaded = False
        self._lock = threading.Lock()
        # Interest prototypes rarely change between calls; keyed by their text.
        # Value: (embeddings, owner index per row) so rows map back to interests.
        self._prototype_cache: dict[tuple[str, ...], tuple[np.ndarray, np.ndarray]] = {}

    def load(self) -> None:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading sentence model %s", settings.model_name)
        self.model = SentenceTransformer(settings.model_name, device="cpu")
        self.model_loaded = True
        logger.info("Sentence model ready")

    # ---- prototypes ---------------------------------------------------------

    @staticmethod
    def _prototype_texts(interest: MatchInterest) -> list[str]:
        head = interest.label
        texts = [f"{head}: {interest.description}" if interest.description else head]
        code = interest.code.upper()
        texts.extend(INTEREST_PROTOTYPES.get(code, ()))
        for term in INTEREST_LEXICON.get(code, ()):
            texts.append(f"{head}: {term}")
        return texts

    def _embed(self, texts: list[str]) -> np.ndarray:
        assert self.model is not None
        return self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            batch_size=32,
            show_progress_bar=False,
        )

    def _interest_embeddings(
        self, interests: list[MatchInterest]
    ) -> tuple[np.ndarray, np.ndarray]:
        """All prototype vectors stacked, plus the interest index each row belongs to."""
        texts: list[str] = []
        owners: list[int] = []
        for index, interest in enumerate(interests):
            prototypes = self._prototype_texts(interest)
            texts.extend(prototypes)
            owners.extend([index] * len(prototypes))

        key = tuple(texts)
        with self._lock:
            cached = self._prototype_cache.get(key)
        if cached is not None:
            return cached

        entry = (self._embed(texts), np.asarray(owners))
        with self._lock:
            if len(self._prototype_cache) > 32:
                self._prototype_cache.clear()
            self._prototype_cache[key] = entry
        return entry

    # ---- scoring ------------------------------------------------------------

    @staticmethod
    def _lexical_score(event_text: str, code: str) -> float:
        """Share of an interest's vocabulary present in the event, saturating at 3 hits."""
        lexicon = INTEREST_LEXICON.get(code.upper(), ())
        if not lexicon:
            return 0.0
        padded = f" {event_text} "
        hits = sum(1 for term in lexicon if f" {_normalise(term)} " in padded)
        return min(hits, 3) / 3.0

    def match(
        self,
        events: list[MatchEvent],
        interests: list[MatchInterest],
        threshold: float,
        top_k: int,
    ) -> list[EventMatch]:
        prototype_vectors, owners = self._interest_embeddings(interests)
        event_texts = [f"{e.title}. {e.title}. {e.description}".strip() for e in events]
        event_vectors = self._embed(event_texts)

        # Both sides are unit vectors, so the dot product is the cosine similarity.
        # Reduce prototype rows to one column per interest by taking the best one.
        per_prototype = event_vectors @ prototype_vectors.T
        similarity = np.full((len(events), len(interests)), -1.0)
        for col in range(len(interests)):
            rows = per_prototype[:, owners == col]
            if rows.size:
                similarity[:, col] = rows.max(axis=1)
        weight = settings.semantic_weight

        results: list[EventMatch] = []
        for row, event in enumerate(events):
            normalised = _normalise(f"{event.title} {event.description}")
            scored: list[InterestScore] = []
            for col, interest in enumerate(interests):
                semantic = float(np.clip(similarity[row, col], 0.0, 1.0))
                lexical = self._lexical_score(normalised, interest.code)
                score = max(semantic, weight * semantic + (1.0 - weight) * lexical)
                if score >= threshold:
                    scored.append(
                        InterestScore(
                            code=interest.code,
                            score=round(score, 4),
                            semantic=round(semantic, 4),
                            lexical=round(lexical, 4),
                        )
                    )
            scored.sort(key=lambda s: s.score, reverse=True)
            results.append(EventMatch(event_id=event.id, interests=scored[:top_k]))

        return results


nlp_engine = NlpEngine()
