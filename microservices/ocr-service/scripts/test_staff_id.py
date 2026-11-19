"""Staff / faculty ID checks: the employee number after "ID NO." and the
"SURNAME, FIRST M." name are read only when the card is read as a staff ID,
and a student ID reads exactly as before. Mirrors the staff cases in
mobile/test/features/auth/domain/register_ocr_raw_parser_test.dart."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ocr_engine import OcrEngine  # noqa: E402

# A UC Lapu-Lapu & Mandaue "COLLEGE FACULTY" ID, as OCR reads it.
FACULTY_FRONT = (
    "university of cebu\n"
    "LAPU-LAPU & MANDAUE CAMPUS\n"
    "A.C. Cortes Ave., Mandaue City\n"
    "ID NO. 201346\n"
    "REYES, JESIECA C.\n"
    "SIGNATURE\n"
    "COLLEGE FACULTY.\n"
)
STUDENT_FRONT = "UNIVERSITY OF CEBU\n24250698\nID NO\nNAME\nJAY S. ICOY\nSIGNATURE"

engine = OcrEngine()


def read(front: str, staff: bool, id_reread: str = "") -> tuple[str, tuple[str, str, str]]:
    fields = engine.parse_id_text(front, "", id_number=id_reread, staff_id=staff)
    return fields.id_number, (fields.firstname, fields.middle_name, fields.lastname)


CASES = [
    ("faculty ID, read as staff", FACULTY_FRONT, True, "", ("201346", ("JESIECA", "C", "REYES"))),
    ("faculty ID, read as student (unchanged)", FACULTY_FRONT, False, "", ("", ("", "", ""))),
    ("staff number on the line below the label", "ID NO.\n201346\nREYES, JESIECA C.", True, "", ("201346", ("JESIECA", "C", "REYES"))),
    ("staff number with OCR letter noise", "ID NO. 2O1346\nREYES, JESIECA C.", True, "", ("201346", ("JESIECA", "C", "REYES"))),
    ("staff: printed number wins over the student re-read", FACULTY_FRONT, True, "24247447", ("201346", ("JESIECA", "C", "REYES"))),
    ("staff: phone after the label is never an ID", "ID NO. 09435291030\nREYES, JESIECA C.", True, "", ("", ("JESIECA", "C", "REYES"))),
    ("staff: two given names", "ID NO. 1043\nDELA CRUZ, MARIA LUISA B.", True, "", ("", ("MARIA", "LUISA B", "DELA CRUZ"))),
    ("staff: campus line is not a name", "ID NO. 201346\nMANDAUE CITY, CEBU", True, "", ("201346", ("", "", ""))),
    ("student ID, read as student", STUDENT_FRONT, False, "", ("24250698", ("JAY", "S.", "ICOY"))),
    ("student ID, read as staff (student path still works)", STUDENT_FRONT, True, "", ("24250698", ("JAY", "S.", "ICOY"))),
]

failures = 0
for name, front, staff, reread, expected in CASES:
    actual = read(front, staff, reread)
    status = "ok" if actual == expected else "FAIL"
    if actual != expected:
        failures += 1
    print(f"[{status}] {name}: expected={expected!r} actual={actual!r}")

print(f"\n{len(CASES) - failures}/{len(CASES)} passed")
sys.exit(1 if failures else 0)
