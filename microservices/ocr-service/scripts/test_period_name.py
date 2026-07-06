"""Parser test with period-prefixed name (matches live OCR screenshot)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ocr_engine import count_populated_fields, ocr_engine  # noqa: E402

RAW_FRONT = """st 7 . f » |
a. | "WS
. 'hl g
} |
=: of . -
| my n~ F YS
_ ~ 23262216 '
iL NA
' NAME |
. CRIS DYFORD C. BONGHANOY
eeRnce aan"""

RAW_BACK = r"""\ °
IN CASE OF EMERGENCY PLEASE NOTIFY
SON MAR OF Boek UP RA
, [ib a HOME 4 RAMA .
\
' a) N's V5299 0G
et vor k | 4UI2BI2004 - =
+N ie
SCH YR 1ST SEM 2NC SE SLIMMER"""

parsed = ocr_engine.parse_id_text(RAW_FRONT, RAW_BACK)
print("populated:", count_populated_fields(parsed))
for field, value in parsed.__dict__.items():
    if value:
        print(f"  {field}: {value!r}")
