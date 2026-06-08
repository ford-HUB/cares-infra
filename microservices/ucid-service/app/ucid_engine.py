import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
import tensorflow as tf

from app.config import settings

logger = logging.getLogger(__name__)

Side = Literal["front", "back"]


@dataclass
class SideResult:
    valid: bool
    confidence: float
    label: str


@dataclass
class PairResult:
    front: SideResult
    back: SideResult
    is_valid: bool
    threshold: float


class UcidEngine:
    def __init__(self) -> None:
        self._front_model: tf.keras.Model | None = None
        self._back_model: tf.keras.Model | None = None
        self._model_dir = Path(settings.model_dir)

    @property
    def model_loaded(self) -> bool:
        return self._front_model is not None and self._back_model is not None

    def load(self) -> None:
        front_path = self._model_dir / settings.front_model_file
        back_path = self._model_dir / settings.back_model_file

        if not front_path.exists():
            logger.warning("Front classifier not found at %s", front_path)
        else:
            self._front_model = tf.keras.models.load_model(front_path)
            logger.info("Loaded front classifier from %s", front_path)

        if not back_path.exists():
            logger.warning("Back classifier not found at %s", back_path)
        else:
            self._back_model = tf.keras.models.load_model(back_path)
            logger.info("Loaded back classifier from %s", back_path)

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Invalid image data")

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (settings.input_size, settings.input_size))
        # Model includes MobileNetV2 preprocess_input — expects 0-255 RGB float32
        batch = resized.astype(np.float32)
        return np.expand_dims(batch, axis=0)

    def _get_model(self, side: Side) -> tf.keras.Model:
        model = self._front_model if side == "front" else self._back_model
        if model is None:
            raise RuntimeError(
                "UCID models not trained yet — run scripts/train.py after adding dataset images"
            )
        return model

    def validate_side(self, image_bytes: bytes, side: Side) -> SideResult:
        model = self._get_model(side)
        batch = self._preprocess(image_bytes)
        prediction = float(model.predict(batch, verbose=0)[0][0])
        valid = prediction >= settings.valid_threshold
        label = "valid" if valid else "invalid"
        return SideResult(valid=valid, confidence=prediction, label=label)

    def validate_pair(self, front_bytes: bytes, back_bytes: bytes) -> PairResult:
        front = self.validate_side(front_bytes, "front")
        back = self.validate_side(back_bytes, "back")
        return PairResult(
            front=front,
            back=back,
            is_valid=front.valid and back.valid,
            threshold=settings.valid_threshold,
        )


ucid_engine = UcidEngine()
