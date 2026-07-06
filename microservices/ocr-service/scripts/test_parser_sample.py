"""Quick parser check using captured raw OCR text from a real UCLM ID."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ocr_engine import count_populated_fields, ocr_engine  # noqa: E402

RAW_BACK = (
    "S CASE OF EMERGENCY PLEASE NOTE!\n"
    "Satna, WP NAME MARY CRIS B. PESQUERA\n"
    "a ADDRESS. DECA HOMES 4, BANKAL, LLC\n"
    ": . MB TEL NO.. 09435291030\n"
    "STUDENTS BIRTHDATE : 10/26/2004\n"
)

parsed = ocr_engine.parse_id_text("", RAW_BACK)
print("populated:", count_populated_fields(parsed))
for field, value in parsed.__dict__.items():
    print(f"  {field}: {value!r}")
