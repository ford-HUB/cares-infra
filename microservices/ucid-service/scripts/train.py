"""Train front/back UCLM ID classifiers using transfer learning."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import tensorflow as tf

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402

SIDES = ("front", "back")
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")


def count_images(directory: Path) -> int:
    if not directory.exists():
        return 0
    return sum(
        1
        for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def ensure_dataset_ready(side: str, dataset_dir: Path) -> None:
    train_dir = dataset_dir / side / "train"
    val_dir = dataset_dir / side / "val"

    for split_dir in (train_dir, val_dir):
        for label in ("valid", "invalid"):
            path = split_dir / label
            if count_images(path) == 0:
                raise SystemExit(
                    f"No images found in {path}. "
                    "Add training images before running train.py."
                )


def build_model(input_size: int) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        input_shape=(input_size, input_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = False

    inputs = tf.keras.Input(shape=(input_size, input_size, 3))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(1, activation="sigmoid")(x)
    return tf.keras.Model(inputs, outputs)


def make_datasets(side: str, dataset_dir: Path, input_size: int, batch_size: int):
    train_dir = dataset_dir / side / "train"
    val_dir = dataset_dir / side / "val"

    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        labels="inferred",
        label_mode="binary",
        class_names=["invalid", "valid"],
        image_size=(input_size, input_size),
        batch_size=batch_size,
        shuffle=True,
        seed=42,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        val_dir,
        labels="inferred",
        label_mode="binary",
        class_names=["invalid", "valid"],
        image_size=(input_size, input_size),
        batch_size=batch_size,
        shuffle=False,
    )

    augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomRotation(0.05),
            tf.keras.layers.RandomZoom(0.1),
            tf.keras.layers.RandomBrightness(0.1),
        ]
    )

    autotune = tf.data.AUTOTUNE
    train_ds = (
        train_ds.map(lambda x, y: (augmentation(x, training=True), y), num_parallel_calls=autotune)
        .prefetch(autotune)
    )
    val_ds = val_ds.prefetch(autotune)
    return train_ds, val_ds


def train_side(side: str, dataset_dir: Path, model_dir: Path, input_size: int) -> None:
    ensure_dataset_ready(side, dataset_dir)
    print(f"\n=== Training {side} classifier ===")

    batch_size = int(os.getenv("BATCH_SIZE", "16"))
    epochs = int(os.getenv("EPOCHS", "15"))

    train_ds, val_ds = make_datasets(side, dataset_dir, input_size, batch_size)
    model = build_model(input_size)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=3,
            restore_best_weights=True,
        ),
    ]

    history = model.fit(train_ds, validation_data=val_ds, epochs=epochs, callbacks=callbacks)

    val_loss, val_accuracy = model.evaluate(val_ds, verbose=0)
    print(f"{side} val_loss={val_loss:.4f} val_accuracy={val_accuracy:.4f}")

    best_epoch = len(history.history["val_accuracy"])
    if history.history["val_accuracy"]:
        best_acc = max(history.history["val_accuracy"])
        best_epoch = history.history["val_accuracy"].index(best_acc) + 1
        print(f"{side} best val_accuracy={best_acc:.4f} at epoch {best_epoch}")

    model_dir.mkdir(parents=True, exist_ok=True)
    output_path = model_dir / f"{side}_classifier.keras"
    model.save(output_path)
    print(f"Saved {side} model to {output_path}")
    print(
        f"Tune VALID_THRESHOLD in .env if needed (default {settings.valid_threshold}). "
        "Lower threshold accepts more images; raise it to reduce false positives."
    )


def main() -> None:
    dataset_dir = Path(os.getenv("DATASET_DIR", settings.dataset_dir))
    model_dir = Path(os.getenv("MODEL_DIR", settings.model_dir))
    input_size = int(os.getenv("INPUT_SIZE", settings.input_size))

    if not dataset_dir.exists():
        raise SystemExit(f"Dataset directory not found: {dataset_dir}")

    model_dir.mkdir(parents=True, exist_ok=True)

    for side in SIDES:
        train_side(side, dataset_dir, model_dir, input_size)

    print("\nTraining complete. Restart ucid-service to load the new models.")


if __name__ == "__main__":
    main()
