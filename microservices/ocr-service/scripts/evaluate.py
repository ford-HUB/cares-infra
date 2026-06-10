"""Evaluate OCR extraction against local ID image pairs.

Usage:
    cd microservices/ocr-service
    python scripts/evaluate.py --front path/to/front.jpg --back path/to/back.jpg
    python scripts/evaluate.py --dataset ../ucid-service/datasets
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ocr_engine import count_populated_fields, ocr_engine  # noqa: E402


def evaluate_pair(front_path: Path, back_path: Path) -> None:
    front_bytes = front_path.read_bytes()
    back_bytes = back_path.read_bytes()

    try:
        front_text = ocr_engine.extract_text(front_bytes)
    except Exception as exc:
        print(f"\n=== {front_path.name} / {back_path.name} ===")
        print(f"OCR failed: {exc}")
        print("Install Tesseract locally or run evaluate inside the ocr-service Docker container.")
        return

    try:
        back_text = ocr_engine.extract_text(back_bytes)
    except Exception as exc:
        print(f"\n=== {front_path.name} / {back_path.name} ===")
        print(f"OCR failed on back image: {exc}")
        return

    parsed = ocr_engine.parse_id_text(front_text, back_text)

    print(f"\n=== {front_path.name} / {back_path.name} ===")
    print(f"front_bytes={len(front_bytes)} back_bytes={len(back_bytes)}")
    print(f"front_text_len={len(front_text)} back_text_len={len(back_text)}")
    print(f"populated_fields={count_populated_fields(parsed)}")
    print("--- raw front ---")
    print(front_text or "(empty)")
    print("--- raw back ---")
    print(back_text or "(empty)")
    print("--- parsed ---")
    print(f"  firstname: {parsed.firstname}")
    print(f"  middle_name: {parsed.middle_name}")
    print(f"  lastname: {parsed.lastname}")
    print(f"  gender: {parsed.gender}")
    print(f"  age: {parsed.age}")
    print(f"  current_address: {parsed.current_address}")
    print(f"  phone_number: {parsed.phone_number}")
    print(f"  id_number: {parsed.id_number}")
    print(f"  department_name: {parsed.department_name}")
    print(f"  major_name: {parsed.major_name}")
    print(f"  year_level_name: {parsed.year_level_name}")
    print(f"  graduation: {parsed.graduation_month}/{parsed.graduation_day}/{parsed.graduation_year}")


def collect_dataset_pairs(dataset_root: Path) -> list[tuple[Path, Path]]:
    pairs: list[tuple[Path, Path]] = []
    front_valid = dataset_root / "front" / "train" / "valid"
    back_valid = dataset_root / "back" / "train" / "valid"

    if not front_valid.exists() or not back_valid.exists():
        return pairs

    front_files = sorted(front_valid.glob("*.jpg")) + sorted(front_valid.glob("*.jpeg")) + sorted(front_valid.glob("*.png"))
    back_files = sorted(back_valid.glob("*.jpg")) + sorted(back_valid.glob("*.jpeg")) + sorted(back_valid.glob("*.png"))

    if front_files and back_files:
        for front in front_files:
            pairs.append((front, back_files[0]))
        return pairs

    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate OCR extraction locally")
    parser.add_argument("--front", type=Path, help="Front ID image path")
    parser.add_argument("--back", type=Path, help="Back ID image path")
    parser.add_argument(
        "--dataset",
        type=Path,
        help="UCID dataset root (uses front/train/valid and back/train/valid)",
    )
    args = parser.parse_args()

    pairs: list[tuple[Path, Path]] = []

    if args.front and args.back:
        pairs.append((args.front, args.back))
    elif args.dataset:
        pairs = collect_dataset_pairs(args.dataset)
    else:
        parser.error("Provide --front and --back, or --dataset")

    if not pairs:
        print("No image pairs found.")
        sys.exit(1)

    for front, back in pairs:
        evaluate_pair(front, back)


if __name__ == "__main__":
    main()
