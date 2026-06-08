import re
from dataclasses import dataclass

import cv2
import numpy as np
import pytesseract

from app.config import settings


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
        array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Invalid image data")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 9, 75, 75)
        text = pytesseract.image_to_string(gray)
        return "\n".join(line.strip() for line in text.splitlines() if line.strip())

    def parse_id_text(self, front_text: str, back_text: str) -> ParsedIdFields:
        combined = f"{front_text}\n{back_text}"
        fields = ParsedIdFields()

        id_match = re.search(r"\b(\d{4}-\d{4,6})\b", combined)
        if id_match:
            fields.id_number = id_match.group(1)

        phone_match = re.search(r"(\+63\d{10}|09\d{9})", combined.replace(" ", ""))
        if phone_match:
            fields.phone_number = phone_match.group(1)

        gender_match = re.search(r"\b(MALE|FEMALE)\b", combined, re.IGNORECASE)
        if gender_match:
            fields.gender = gender_match.group(1).upper()

        age_match = re.search(r"\b(?:AGE|Edad)\s*[:\-]?\s*(\d{1,3})\b", combined, re.IGNORECASE)
        if age_match:
            fields.age = int(age_match.group(1))

        year_match = re.search(r"\b(20\d{2})\b", combined)
        if year_match:
            fields.graduation_year = int(year_match.group(1))

        date_match = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b", combined)
        if date_match:
            fields.graduation_month = int(date_match.group(1))
            fields.graduation_day = int(date_match.group(2))
            fields.graduation_year = int(date_match.group(3))

        year_level_match = re.search(
            r"\b(\d+(?:st|nd|rd|th)\s+Year|First Year|Second Year|Third Year|Fourth Year)\b",
            combined,
            re.IGNORECASE,
        )
        if year_level_match:
            fields.year_level_name = year_level_match.group(1).title()

        department_match = re.search(
            r"(College of [A-Za-z ]+|Department of [A-Za-z ]+)",
            combined,
            re.IGNORECASE,
        )
        if department_match:
            fields.department_name = department_match.group(1).strip()

        major_match = re.search(r"\b(BEED|BSIT|BSED|BSCS|BSA|AB|[A-Z]{2,10})\b[- ]*([A-Za-z ]+)?", combined)
        if major_match and not fields.department_name:
            fields.major_name = major_match.group(0).strip()

        address_match = re.search(
            r"(?:Address|Addr\.?)\s*[:\-]?\s*(.+)",
            combined,
            re.IGNORECASE,
        )
        if address_match:
            fields.current_address = address_match.group(1).strip()

        name_match = re.search(
            r"(?:Name|Pangalan)\s*[:\-]?\s*([A-Za-z]+(?:\s+[A-Za-z]\.?)?\s+[A-Za-z]+)",
            combined,
            re.IGNORECASE,
        )
        if name_match:
            parts = name_match.group(1).split()
            if len(parts) >= 3:
                fields.firstname = parts[0]
                fields.middle_name = parts[1]
                fields.lastname = " ".join(parts[2:])
            elif len(parts) == 2:
                fields.firstname = parts[0]
                fields.lastname = parts[1]

        if re.search(r"\bSTUDENT\b", combined, re.IGNORECASE):
            fields.volunteer_type = "STUDENT"

        return fields


ocr_engine = OcrEngine()
