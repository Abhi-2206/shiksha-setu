"""
Unit tests for the PDF text extraction module (ai-service/ingestion/pdf_loader.py).
Tests all edge cases using temporary, dynamically created PDFs without external dependencies.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

# Ensure ai-service is in sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

try:
    import pymupdf as fitz
except ImportError:
    import fitz

from ingestion.pdf_loader import PDFExtractionError, extract_text_from_pdf


def create_temporary_pdf(pages_content: list[str]) -> Path:
    """Helper to create a temporary PDF with given text content per page."""
    temp_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    temp_path = Path(temp_file.name)
    temp_file.close()

    doc = fitz.open()
    for text in pages_content:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text)
    doc.save(str(temp_path))
    doc.close()
    return temp_path


def test_single_page_pdf():
    print("\n--- Test: Single-page PDF extraction ---")
    pdf_path = create_temporary_pdf(["DTE Rajasthan Polytechnic Admissions 2026."])
    try:
        pages = extract_text_from_pdf(pdf_path)
        assert len(pages) == 1, f"Expected 1 page, got {len(pages)}"
        page = pages[0]
        assert page["document_name"] == pdf_path.name
        assert page["page_number"] == 1
        assert "DTE Rajasthan Polytechnic" in page["text"]
        assert page["source_path"] == str(pdf_path.resolve())
        print(f"PASS: Single page extracted correctly. (document_name={page['document_name']}, page_number={page['page_number']})")
    finally:
        pdf_path.unlink()


def test_multipage_pdf_and_page_numbering():
    print("\n--- Test: Multi-page PDF and page numbering ---")
    contents = [
        "First page: Introduction and General Instructions.",
        "Second page: Eligibility Criteria and Reservation Policy.",
        "Third page: List of Government Polytechnic Colleges in Rajasthan.",
    ]
    pdf_path = create_temporary_pdf(contents)
    try:
        pages = extract_text_from_pdf(pdf_path)
        assert len(pages) == 3, f"Expected 3 pages, got {len(pages)}"

        for i, page in enumerate(pages, 1):
            assert page["page_number"] == i, f"Expected page {i}, got {page['page_number']}"
            assert contents[i - 1].split(":")[0] in page["text"]
            assert page["document_name"] == pdf_path.name
            print(f"  Page {page['page_number']}: '{page['text'][:35]}...'")

        print("PASS: Multi-page numbering and text verified.")
    finally:
        pdf_path.unlink()


def test_missing_pdf_file():
    print("\n--- Test: Missing PDF file ---")
    non_existent = Path("non_existent_document_12345.pdf")
    try:
        extract_text_from_pdf(non_existent)
        assert False, "Expected FileNotFoundError for missing file."
    except FileNotFoundError as err:
        print(f"PASS: Caught expected FileNotFoundError: {err}")


def test_corrupted_pdf_file():
    print("\n--- Test: Invalid/Corrupted PDF file ---")
    temp_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    temp_path = Path(temp_file.name)
    temp_file.write(b"%PDF-1.4 Header but corrupted garbage body !!!")
    temp_file.close()

    try:
        extract_text_from_pdf(temp_path)
        assert False, "Expected PDFExtractionError for corrupted file."
    except PDFExtractionError as err:
        print(f"PASS: Caught expected PDFExtractionError: {err}")
    finally:
        temp_path.unlink()


def test_zero_byte_pdf_file():
    print("\n--- Test: Zero-byte PDF file ---")
    temp_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    temp_path = Path(temp_file.name)
    temp_file.close()

    try:
        extract_text_from_pdf(temp_path)
        assert False, "Expected PDFExtractionError for 0-byte file."
    except PDFExtractionError as err:
        print(f"PASS: Caught expected PDFExtractionError for 0-byte file: {err}")
    finally:
        temp_path.unlink()


def test_individual_blank_pages():
    print("\n--- Test: PDF with blank/whitespace pages ---")
    # Page 1: Has text; Page 2: Blank (""); Page 3: Whitespace only ("   \n\t"); Page 4: Has text
    contents = [
        "Page 1: Important dates for counseling.",
        "",
        "   \n\t  ",
        "Page 4: Fee structure and refund rules.",
    ]
    pdf_path = create_temporary_pdf(contents)
    try:
        # Default behavior: empty/whitespace pages omitted, page numbers preserved
        pages_default = extract_text_from_pdf(pdf_path, include_empty_pages=False)
        assert len(pages_default) == 2, f"Expected 2 non-empty pages, got {len(pages_default)}"
        assert pages_default[0]["page_number"] == 1
        assert pages_default[1]["page_number"] == 4
        print(f"PASS: Default omitted blank pages while preserving page numbers (pages: {[p['page_number'] for p in pages_default]})")

        # include_empty_pages=True behavior
        pages_all = extract_text_from_pdf(pdf_path, include_empty_pages=True)
        assert len(pages_all) == 4, f"Expected 4 pages, got {len(pages_all)}"
        assert pages_all[1]["text"] == ""
        assert pages_all[2]["text"] == ""
        print(f"PASS: include_empty_pages=True retained all 4 pages correctly.")
    finally:
        pdf_path.unlink()


def test_pdf_with_no_extractable_text():
    print("\n--- Test: PDF with no extractable text across all pages ---")
    pdf_path = create_temporary_pdf(["", "    ", "\n\n"])
    try:
        pages = extract_text_from_pdf(pdf_path, include_empty_pages=False)
        assert len(pages) == 0, f"Expected empty list for blank PDF, got {len(pages)}"
        print("PASS: Correctly returned empty list for document with no extractable text.")
    finally:
        pdf_path.unlink()


def run_all_tests():
    print("==================================================")
    print(" Shiksha Setu PDF Loader Test Suite")
    print("==================================================")
    test_single_page_pdf()
    test_multipage_pdf_and_page_numbering()
    test_missing_pdf_file()
    test_corrupted_pdf_file()
    test_zero_byte_pdf_file()
    test_individual_blank_pages()
    test_pdf_with_no_extractable_text()
    print("\n==================================================")
    print(" All PDF Loader tests passed successfully!")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()

