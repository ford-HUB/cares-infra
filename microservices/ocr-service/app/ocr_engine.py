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
    match_course_band,
    match_course_in_text,
    match_department_in_text,
)

MIN_OCR_WIDTH = 1200
MIN_TEXT_CHARS = 12
TESSERACT_CONFIGS = ("--psm 6 --oem 3", "--psm 11 --oem 3")
# Card detection: the ID is the large white, low-saturation region of the photo.
CARD_DETECT_SIZE = 1000
CARD_MIN_VALUE = 160
CARD_MAX_SATURATION = 70
CARD_MIN_AREA_RATIO = 0.1
CARD_MAX_AREA_RATIO = 0.9
# Tesseract reads the card best at roughly this size; huge photos add noise.
CARD_OCR_SHORT_SIDE = 1600
# The student ID digits are small and a worn card flips 8/9 and 5/6, so the
# number's box is located and re-read on its own, digits only, at a few scales.
ID_LOCATE_CONFIGS = ("--psm 6 --oem 3", "--psm 11 --oem 3")
ID_REREAD_CONFIG = "--psm 7 --oem 3 -c tessedit_char_whitelist=0123456789"
# Digit heights (px) the box is re-read at; sized off the box so a small or
# large photo is read the same way.
ID_REREAD_DIGIT_HEIGHTS = (120, 180, 240)
ID_REREAD_PAD = 0.6
# A row of the number's box counts as text when this share of it is ink; a
# mostly-black row is the ID photo's edge, an empty one is blank card.
ID_TEXT_ROW_MIN_DARK = 0.03
ID_TEXT_ROW_MAX_DARK = 0.7
# The course is printed in white on a saturated colour strip at the foot of the
# card front; plain Otsu binarisation washes it out, so it gets its own pass.
BAND_MIN_SATURATION = 150
BAND_MIN_VALUE = 130
BAND_TEXT_MAX_SATURATION = 80
BAND_TEXT_MIN_VALUE = 150
BAND_MIN_WIDTH_RATIO = 0.25
BAND_MIN_ASPECT = 3
BAND_OCR_HEIGHT = 120
BAND_TESSERACT_CONFIGS = ("--psm 6 --oem 3", "--psm 7 --oem 3")

NAME_LABEL = re.compile(
    r"^(?:name|pangalan|student\s*name|full\s*name)\s*[:\-]?\s*(.*)$",
    re.IGNORECASE,
)
NAME_INLINE = re.compile(
    r"\bNAME\s+([A-Z][A-Z\s.']+?)(?:\s*[®*]?\s*$)",
    re.IGNORECASE,
)
NAME_ONLY_LABEL = re.compile(r"^['\s,|.:]*NAME[^A-Za-z0-9]*$", re.IGNORECASE)
NAME_LABEL_WITH_JUNK = re.compile(r"^\W*NAME\W+[A-Za-z]?\W*$", re.IGNORECASE)
# An unlabelled, already-cleaned line printed like a name: upper case, first and
# last words of 2+ letters, initials or words between ("JAY S. ICOY").
PERSON_NAME_LINE = re.compile(r"^[A-Z]{2,}(?:\s+(?:[A-Z]\.?|[A-Z]{2,}))*\s+[A-Z]{2,}$")
PERSON_NAME_MIN_LETTERS = 6
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

# UCLM student IDs are 8 digits (YY + 6-digit serial, e.g. 24247447) printed
# above the "ID NO ____" line on the front of the card.
STUDENT_ID_LENGTH = 8
STUDENT_ID_MIN_REAL_DIGITS = 6
STUDENT_ID_LABEL = re.compile(
    r"\b(?:I[D0O]|1D)\s*(?:N[O0]\b\.?|NUMBER\b|#)\s*[:.]?",
    re.IGNORECASE,
)
# Exactly 8 digit-like chars (OCR may read 0 as O, 1 as I/l, 8 as B, ...),
# optionally split by hyphens; bounded on both sides so longer runs such as
# phone numbers (11 digits) and dates never yield an 8-digit slice.
STUDENT_ID_TOKEN = re.compile(
    r"(?<![A-Za-z0-9/])([0-9OoIlUBSZ](?:-?[0-9OoIlUBSZ]){7})(?![A-Za-z0-9/]|-[0-9A-Za-z])"
)
SCHOOL_YEAR_RANGE = re.compile(r"((?:19|20)\d{2})((?:19|20)\d{2})")


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


@dataclass
class FrontRead:
    text: str
    course_band: str
    id_number: str


class OcrEngine:
    def __init__(self) -> None:
        if settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    def extract_text(self, image_bytes: bytes) -> str:
        image = self._crop_to_card(self._load_oriented_image(image_bytes))
        processed = self._preprocess(image)
        return self._run_tesseract(processed)

    def extract_front(self, image_bytes: bytes) -> FrontRead:
        """Reads the ID front: its text, the coloured course strip (kept apart so
        it can never be mistaken for the cardholder's name) and a digit-only
        re-read of the student ID, which a worn card often garbles."""
        image = self._crop_to_card(self._load_oriented_image(image_bytes))
        processed = self._preprocess(image)
        return FrontRead(
            text=self._run_tesseract(processed),
            course_band=self._read_course_band(image),
            id_number=self._reread_id_number(image, processed),
        )

    def parse_id_text(
        self,
        front_text: str,
        back_text: str,
        course_band: str = "",
        id_number: str = "",
    ) -> ParsedIdFields:
        combined = f"{front_text}\n{back_text}"
        lines = _normalize_lines(combined)
        fields = ParsedIdFields()

        fields.id_number = id_number or _extract_id_number(front_text)
        fields.phone_number = _extract_phone(combined, lines)
        fields.gender = _extract_gender(combined)

        band = match_course_band(course_band) or match_course_band(front_text)
        if band:
            fields.department_name, fields.major_name = band
        else:
            fields.department_name = match_department_in_text(combined) or ""
            if fields.department_name:
                fields.major_name = match_course_in_text(fields.department_name, combined) or ""

        fields.year_level_name = _extract_year_level(combined)
        _extract_graduation_date(combined, fields)
        fields.current_address = _extract_address(lines, combined)

        # The cardholder's name is only printed on the front. The back carries
        # the emergency contact's NAME and the president's signature line, so
        # it is never consulted.
        first, middle, last = _extract_name(_normalize_lines(front_text))
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

    def _crop_to_card(self, image: np.ndarray) -> np.ndarray:
        """Cuts the white card out of a phone photo and squares it up. Background
        texture (tables, fabric) otherwise floods Tesseract with noise and the
        name line is lost. Photos already framed on the card pass through."""
        height, width = image.shape[:2]
        scale = CARD_DETECT_SIZE / max(height, width)
        small = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        card = cv2.inRange(hsv, (0, 0, CARD_MIN_VALUE), (180, CARD_MAX_SATURATION, 255))
        card = cv2.morphologyEx(
            card, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25))
        )
        card = cv2.morphologyEx(
            card, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        )
        contours, _ = cv2.findContours(card, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            contour = max(contours, key=cv2.contourArea)
            area_ratio = cv2.contourArea(contour) / (small.shape[0] * small.shape[1])
            if CARD_MIN_AREA_RATIO <= area_ratio <= CARD_MAX_AREA_RATIO:
                image = _warp_to_rect(image, cv2.boxPoints(cv2.minAreaRect(contour)) / scale)

        short_side = min(image.shape[:2])
        if short_side > CARD_OCR_SHORT_SIDE:
            factor = CARD_OCR_SHORT_SIDE / short_side
            image = cv2.resize(image, None, fx=factor, fy=factor, interpolation=cv2.INTER_AREA)
        return image

    def _reread_id_number(self, image: np.ndarray, processed: np.ndarray) -> str:
        box = _find_id_number_box(processed)
        if box is None:
            return ""

        box = _trim_to_text_row(processed, box)
        # _preprocess may have enlarged a small card; map the box back onto it.
        ratio = image.shape[1] / processed.shape[1]
        x, y, w, h = (int(round(value * ratio)) for value in box)
        pad = int(h * ID_REREAD_PAD)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        roi = gray[max(y - pad, 0) : y + h + pad, max(x - pad, 0) : x + w + pad]
        if roi.size == 0:
            return ""

        votes: dict[str, int] = {}
        for digit_height in ID_REREAD_DIGIT_HEIGHTS:
            scale = digit_height / max(h, 1)
            enlarged = cv2.resize(roi, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            enlarged = cv2.GaussianBlur(enlarged, (3, 3), 0)
            _, binary = cv2.threshold(enlarged, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            digits = re.sub(r"\D", "", pytesseract.image_to_string(binary, config=ID_REREAD_CONFIG))
            if len(digits) == STUDENT_ID_LENGTH and _has_plausible_year_prefix(digits):
                votes[digits] = votes.get(digits, 0) + 1

        if not votes:
            return ""
        best, count = max(votes.items(), key=lambda item: item[1])
        # A single read out of three is no better than the full-page OCR.
        return best if count >= 2 else ""

    def _read_course_band(self, image: np.ndarray) -> str:
        height, width = image.shape[:2]
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        strip = cv2.inRange(hsv, (0, BAND_MIN_SATURATION, BAND_MIN_VALUE), (180, 255, 255))
        kernel = cv2.getStructuringElement(
            cv2.MORPH_RECT, (max(width // 40, 3), max(height // 80, 3))
        )
        strip = cv2.morphologyEx(strip, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(strip, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best: tuple[int, int, int, int] | None = None
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w < width * BAND_MIN_WIDTH_RATIO or w < h * BAND_MIN_ASPECT:
                continue
            if best is None or w * h > best[2] * best[3]:
                best = (x, y, w, h)
        if best is None:
            return ""

        x, y, w, h = best
        band = hsv[y : y + h, x : x + w]
        # White lettering on the colour strip -> black text on white for Tesseract.
        letters = cv2.inRange(
            band, (0, 0, BAND_TEXT_MIN_VALUE), (180, BAND_TEXT_MAX_SATURATION, 255)
        )
        if h < BAND_OCR_HEIGHT:
            scale = BAND_OCR_HEIGHT / h
            letters = cv2.resize(letters, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        # Drop the thin card-edge / strip-border strokes that confuse line OCR.
        stroke = max(letters.shape[0] // 25, 3)
        letters = cv2.morphologyEx(
            letters, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (stroke, stroke))
        )
        page = cv2.copyMakeBorder(
            cv2.bitwise_not(letters), 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255
        )

        for config in BAND_TESSERACT_CONFIGS:
            text = pytesseract.image_to_string(page, config=config)
            words = re.findall(r"[A-Za-z]{2,}", text)
            if sum(len(word) for word in words) >= 4:
                return " ".join(words).upper()
        return ""

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


def _find_id_number_box(processed: np.ndarray) -> tuple[int, int, int, int] | None:
    for config in ID_LOCATE_CONFIGS:
        data = pytesseract.image_to_data(
            processed, config=config, output_type=pytesseract.Output.DICT
        )
        for index, word in enumerate(data["text"]):
            if _student_id_candidates(word) or len(re.findall(r"\d", word)) >= STUDENT_ID_MIN_REAL_DIGITS:
                return (
                    data["left"][index],
                    data["top"][index],
                    data["width"][index],
                    data["height"][index],
                )
    return None


def _trim_to_text_row(
    processed: np.ndarray, box: tuple[int, int, int, int]
) -> tuple[int, int, int, int]:
    """Tesseract's word box can swallow the bottom edge of the ID photo above
    the number; that solid dark block wrecks the re-read's thresholding. Keep
    only the longest run of rows that look like a line of text."""
    x, y, w, h = box
    region = processed[y : y + h, x : x + w]
    if region.size == 0:
        return box
    dark = (region < 128).mean(axis=1)
    is_text = (dark > ID_TEXT_ROW_MIN_DARK) & (dark < ID_TEXT_ROW_MAX_DARK)

    best_start, best_len, start = 0, 0, None
    for row, flag in enumerate(list(is_text) + [False]):
        if flag and start is None:
            start = row
        elif not flag and start is not None:
            if row - start > best_len:
                best_start, best_len = start, row - start
            start = None
    if best_len < h * 0.3:
        return box
    return x, y + best_start, w, best_len


def _warp_to_rect(image: np.ndarray, box: np.ndarray) -> np.ndarray:
    sums = box.sum(axis=1)
    diffs = np.diff(box, axis=1).ravel()
    top_left, bottom_right = box[np.argmin(sums)], box[np.argmax(sums)]
    top_right, bottom_left = box[np.argmin(diffs)], box[np.argmax(diffs)]
    width = int(max(np.linalg.norm(top_right - top_left), np.linalg.norm(bottom_right - bottom_left)))
    height = int(max(np.linalg.norm(bottom_left - top_left), np.linalg.norm(bottom_right - top_right)))
    if width < 2 or height < 2:
        return image
    matrix = cv2.getPerspectiveTransform(
        np.float32([top_left, top_right, bottom_right, bottom_left]),
        np.float32([[0, 0], [width, 0], [width, height], [0, height]]),
    )
    return cv2.warpPerspective(image, matrix, (width, height))


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
    cleaned = re.sub(r"^['\s,|.:_\-—–]+", "", cleaned)
    cleaned = re.split(r"\b(?:ADDRESS|TEL|ID\s*NO|BIRTHDATE)\b", cleaned, maxsplit=1, flags=re.I)[0]
    # OCR often glues a middle initial to its neighbours: "JAYS.ICOY", "JAY S.ICOY".
    cleaned = re.sub(r"\b([A-Za-z]{2,})([A-Za-z])\.(?=[A-Za-z]{2,})", r"\1 \2. ", cleaned)
    cleaned = re.sub(r"\b([A-Za-z])\.(?=[A-Za-z]{2,})", r"\1. ", cleaned)
    cleaned = re.sub(r"[\s.,;:|_®*'\-—–]+$", "", cleaned)
    return cleaned.strip()


def _looks_like_person_name(text: str) -> bool:
    tokens = text.split()
    if len(tokens) < 2 or len(tokens) > 5:
        return False
    if re.search(
        r"\b(UNIVERSITY|COLLEGE|STUDENT|EMERGENCY|NON-TRANSFERABLE|NOTIFY|SIGNATURE|"
        r"CEBU|MANDAUE|LAPU|PHILIPPINES|PRESIDENT|ATTY)\b",
        text,
        re.I,
    ):
        return False
    if match_course_band(text):
        return False
    # OCR splits labels too: "SIG NATURE".
    letters = re.sub(r"[^A-Za-z]", "", text).upper()
    if any(word in letters for word in ("SIGNATURE", "IDNO")):
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
            candidate = _clean_name_value(inline.group(1))
            if candidate and _looks_like_person_name(candidate):
                return _split_name_value(candidate)

    # "NAME" followed by OCR junk ("NAME i .", "NAME — .") is still the label;
    # the name sits on one of the next lines.
    for index, line in enumerate(lines):
        if not (NAME_ONLY_LABEL.match(line) or NAME_LABEL_WITH_JUNK.match(line)):
            continue
        for offset in range(1, 4):
            if index + offset >= len(lines):
                break
            candidate = _clean_name_value(lines[index + offset])
            if candidate and _looks_like_person_name(candidate):
                return _split_name_value(candidate)

    for line in lines:
        candidate = _clean_name_value(line)
        if (
            PERSON_NAME_LINE.match(candidate)
            and len(re.sub(r"[^A-Z]", "", candidate)) >= PERSON_NAME_MIN_LETTERS
            and _looks_like_person_name(candidate)
        ):
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
    return re.sub(r"\D", "", _normalize_ocr_digits(value))


def _student_id_candidates(line: str) -> list[str]:
    candidates: list[str] = []
    for match in STUDENT_ID_TOKEN.finditer(line):
        raw = match.group(1)
        if len(re.findall(r"\d", raw)) < STUDENT_ID_MIN_REAL_DIGITS:
            continue
        digits = _normalize_id_number(raw)
        if len(digits) != STUDENT_ID_LENGTH:
            continue
        year_range = SCHOOL_YEAR_RANGE.fullmatch(digits)
        if year_range and int(year_range.group(2)) - int(year_range.group(1)) in (0, 1):
            continue
        candidates.append(digits)
    return candidates


def _has_plausible_year_prefix(digits: str) -> bool:
    return int(digits[:2]) <= (date.today().year % 100) + 1


def _pick_student_id(candidates: list[str]) -> str:
    for candidate in candidates:
        if _has_plausible_year_prefix(candidate):
            return candidate
    return candidates[0] if candidates else ""


def _student_id_near_label(lines: list[str]) -> str:
    for index, line in enumerate(lines):
        label = STUDENT_ID_LABEL.search(line)
        if not label:
            continue
        # UCLM prints the number just above the "ID NO ____" line; OCR may also
        # merge it onto the label line or push it below.
        nearby = [line[label.end() :], line[: label.start()]]
        if index > 0:
            nearby.append(lines[index - 1])
        if index + 1 < len(lines):
            nearby.append(lines[index + 1])
        candidates = [c for text in nearby for c in _student_id_candidates(text)]
        picked = _pick_student_id(candidates)
        if picked:
            return picked
    return ""


def _extract_id_number(front_text: str) -> str:
    # The student ID is only printed on the front of the card; the back carries
    # school years, phone and birthdate, so it is never consulted.
    lines = _normalize_lines(front_text)
    labeled = _student_id_near_label(lines)
    if labeled:
        return labeled
    return _pick_student_id([c for line in lines for c in _student_id_candidates(line)])


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
        r"\b(\d+(?:st|nd|rd|th)\s+Year|First Year|Second Year|Third Year|Fourth Year|Grade\s*(?:1[0-2]|[1-9]))\b",
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
