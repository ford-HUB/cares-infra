"""UCLM department and course constants for OCR fuzzy matching."""

import re

DEPARTMENT_NAMES = [
    "College of Maritime Engineering",
    "College of Teacher Education (BSED)",
    "College of Maritime Transportation",
    "College of Nursing",
    "Senior High School Department",
    "College of Teacher Education (BEED)",
    "College of Business and Accountancy",
    "College of Computer Studies",
    "College of Criminology",
    "College of Customs Administration",
    "College of Engineering",
    "College of Hospitality and Tourism Management",
    "Basic Education (Junior High School)",
    "Basic Education (Elementary)",
    "Non-Teaching Personnel",
]

COURSES_BY_DEPARTMENT: dict[str, list[str]] = {
    "College of Maritime Engineering": [
        "BSMarE - Bachelor of Science in Marine Engineering",
    ],
    "College of Teacher Education (BSED)": [
        "BSED - Bachelor of Secondary Education",
    ],
    "College of Maritime Transportation": [
        "BSMT - Bachelor of Science in Marine Transportation",
    ],
    "College of Nursing": [
        "BSN - Bachelor of Science in Nursing",
    ],
    "Senior High School Department": [
        "SHS - Senior High School",
    ],
    "College of Teacher Education (BEED)": [
        "BEED - Bachelor of Elementary Education",
    ],
    "College of Business and Accountancy": [
        "BSA - Bachelor of Science in Accountancy",
        "BSBA - Bachelor of Science in Business Administration",
        "BSMA - Bachelor of Science in Management Accounting",
    ],
    "College of Computer Studies": [
        "BSIT - Bachelor of Science in Information Technology",
        "BSCS - Bachelor of Science in Computer Science",
    ],
    "College of Criminology": [
        "BSCrim - Bachelor of Science in Criminology",
    ],
    "College of Customs Administration": [
        "BSCA - Bachelor of Science in Customs Administration",
    ],
    "College of Engineering": [
        "BSCE - Bachelor of Science in Civil Engineering",
        "BSEE - Bachelor of Science in Electrical Engineering",
        "BSECE - Bachelor of Science in Electronics Engineering",
        "BSME - Bachelor of Science in Mechanical Engineering",
        "BSIE - Bachelor of Science in Industrial Engineering",
        "BSCpE - Bachelor of Science in Computer Engineering",
    ],
    "College of Hospitality and Tourism Management": [
        "BSHM - Bachelor of Science in Hospitality Management",
        "BSTM - Bachelor of Science in Tourism Management",
    ],
    "Basic Education (Junior High School)": [
        "JHS - Junior High School",
    ],
    "Basic Education (Elementary)": [
        "ES - Elementary School",
    ],
    "Non-Teaching Personnel": [
        "NT - Non-Teaching Personnel",
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
