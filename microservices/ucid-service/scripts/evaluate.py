"""Evaluate UCID classifiers on train/val datasets and report per-image scores."""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def load_images(directory: Path) -> list[tuple[Path, int]]:
    label = 1 if directory.name == "valid" else 0
    files = sorted(
        path
        for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )
    return [(path, label) for path in files]


def predict(model: tf.keras.Model, image_path: Path, input_size: int) -> float:
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not read {image_path}")

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (input_size, input_size))
    batch = np.expand_dims(resized.astype(np.float32), axis=0)
    return float(model.predict(batch, verbose=0)[0][0])


def evaluate_side(side: str, threshold: float, input_size: int) -> None:
    model_path = Path(settings.model_dir) / f"{side}_classifier.keras"
    if not model_path.exists():
        print(f"\n[{side}] model not found: {model_path}")
        return

    model = tf.keras.models.load_model(model_path)
    dataset_dir = Path(settings.dataset_dir) / side

    print(f"\n{'=' * 60}")
    print(f"{side.upper()} classifier — threshold={threshold}")
    print(f"{'=' * 60}")

    for split in ("train", "val"):
        split_dir = dataset_dir / split
        if not split_dir.exists():
            continue

        all_items: list[tuple[Path, int]] = []
        for label_dir in ("valid", "invalid"):
            all_items.extend(load_images(split_dir / label_dir))

        if not all_items:
            continue

        correct = 0
        false_positives: list[tuple[str, float]] = []
        false_negatives: list[tuple[str, float]] = []

        for path, expected in all_items:
            score = predict(model, path, input_size)
            predicted = 1 if score >= threshold else 0
            if predicted == expected:
                correct += 1
            elif expected == 0 and predicted == 1:
                false_positives.append((path.name, score))
            else:
                false_negatives.append((path.name, score))

        total = len(all_items)
        accuracy = correct / total
        print(f"\n{split}: {correct}/{total} correct ({accuracy:.1%})")

        valid_scores = [predict(model, p, input_size) for p, label in all_items if label == 1]
        invalid_scores = [predict(model, p, input_size) for p, label in all_items if label == 0]

        if valid_scores:
            print(
                f"  valid   scores: min={min(valid_scores):.3f} "
                f"avg={sum(valid_scores)/len(valid_scores):.3f} "
                f"max={max(valid_scores):.3f}"
            )
        if invalid_scores:
            print(
                f"  invalid scores: min={min(invalid_scores):.3f} "
                f"avg={sum(invalid_scores)/len(invalid_scores):.3f} "
                f"max={max(invalid_scores):.3f}"
            )

        if false_negatives:
            print(f"  FALSE NEGATIVES ({len(false_negatives)} rejected valid IDs):")
            for name, score in sorted(false_negatives, key=lambda x: x[1]):
                print(f"    {score:.3f}  {name}")
        if false_positives:
            print(f"  FALSE POSITIVES ({len(false_positives)} accepted invalid):")
            for name, score in sorted(false_positives, key=lambda x: -x[1]):
                print(f"    {score:.3f}  {name}")


def sweep_thresholds(side: str, input_size: int) -> None:
    model_path = Path(settings.model_dir) / f"{side}_classifier.keras"
    if not model_path.exists():
        return

    model = tf.keras.models.load_model(model_path)
    dataset_dir = Path(settings.dataset_dir) / side / "train"

    items: list[tuple[Path, int]] = []
    for label_dir in ("valid", "invalid"):
        items.extend(load_images(dataset_dir / label_dir))

    if not items:
        return

    scores = [(predict(model, path, input_size), label) for path, label in items]

    print(f"\n{side.upper()} threshold sweep (train set):")
    print("  threshold  accuracy  valid_pass  invalid_reject")
    for threshold in [0.50, 0.60, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95]:
        correct = sum(
            1 for score, label in scores if (score >= threshold) == bool(label)
        )
        valid_pass = sum(1 for score, label in scores if label == 1 and score >= threshold)
        valid_total = sum(1 for _, label in scores if label == 1)
        invalid_reject = sum(1 for score, label in scores if label == 0 and score < threshold)
        invalid_total = sum(1 for _, label in scores if label == 0)
        accuracy = correct / len(scores)
        print(
            f"  {threshold:.2f}       {accuracy:.1%}     "
            f"{valid_pass}/{valid_total}        {invalid_reject}/{invalid_total}"
        )


def main() -> None:
    threshold = settings.valid_threshold
    input_size = settings.input_size

    for side in ("front", "back"):
        evaluate_side(side, threshold, input_size)
        sweep_thresholds(side, input_size)


if __name__ == "__main__":
    main()
