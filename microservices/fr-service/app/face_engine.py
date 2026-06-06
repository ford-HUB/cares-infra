from __future__ import annotations

import logging
from dataclasses import dataclass

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FaceEmbeddingResult:
    embedding: list[float]
    det_score: float


class FaceEngine:
    def __init__(self) -> None:
        self._app: FaceAnalysis | None = None

    def load(self) -> None:
        if self._app is not None:
            return

        logger.info(
            "Loading InsightFace model=%s ctx_id=%s det_size=%s",
            settings.model_name,
            settings.ctx_id,
            settings.det_size,
        )
        app = FaceAnalysis(name=settings.model_name, providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=settings.ctx_id, det_size=(settings.det_size, settings.det_size))
        self._app = app
        logger.info("InsightFace model ready")

    @property
    def app(self) -> FaceAnalysis:
        if self._app is None:
            raise RuntimeError("Face engine is not loaded")
        return self._app

    @staticmethod
    def decode_image(data: bytes) -> np.ndarray:
        image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image bytes")
        return image

    def extract_from_bytes(self, data: bytes) -> FaceEmbeddingResult:
        image = self.decode_image(data)
        return self.extract_from_image(image)

    def extract_from_image(self, image: np.ndarray) -> FaceEmbeddingResult:
        faces = self.app.get(image)
        if not faces:
            raise ValueError("No face detected")

        face = max(
            faces,
            key=lambda item: (item.bbox[2] - item.bbox[0]) * (item.bbox[3] - item.bbox[1]),
        )
        embedding = self._normalize(face.embedding.tolist())
        return FaceEmbeddingResult(embedding=embedding, det_score=float(face.det_score))

    def average_embeddings(self, embeddings: list[list[float]]) -> list[float]:
        if not embeddings:
            raise ValueError("No embeddings to average")

        matrix = np.array(embeddings, dtype=np.float32)
        mean = np.mean(matrix, axis=0)
        return self._normalize(mean.tolist())

    @staticmethod
    def cosine_similarity(reference: list[float], probe: list[float]) -> float:
        ref = np.array(reference, dtype=np.float32)
        prb = np.array(probe, dtype=np.float32)
        ref_norm = np.linalg.norm(ref)
        prb_norm = np.linalg.norm(prb)
        if ref_norm == 0 or prb_norm == 0:
            return 0.0
        return float(np.dot(ref, prb) / (ref_norm * prb_norm))

    @staticmethod
    def _normalize(values: list[float]) -> list[float]:
        vector = np.array(values, dtype=np.float32)
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector.tolist()
        return (vector / norm).tolist()


face_engine = FaceEngine()
