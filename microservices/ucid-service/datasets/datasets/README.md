# UCID training dataset

Place UCLM student ID images here before running `scripts/train.py`.

## Folder layout

```
datasets/
├── front/
│   ├── train/
│   │   ├── valid/     # real UCLM ID front photos
│   │   └── invalid/   # selfies, screenshots, other docs, blank images
│   └── val/
│       ├── valid/
│       └── invalid/
└── back/
    ├── train/
    │   ├── valid/     # real UCLM ID back photos
    │   └── invalid/
    └── val/
        ├── valid/
        └── invalid/
```

## Guidelines

- Use `.jpg` or `.png` images only.
- Aim for **50+ images per class** for a usable v1 model.
- `valid/` — clear photos of the correct ID side (varied lighting, angles, backgrounds).
- `invalid/` — anything that should be rejected: wrong side, non-ID photos, blurry captures.
- Images in this folder are gitignored — they will not be committed.

## Train

```bash
cd microservices/ucid-service
pip install -r requirements.txt
python scripts/train.py
```

Models are saved to `models/front_classifier.keras` and `models/back_classifier.keras`.
