"""Address extraction for proof-of-residency documents.

A barangay certificate / residency clearance is prose, not a labelled card:
"...is a bona fide resident of Purok 3, Barangay Looc, Mandaue City, Cebu...".
The parser reads the sentence around the residency phrase first and only falls
back to the ID-card "ADDRESS:" label logic when no phrase is present.
"""

import re
from dataclasses import dataclass

import fitz  # PyMuPDF

from app.ocr_engine import _extract_address, _normalize_lines, ocr_engine

# Pages rendered off a PDF — a certificate is one page; cap the work anyway.
MAX_PDF_PAGES = 3
PDF_RENDER_DPI = 200

# Phrases that introduce the address on Philippine residency papers.
RESIDENCY_PHRASES = re.compile(
    r"\b(?:"
    r"bona\s*[- ]?fide\s+resident\s+of|"
    r"resident\s+of|"
    r"residing\s+(?:at|in)|"
    r"resides\s+(?:at|in)|"
    r"residence\s+(?:at|in|is\s+at)|"
    r"with\s+(?:postal\s+|residential\s+)?address\s+(?:at|in|of)|"
    r"naninirahan\s+sa|"
    r"nakatira\s+sa"
    r")\s+(.+)",
    re.IGNORECASE,
)

# Where the address sentence stops: end of sentence or the clause after it.
ADDRESS_TERMINATORS = re.compile(
    r"\s*(?:[.;]|"
    r"\bfor\s+(?:the\s+past|the\s+last|more\s+than|about|almost|over)\b|"
    r"\bsince\b|"
    r"\band\s+(?:is|has|that)\b|"
    r"\bthis\s+(?:certification|certificate|is)\b|"
    r"\bissued\b|"
    r"\bwho\b"
    r").*$",
    re.IGNORECASE,
)

# Abbreviations whose trailing period must not read as the end of the sentence.
ADDRESS_ABBREVIATIONS = re.compile(
    r"\b(brgy|bgy|st|sta|sto|ave|subd|blk|bldg|apt|no|gen|dr|mt|ph|hwy|rd|jr|sr)\.",
    re.IGNORECASE,
)
_ABBREVIATION_MARK = "\u2024"  # one-dot leader; never appears in OCR output

# A usable address names at least one of these Philippine locality words.
LOCALITY_HINT = re.compile(
    r"\b(?:brgy\.?|barangay|purok|sitio|zone|city|municipality|province|street|st\.?|"
    r"avenue|ave\.?|subdivision|subd\.?|village|blk\.?|block|lot|phase|cebu|manila|"
    r"davao|mandaue|lapu[- ]lapu|talisay)\b",
    re.IGNORECASE,
)


@dataclass
class ResidencyExtractResult:
    address: str
    raw_text: str
    pages: int


def _is_pdf(data: bytes) -> bool:
    return data.lstrip()[:5] == b"%PDF-"


def _render_pdf_pages(data: bytes) -> list[bytes]:
    """Rasterises the first pages of a PDF so tesseract can read them."""
    pages: list[bytes] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            if len(pages) >= MAX_PDF_PAGES:
                break
            pixmap = page.get_pixmap(dpi=PDF_RENDER_DPI, alpha=False)
            pages.append(pixmap.tobytes("png"))
    if not pages:
        raise ValueError("The PDF has no pages")
    return pages


def _pdf_text_layer(data: bytes) -> str:
    """Text embedded in a digitally produced PDF — no OCR noise when present."""
    chunks: list[str] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for index, page in enumerate(doc):
            if index >= MAX_PDF_PAGES:
                break
            chunks.append(page.get_text("text"))
    return "\n".join(chunks).strip()


def _clean_address(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip()
    cleaned = re.sub(r"^[^A-Za-z0-9#]+", "", cleaned)
    cleaned = re.sub(r"[\s,.;:|]+$", "", cleaned)
    # OCR often reads "Barangay" as "Barangay ," or drops the space after commas.
    cleaned = re.sub(r"\s*,\s*", ", ", cleaned)
    cleaned = re.sub(r",(?:\s*,)+", ",", cleaned)
    return cleaned.strip()


def parse_residency_address(text: str) -> str:
    """The address a residency document vouches for, or "" when none reads."""
    flat = re.sub(r"\s+", " ", text)

    for match in RESIDENCY_PHRASES.finditer(flat):
        tail = ADDRESS_ABBREVIATIONS.sub(rf"\1{_ABBREVIATION_MARK}", match.group(1))
        tail = ADDRESS_TERMINATORS.sub("", tail).replace(_ABBREVIATION_MARK, ".")
        candidate = _clean_address(tail)
        if len(candidate) >= 8 and LOCALITY_HINT.search(candidate):
            return candidate

    # No residency phrase — try the labelled "ADDRESS:" logic from ID cards.
    lines = _normalize_lines(text)
    labelled = _clean_address(_extract_address(lines, text))
    if labelled and LOCALITY_HINT.search(labelled):
        return labelled

    return ""


def extract_residency(data: bytes) -> ResidencyExtractResult:
    """OCRs an image or PDF and pulls the residential address out of it."""
    if _is_pdf(data):
        raw_text = _pdf_text_layer(data)
        pages = 0
        if len(raw_text) < 40:
            page_images = _render_pdf_pages(data)
            pages = len(page_images)
            raw_text = "\n".join(ocr_engine.extract_text(image) for image in page_images)
        else:
            with fitz.open(stream=data, filetype="pdf") as doc:
                pages = min(len(doc), MAX_PDF_PAGES)
    else:
        raw_text = ocr_engine.extract_text(data)
        pages = 1

    return ResidencyExtractResult(
        address=parse_residency_address(raw_text),
        raw_text=raw_text,
        pages=pages,
    )
