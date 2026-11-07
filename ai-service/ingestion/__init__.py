"""Document ingestion module for Shiksha Setu."""
try:
    from ingestion.pdf_loader import PDFExtractionError, extract_text_from_pdf
    from ingestion.text_chunker import chunk_documents
except ImportError:
    from .pdf_loader import PDFExtractionError, extract_text_from_pdf
    from .text_chunker import chunk_documents

__all__ = ["extract_text_from_pdf", "PDFExtractionError", "chunk_documents"]

