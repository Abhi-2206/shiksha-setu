"""Document ingestion module for Shiksha Setu."""
from ingestion.pdf_loader import PDFExtractionError, extract_text_from_pdf

__all__ = ["extract_text_from_pdf", "PDFExtractionError"]

