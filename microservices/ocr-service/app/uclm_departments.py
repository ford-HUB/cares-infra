"""UCLM department and course constants for OCR fuzzy matching."""

import difflib
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


GENERIC_DEPARTMENT_WORDS = {"college", "of", "the", "and", "department", "school", "basic"}
MIN_DISTINCTIVE_LETTERS = 6


def _distinctive_letters(normalized: str) -> str:
    words = re.findall(r"[a-z]+", normalized)
    return "".join(word for word in words if word not in GENERIC_DEPARTMENT_WORDS)


def _letters_only(text: str) -> str:
    return re.sub(r"[^a-z]", "", text.lower())


def _course_band_keyword(course: str) -> str:
    # "BSIT - Bachelor of Science in Information Technology" -> "informationtechnology",
    # which is how the course is printed on the coloured strip of the ID front.
    title = course.split(" - ", 1)[-1]
    title = re.sub(r"^bachelor\s+of\s+(?:science\s+in\s+)?", "", title, flags=re.IGNORECASE)
    return _letters_only(title)


COURSE_BAND_KEYWORDS: list[tuple[str, str, str]] = sorted(
    (
        (_course_band_keyword(course), department, course)
        for department, courses in COURSES_BY_DEPARTMENT.items()
        for course in courses
    ),
    key=lambda entry: len(entry[0]),
    reverse=True,
)
COURSE_BAND_MIN_RATIO = 0.85


def match_course_band(text: str) -> tuple[str, str] | None:
    """Maps the course strip on a UCLM ID front (e.g. "INFORMATION TECHNOLOGY")
    to its (department, course) pair."""
    lines = [_letters_only(line) for line in text.splitlines()]
    lines = [line for line in lines if len(line) >= 4]

    for keyword, department, course in COURSE_BAND_KEYWORDS:
        if any(keyword in line for line in lines):
            return department, course

    best: tuple[str, str] | None = None
    best_ratio = COURSE_BAND_MIN_RATIO
    for keyword, department, course in COURSE_BAND_KEYWORDS:
        for line in lines:
            ratio = difflib.SequenceMatcher(None, keyword, line).ratio()
            if ratio >= best_ratio:
                best = (department, course)
                best_ratio = ratio
    return best


def match_department(extracted: str) -> str | None:
    normalized = _normalize(extracted)
    if not normalized:
        return None

    for name in DEPARTMENT_NAMES:
        if name.lower() == normalized:
            return name

    # A fragment like "e" or "college of" sits inside every department name, so
    # only let a fragment match when it carries a distinctive word.
    fragment_ok = len(_distinctive_letters(normalized)) >= MIN_DISTINCTIVE_LETTERS

    best: str | None = None
    best_score = 0
    for name in DEPARTMENT_NAMES:
        lower = name.lower()
        if lower in normalized or (fragment_ok and normalized in lower):
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
