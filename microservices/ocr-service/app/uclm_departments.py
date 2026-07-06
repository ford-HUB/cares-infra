"""UCLM department and course constants for OCR fuzzy matching."""

import re

DEPARTMENT_NAMES = [
    "College of Teacher Education",
    "College of Hospitality & Tourism Management",
    "College of Computer Studies",
    "College of Nursing",
    "College of Maritime",
    "College of Business Administration",
    "College of Customs Administration",
    "College of Bussines & Accountancy",
    "College of Engeneering",
    "Senior High Department",
]

COURSES_BY_DEPARTMENT: dict[str, list[str]] = {
    "College of Teacher Education": [
        "BSED - Bachelor of Secondary Education",
        "BEED - Bachelor of Elementary Education",
        "BTLEd - Bachelor of Technology and Livelihood Education",
    ],
    "College of Hospitality & Tourism Management": [
        "BSHM - Bachelor of Science in Hospitality Management",
        "BSTM - Bachelor of Science in Tourism Management",
    ],
    "College of Computer Studies": [
        "BSIT - Bachelor of Science in Information Technology",
        "BSCS - Bachelor of Science in Computer Science",
    ],
    "College of Nursing": [
        "BSN - Bachelor of Science in Nursing",
    ],
    "College of Maritime": [
        "BSMarE - Bachelor of Science in Marine Engineering",
        "BSMT - Bachelor of Science in Marine Transportation",
    ],
    "College of Business Administration": [
        "BSBA-Marketing - Bachelor of Science in Business Administration Major in Marketing",
        "BSBA-HRM - Bachelor of Science in Business Administration Major in HRM",
    ],
    "College of Customs Administration": [
        "BSCA - Bachelor of Science in Customs Administration",
    ],
    "College of Bussines & Accountancy": [
        "BSBA - Bachelor of Science in Business Administration",
        "BSA - Bachelor of Science in Accountancy",
    ],
    "College of Engeneering": [
        "BSCpE - Bachelor of Science in Computer Engineering",
        "BSEE - Bachelor of Science in Electrical Engineering",
        "BSCE - Bachelor of Science in Civil Engineering",
    ],
    "Senior High Department": [
        "STEM - Science, Technology, Engineering, and Mathematics",
        "ABM - Accountancy, Business, and Management",
        "HUMSS - Humanities and Social Sciences",
        "GAS - General Academic Strand",
        "ICT - Information and Communications Technology",
        "HE - Home Economics",
        "IA - Industrial Arts",
    ],
}


def courses_for(department: str) -> list[str]:
    return COURSES_BY_DEPARTMENT.get(department, [])


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def match_department(extracted: str) -> str | None:
    normalized = _normalize(extracted)
    if not normalized:
        return None

    for name in DEPARTMENT_NAMES:
        if name.lower() == normalized:
            return name

    best: str | None = None
    best_score = 0
    for name in DEPARTMENT_NAMES:
        lower = name.lower()
        if lower in normalized or normalized in lower:
            score = min(len(normalized), len(lower))
            if score > best_score:
                best = name
                best_score = score

    return best


def match_department_in_text(text: str) -> str | None:
    for line in text.splitlines():
        matched = match_department(line)
        if matched:
            return matched

    combined = _normalize(text)
    return match_department(combined)


def match_course(department: str, extracted: str) -> str | None:
    courses = courses_for(department)
    if not courses:
        return None

    normalized = _normalize(extracted)
    if not normalized:
        return None

    for course in courses:
        if course.lower() == normalized:
            return course

    for course in courses:
        lower = course.lower()
        abbreviation = lower.split(" - ")[0]
        if (
            lower in normalized
            or normalized in lower
            or abbreviation in normalized
            or normalized in abbreviation
        ):
            return course

    return None


def match_course_in_text(department: str, text: str) -> str | None:
    for line in text.splitlines():
        matched = match_course(department, line)
        if matched:
            return matched
    return match_course(department, text)
