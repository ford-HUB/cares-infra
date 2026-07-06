import re
from dataclasses import dataclass
from datetime import date
from io import BytesIO

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageOps

from app.config import settings
from app.uclm_departments import (
    match_course_in_text,
    match_department_in_text,
)

MIN_OCR_WIDTH = 1200
MIN_TEXT_CHARS = 12
TESSERACT_CONFIGS = ("--psm 6 --oem 3", "--psm 11 --oem 3")

NAME_LABEL = re.compile(
    r"^(?:name|pangalan|student\s*name|full\s*name)\s*[:\-]?\s*(.*)$",
    re.IGNORECASE,
)
NAME_INLINE = re.compile(
    r"\bNAME\s+([A-Z][A-Z\s.']+?)(?:\s*[®*]?\s*$)",
    re.IGNORECASE,
)
NAME_ONLY_LABEL = re.compile(r"^['\s,|.:]*NAME\s*[|:]?\s*$", re.IGNORECASE)
PERSON_NAME_LINE = re.compile(
    r"^['\s,|.:]*([A-Z]{2,}(?:\s+[A-Z]{1,}(?:\.\s*|\s+))*[A-Z]{2,}(?:\s+[A-Z]\.?)?\s+[A-Z]{2,})\s*$",
)
ADDRESS_INLINE = re.compile(
    r"\bADDRESS\.?\s*[:\-]?\s*(.+)$",
    re.IGNORECASE,
)
DECA_HOME_ADDRESS = re.compile(
    r"\bDECA\s+HOME[S]?\s*\d*"
    r"(?:\s*,\s*[A-Za-z][A-Za-z\s,.\-]*|\s+[A-Za-z][A-Za-z]+)*",
    re.IGNORECASE,
)
HOME_ADDRESS = re.compile(
    r"\b(?:DECA\s+)?HOME[S]?\s*\d*"
    r"(?:\s*,\s*[A-Za-z][A-Za-z\s,.\-]*|\s+[A-Za-z][A-Za-z]+)*",
    re.IGNORECASE,
)
SURNAME_LABEL = re.compile(r"^(?:surname|last\s*name|apelyido)\s*[:\-]?\s*(.*)$", re.IGNORECASE)
GIVEN_LABEL = re.compile(
    r"^(?:given\s*name|first\s*name|firstname)\s*[:\-]?\s*(.*)$",
    re.IGNORECASE,
)
MIDDLE_LABEL = re.compile(r"^(?:middle\s*name|middle\s*initial)\s*[:\-]?\s*(.*)$", re.IGNORECASE)
ADDRESS_LABEL = re.compile(
    r"^(?:address|addr\.?|present\s*address|home\s*address|tirahan)\s*[:\-]?\s*(.*)$",
    re.IGNORECASE,
)
TEL_INLINE = re.compile(
    r"\bTEL\.?\s*NO\.?\s*[.:]?\s*(0\d{10,11})",
    re.IGNORECASE,
)
BIRTHDATE_INLINE = re.compile(
    r"\b(?:STUDENT(?:S)?\s*)?BIRTHDATE\s*[.:]?\s*(\d{1,2}/\d{1,2}/(?:19|20)\d{2})",
    re.IGNORECASE,
)
AGE_LABEL = re.compile(r"^(?:age|edad)\s*[:\-]?\s*(\d{1,3})$", re.IGNORECASE)
DOB_LABEL = re.compile(
    r"^(?:dob|date\s*of\s*birth|birth\s*date|birthdate)\s*[:\-]?\s*(.+)$",
    re.IGNORECASE,
)
LABEL_LINE = re.compile(
    r"^(?:name|pangalan|student\s*name|full\s*name|surname|last\s*name|given\s*name|"
    r"first\s*name|middle\s*name|address|addr|present\s*address|home\s*address|tirahan|"
    r"age|edad|dob|date\s*of\s*birth|birth\s*date|birthdate|id\s*no|id\s*number|tel)\b",
    re.IGNORECASE,
)
NAME_CHARS = re.compile(r"^[A-Za-zÑñ.\-'\s,®]+$")


@dataclass
class ParsedIdFields:
    firstname: str = ""
    lastname: str = ""
    middle_name: str = ""
    gender: str = ""
    age: int = 0
    current_address: str = ""
    phone_number: str = ""
    id_number: str = ""
    department_name: str = ""
    major_name: str = ""
    year_level_name: str = ""
    graduation_year: int = 0
    graduation_month: int = 0
    graduation_day: int = 0
    volunteer_type: str = "STUDENT"


class OcrEngine:
    def __init__(self) -> None:
        if settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    def extract_text(self, image_bytes: bytes) -> str:
        image = self._load_oriented_image(image_bytes)
        processed = self._preprocess(image)
        return self._run_tesseract(processed)

    def parse_id_text(self, front_text: str, back_text: str) -> ParsedIdFields:
        combined = f"{front_text}\n{back_text}"
        lines = _normalize_lines(combined)
        fields = ParsedIdFields()

        fields.id_number = _extract_id_number(combined)
        fields.phone_number = _extract_phone(combined, lines)
        fields.gender = _extract_gender(combined)
        fields.department_name = match_department_in_text(combined) or ""

        if fields.department_name:
            fields.major_name = match_course_in_text(fields.department_name, combined) or ""

        fields.year_level_name = _extract_year_level(combined)
        _extract_graduation_date(combined, fields)
        fields.current_address = _extract_address(lines, combined)

        first, middle, last = _extract_name(lines)
        fields.firstname = first
        fields.middle_name = middle
        fields.lastname = last

        fields.age = _extract_age(combined, lines)
        if re.search(r"\bSTUDENT\b", combined, re.IGNORECASE):
            fields.volunteer_type = "STUDENT"

        return fields

    def _load_oriented_image(self, image_bytes: bytes) -> np.ndarray:
        try:
            pil_image = Image.open(BytesIO(image_bytes))
            pil_image = ImageOps.exif_transpose(pil_image)
            pil_image = pil_image.convert("RGB")
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        except Exception:
            array = np.frombuffer(image_bytes, dtype=np.uint8)
            image = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Invalid image data")

        return image

    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        height, width = image.shape[:2]
        if width < MIN_OCR_WIDTH:
            scale = MIN_OCR_WIDTH / width
            image = cv2.resize(
                image,
                (int(width * scale), int(height * scale)),
                interpolation=cv2.INTER_CUBIC,
            )

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 9, 75, 75)

        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def _run_tesseract(self, image: np.ndarray) -> str:
        best_text = ""
        for config in TESSERACT_CONFIGS:
            text = pytesseract.image_to_string(image, config=config)
            cleaned = "\n".join(line.strip() for line in text.splitlines() if line.strip())
            if len(cleaned) > len(best_text):
                best_text = cleaned
            if len(cleaned) >= MIN_TEXT_CHARS:
                break

        return best_text


def _normalize_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def _is_label_line(line: str) -> bool:
    return bool(LABEL_LINE.match(line.strip()))


def _inline_or_next(lines: list[str], index: int, inline: str) -> str:
    if inline:
        return inline.strip()
    for offset in range(1, 4):
        next_index = index + offset
        if next_index >= len(lines):
            break
        candidate = lines[next_index].strip()
        if candidate and not _is_label_line(candidate):
            return candidate
    return ""


def _clean_name_value(name_value: str) -> str:
    cleaned = re.sub(r"\s+", " ", name_value.strip())
    cleaned = re.sub(r"^['\s,|.:]+", "", cleaned)
    cleaned = re.split(r"\b(?:ADDRESS|TEL|ID\s*NO|BIRTHDATE)\b", cleaned, maxsplit=1, flags=re.I)[0]
    return cleaned.strip(" .®*")


def _looks_like_person_name(text: str) -> bool:
    tokens = text.split()
    if len(tokens) < 2 or len(tokens) > 5:
        return False
    if re.search(
        r"\b(UNIVERSITY|COLLEGE|STUDENT|EMERGENCY|NON-TRANSFERABLE|NOTIFY|SIGNATURE)\b",
        text,
        re.I,
    ):
        return False
    return all(re.fullmatch(r"[A-Za-z][A-Za-z.']*", token) for token in tokens)


def _split_name_value(name_value: str) -> tuple[str, str, str]:
    cleaned = _clean_name_value(name_value)
    if not cleaned:
        return "", "", ""

    if "," in cleaned:
        last_part, first_part = [part.strip() for part in cleaned.split(",", 1)]
        first_tokens = first_part.split()
        first = first_tokens[0] if first_tokens else ""
        middle = " ".join(first_tokens[1:]) if len(first_tokens) > 1 else ""
        return first, middle, last_part

    tokens = cleaned.split()
    if len(tokens) >= 4 and re.fullmatch(r"[A-Za-z]\.?", tokens[-2]):
        return tokens[0], " ".join(tokens[1:-1]), tokens[-1]
    if len(tokens) >= 3:
        return tokens[0], tokens[1], " ".join(tokens[2:])
    if len(tokens) == 2:
        return tokens[0], "", tokens[1]
    return cleaned, "", ""


def _extract_name(lines: list[str]) -> tuple[str, str, str]:
    surname = ""
    given = ""
    middle = ""

    for line in lines:
        inline = NAME_INLINE.search(line)
        if inline:
            return _split_name_value(inline.group(1))

    for index, line in enumerate(lines):
        if NAME_ONLY_LABEL.match(line):
            value = _inline_or_next(lines, index, "")
            cleaned = _clean_name_value(value)
            if cleaned and _looks_like_person_name(cleaned):
                return _split_name_value(cleaned)

    for line in lines:
        person = PERSON_NAME_LINE.match(line)
        if person:
            candidate = _clean_name_value(person.group(1))
            if candidate and _looks_like_person_name(candidate):
                return _split_name_value(candidate)

    for index, line in enumerate(lines):
        for pattern, target in (
            (SURNAME_LABEL, "surname"),
            (GIVEN_LABEL, "given"),
            (MIDDLE_LABEL, "middle"),
            (NAME_LABEL, "name"),
        ):
            match = pattern.match(line)
            if not match:
                continue

            value = _inline_or_next(lines, index, match.group(1))
            if not value or not NAME_CHARS.match(value):
                continue

            if target == "surname":
                surname = value
            elif target == "given":
                given = value
            elif target == "middle":
                middle = value
            else:
                return _split_name_value(value)

    if given or surname:
        return given, middle, surname

    return "", "", ""


def _looks_like_phone(line: str) -> bool:
    return bool(re.search(r"(\+63\d{10}|09\d{9})", line.replace(" ", "")))


def _clean_address_value(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value.strip())
    cleaned = re.sub(r"^[^A-Za-z0-9]+", "", cleaned)
    cleaned = re.sub(r"[.\s|]+$", "", cleaned)
    return cleaned.strip()


def _prefer_address(existing: str, parsed: str) -> str:
    current = existing.strip()
    candidate = parsed.strip()
    if not candidate:
        return current
    if not current:
        return candidate
    if len(candidate) > len(current):
        return candidate
    if "," in candidate and "," not in current:
        return candidate
    return current


def _extract_address(lines: list[str], combined: str) -> str:
    for line in lines:
        inline = ADDRESS_INLINE.search(line)
        if inline:
            value = _clean_address_value(inline.group(1))
            if value and not _looks_like_phone(value):
                return value

    collected: list[str] = []
    for index, line in enumerate(lines):
        label_only = re.search(r"\bADDRESS\s*[.:]?\s*$", line, re.IGNORECASE)
        if label_only:
            for offset in range(1, 4):
                next_index = index + offset
                if next_index >= len(lines):
                    break
                candidate = _clean_address_value(lines[next_index])
                if (
                    not candidate
                    or _is_label_line(candidate)
                    or _looks_like_phone(candidate)
                ):
                    break
                collected.append(candidate)
            if collected:
                return ", ".join(collected)

        match = ADDRESS_LABEL.match(line)
        if not match:
            continue

        inline = _clean_address_value(match.group(1))
        if inline and not _looks_like_phone(inline):
            collected.append(inline)
        else:
            for offset in range(1, 4):
                next_index = index + offset
                if next_index >= len(lines):
                    break
                candidate = _clean_address_value(lines[next_index])
                if (
                    not candidate
                    or _is_label_line(candidate)
                    or _looks_like_phone(candidate)
                ):
                    break
                collected.append(candidate)

    if collected:
        return ", ".join(collected)

    for pattern in (DECA_HOME_ADDRESS, HOME_ADDRESS):
        match = pattern.search(combined)
        if match:
            value = _clean_address_value(match.group(0))
            if value and not _looks_like_phone(value):
                return value

    return ""


def _normalize_id_number(value: str) -> str:
    return re.sub(r"\D", "", value)


def _extract_id_number(text: str) -> str:
    patterns = (
        r"\b(\d{4}-\d{4,6})\b",
        r"\b(\d{4})[\s\-](\d{4,6})\b",
    )
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        if match.lastindex == 1:
            return _normalize_id_number(match.group(1))
        return _normalize_id_number(f"{match.group(1)}{match.group(2)}")

    normalized = _normalize_ocr_digits(text)
    eight_digit = re.search(r"\b(\d{8})\b", normalized)
    if eight_digit:
        return eight_digit.group(1)

    return ""


def _extract_phone(text: str, lines: list[str]) -> str:
    for line in lines:
        tel_match = TEL_INLINE.search(line)
        if tel_match:
            return tel_match.group(1)

    match = re.search(r"(\+63\d{10}|09\d{9})", text.replace(" ", ""))
    if match:
        return match.group(1)

    for line in lines:
        if not re.search(r"\b(?:TEL|PHONE|MOBILE|NO\.)\b", line, re.I):
            continue
        digits = re.sub(r"\D", "", line)
        for size in (11, 10):
            for start in range(max(len(digits) - size + 1, 0)):
                chunk = digits[start : start + size]
                if size == 11 and chunk.startswith("09"):
                    return chunk
                if size == 10 and chunk.startswith("9"):
                    return f"0{chunk}"

    return ""


def _extract_gender(text: str) -> str:
    match = re.search(r"\b(MALE|FEMALE)\b", text, re.IGNORECASE)
    return match.group(1).upper() if match else ""


def _extract_year_level(text: str) -> str:
    match = re.search(
        r"\b(\d+(?:st|nd|rd|th)\s+Year|First Year|Second Year|Third Year|Fourth Year|Grade\s*11|Grade\s*12)\b",
        text,
        re.IGNORECASE,
    )
    return match.group(1).title() if match else ""


def _extract_graduation_date(text: str, fields: ParsedIdFields) -> None:
    year_range = re.search(r"\b(20\d{2})\s*[-–]\s*(20\d{2})\b", text)
    if year_range:
        fields.graduation_year = int(year_range.group(2))
        return

    match = re.search(
        r"\b(?:GRAD(?:UATION)?|EXP(?:ECTED)?\s*GRAD)\s*[.:]?\s*"
        r"(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b",
        text,
        re.IGNORECASE,
    )
    if not match:
        return

    fields.graduation_month = int(match.group(1))
    fields.graduation_day = int(match.group(2))
    fields.graduation_year = int(match.group(3))


def _normalize_ocr_digits(value: str) -> str:
    table = str.maketrans(
        {
            "O": "0",
            "o": "0",
            "I": "1",
            "l": "1",
            "|": "1",
            "U": "0",
            "B": "8",
            "S": "5",
            "Z": "2",
        }
    )
    return value.translate(table)


def _parse_date_value(value: str) -> tuple[int, int, int] | None:
    normalized = _normalize_ocr_digits(value)
    match = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-]((?:19|20)\d{2})\b", normalized)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))

    loose = re.search(
        r"(\d{1,2})\D{1,3}(\d{1,2})\D{1,3}((?:19|20)\d{2})",
        normalized,
    )
    if loose:
        month, day, year = int(loose.group(1)), int(loose.group(2)), int(loose.group(3))
        if 1 <= month <= 12 and 1 <= day <= 31:
            return month, day, year

    year_match = re.search(r"\b((?:19|20)\d{2})\b", normalized)
    if year_match and re.search(r"\b(?:BIRTH|DOB|BIRTHDATE)\b", value, re.I):
        year = int(year_match.group(1))
        return 1, 1, year

    return None


def _age_from_birth(month: int, day: int, year: int) -> int:
    today = date.today()
    age = today.year - year
    if (today.month, today.day) < (month, day):
        age -= 1
    return max(age, 0)


def _extract_age(text: str, lines: list[str]) -> int:
    for line in lines:
        match = AGE_LABEL.match(line)
        if match:
            return int(match.group(1))

    match = re.search(r"\b(?:AGE|Edad)\s*[:\-]?\s*(\d{1,3})\b", text, re.IGNORECASE)
    if match:
        return int(match.group(1))

    for line in lines:
        birth_match = BIRTHDATE_INLINE.search(line)
        if birth_match:
            parsed = _parse_date_value(birth_match.group(1))
            if parsed:
                return _age_from_birth(*parsed)

    for line in lines:
        if not re.search(r"\b(?:BIRTHDATE|BIRTH\s*DATE|DOB)\b", line, re.I):
            continue
        parsed = _parse_date_value(line)
        if parsed:
            return _age_from_birth(*parsed)

    for index, line in enumerate(lines):
        match = DOB_LABEL.match(line)
        if not match:
            continue
        value = _inline_or_next(lines, index, match.group(1))
        parsed = _parse_date_value(value)
        if parsed:
            return _age_from_birth(*parsed)

    dob_match = re.search(
        r"\b(?:DOB|Date\s*of\s*Birth|Birth\s*Date|Birthdate)\s*[:\-]?\s*"
        r"(\d{1,2}[/-]\d{1,2}[/-](?:19|20)\d{2})\b",
        text,
        re.IGNORECASE,
    )
    if dob_match:
        parsed = _parse_date_value(dob_match.group(1))
        if parsed:
            return _age_from_birth(*parsed)

    return 0


def count_populated_fields(fields: ParsedIdFields) -> int:
    values = [
        fields.firstname,
        fields.lastname,
        fields.middle_name,
        fields.gender,
        fields.current_address,
        fields.phone_number,
        fields.id_number,
        fields.department_name,
        fields.major_name,
        fields.year_level_name,
    ]
    count = sum(1 for value in values if str(value).strip())
    if fields.age > 0:
        count += 1
    if fields.graduation_year > 0:
        count += 1
    return count


ocr_engine = OcrEngine()
