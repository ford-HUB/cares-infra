"""Student ID extraction checks using OCR text shaped like the UCLM ID dataset."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ocr_engine import _extract_id_number  # noqa: E402

UCLM_BACK = (
    "IN CASE OF EMERGENCY, PLEASE NOTIFY\n"
    "NAME : MARY CRIS B. PESQUERA\n"
    "ADDRESS : DECA HOMES 4, BANKAL, LLC\n"
    "TEL. NO. : 09435291030\n"
    "STUDENT'S BIRTHDATE : 10/28/2004\n"
    "SCH. YR. 1ST SEM. 2ND SEM. SUMMER\n"
    "2023-2024\n"
    "2024-2025\n"
    "2026-2027\n"
    "NON-TRANSFERABLE\n"
)

CASES = [
    ("number above label", "UNIVERSITY OF CEBU\n24247447\nID NO ____\nNAME\nBEA B. PESQUERA", "", "24247447"),
    ("number merged on label", "ID NO 24247447 ________\nNAME BEA B. PESQUERA", "", "24247447"),
    ("number below label", "ID NO: ______\n24247447\nNAME", "", "24247447"),
    ("OCR letter noise", "2424744B\nlD NO ____", "", "24247448"),
    ("O read for zero", "23O62216\nID NO", "", "23062216"),
    ("hyphenated", "ID NO. 24-247447", "", "24247447"),
    ("no label (real capture)", "_ ~ 23262216 '\n' NAME |\n, CRIS DYFORD C. BONGHANOY", "", "23262216"),
    ("front wins over back", "24247447\nID NO", UCLM_BACK, "24247447"),
    ("back only: no school year/phone/date", "", UCLM_BACK, ""),
    ("unreadable front + back", "st 7 . f » |\na. | \"WS", UCLM_BACK, ""),
    ("phone on front ignored", "TEL 09435291030\n24247447", "", "24247447"),
    ("back ID-like number ignored", "", "ID NO 24247447\n" + UCLM_BACK, ""),
    ("school year on front ignored", "SY 2024-2025\n24247447", "", "24247447"),
    ("9 digits rejected", "ID NO 242474471", "", ""),
    ("7 digits rejected", "ID NO 2424744", "", ""),
]

failures = 0
for name, front, back, expected in CASES:
    actual = _extract_id_number(front)  # back must never matter
    status = "ok" if actual == expected else "FAIL"
    if actual != expected:
        failures += 1
    print(f"[{status}] {name}: expected={expected!r} actual={actual!r}")

print(f"\n{len(CASES) - failures}/{len(CASES)} passed")
sys.exit(1 if failures else 0)
