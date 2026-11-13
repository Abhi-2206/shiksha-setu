"""
PDF text extraction module for Shiksha Setu AI Student Assistance Chatbot.
Extracts text page by page from PDF documents using PyMuPDF.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Union

try:
    import pymupdf as fitz
except ImportError:
    import fitz

logger = logging.getLogger(__name__)


class PDFExtractionError(Exception):
    """Exception raised when a PDF cannot be opened, parsed, or processed."""
    pass


def extract_text_from_pdf(
    pdf_path: Union[str, Path],
    include_empty_pages: bool = False,
) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF file using PyMuPDF.

    Args:
        pdf_path: Path to the target PDF file (str or Path).
        include_empty_pages: If True, includes pages that contain no extractable text
                            with text="". Defaults to False (empty pages omitted,
                            while preserving original 1-based page numbering for valid pages).

    Returns:
        List of dictionaries with structured page information:
        [
            {
                "document_name": str,
                "page_number": int,   # 1-indexed
                "text": str,
                "source_path": str,
            },
            ...
        ]

    Raises:
        FileNotFoundError: If the specified PDF file does not exist.
        IsADirectoryError: If the path points to a directory instead of a file.
        PDFExtractionError: If the PDF is invalid, corrupted, 0 bytes, or cannot be parsed.
    """
    if not pdf_path:
        raise ValueError("pdf_path must be a non-empty string or Path object.")

    target_path = Path(pdf_path).resolve()

    if not target_path.exists():
        raise FileNotFoundError(f"PDF file not found: {target_path}")

    if target_path.is_dir():
        raise IsADirectoryError(f"Provided path is a directory, not a PDF file: {target_path}")

    # Check for 0-byte file before attempting fitz open
    if target_path.stat().st_size == 0:
        raise PDFExtractionError(f"PDF file is empty (0 bytes): {target_path.name}")

    try:
        doc = fitz.open(str(target_path))
    except Exception as err:
        raise PDFExtractionError(
            f"Failed to open or parse PDF file '{target_path.name}': {err}"
        ) from err

    extracted_pages: List[Dict[str, Any]] = []
    total_pages = len(doc)

    try:
        for page_idx in range(total_pages):
            page_number = page_idx + 1
            try:
                page = doc.load_page(page_idx)
                raw_text = page.get_text()
            except Exception as page_err:
                raise PDFExtractionError(
                    f"Error extracting text from page {page_number} of '{target_path.name}': {page_err}"
                ) from page_err

            cleaned_text = raw_text.strip() if raw_text else ""

            if not cleaned_text:
                logger.warning(
                    "Page %d of '%s' contains no extractable text (empty or whitespace).",
                    page_number,
                    target_path.name,
                )
                if not include_empty_pages:
                    continue

            extracted_pages.append(
                {
                    "document_name": target_path.name,
                    "page_number": page_number,
                    "text": cleaned_text,
                    "source_path": str(target_path),
                }
            )

        if not extracted_pages and not include_empty_pages:
            logger.warning(
                "PDF '%s' contains no extractable text across all %d page(s).",
                target_path.name,
                total_pages,
            )

        return extracted_pages

    finally:
        doc.close()

