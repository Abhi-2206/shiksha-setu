"""
Text chunking module for Shiksha Setu AI Student Assistance Chatbot.
Chunks extracted PDF page documents with configurable size, overlap, and boundary detection.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Set

logger = logging.getLogger(__name__)

REQUIRED_METADATA_KEYS: Set[str] = {
    "document_name",
    "page_number",
    "text",
    "source_path",
}

# Preferred split separators in priority order
_SPLIT_SEPARATORS: List[str] = [
    "\n\n",   # Paragraph boundary
    "।\n",    # Hindi purna viram + newline
    "। ",     # Hindi purna viram + space
    ".\n",    # Sentence boundary + newline
    ". ",     # Sentence boundary + space
    "?\n",    # Question boundary + newline
    "? ",     # Question boundary + space
    "!\n",    # Exclamation boundary + newline
    "! ",     # Exclamation boundary + space
    ";\n",    # Semicolon + newline
    "; ",     # Semicolon + space
    "\n",     # Line break
    " ",      # Word boundary
]


def _split_text_into_chunks(
    text: str,
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> List[str]:
    """
    Splits a single text string into overlapping chunks, respecting natural word/sentence boundaries.

    Args:
        text: The cleaned text string to split.
        chunk_size: Target maximum characters per chunk.
        chunk_overlap: Target overlap characters between adjacent chunks.

    Returns:
        List of non-empty string chunks.
    """
    cleaned_text = text.strip()
    if not cleaned_text:
        return []

    text_len = len(cleaned_text)
    if text_len <= chunk_size:
        return [cleaned_text]

    chunks: List[str] = []
    start = 0

    while start < text_len:
        target_end = start + chunk_size

        if target_end >= text_len:
            final_chunk = cleaned_text[start:].strip()
            if final_chunk:
                chunks.append(final_chunk)
            break

        # Search for the best natural boundary within a reasonable window before target_end
        window_start = max(start + chunk_overlap, target_end - 150)
        break_idx = -1

        for sep in _SPLIT_SEPARATORS:
            pos = cleaned_text.rfind(sep, window_start, target_end)
            if pos != -1:
                break_idx = pos + len(sep)
                break

        if break_idx == -1:
            end = target_end
        else:
            end = break_idx

        chunk = cleaned_text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break

        # Calculate next start position with overlap
        target_start = end - chunk_overlap
        if target_start <= start:
            target_start = start + 1

        # Search for a clean word boundary near target_start to avoid cutting words at start
        search_min = max(start, target_start - 30)
        prev_space = cleaned_text.rfind(" ", search_min, target_start)
        if prev_space != -1 and prev_space > start:
            next_start = prev_space + 1
        else:
            next_start = target_start

        # Guard against zero or backwards progress
        if next_start >= end or next_start <= start:
            next_start = start + max(1, chunk_size - chunk_overlap)

        start = next_start

    return chunks


def chunk_documents(
    documents: List[Dict[str, Any]],
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> List[Dict[str, Any]]:
    """
    Splits page-level documents into smaller, overlapping text chunks suitable for embedding and retrieval.

    Args:
        documents: List of document dictionaries returned by extract_text_from_pdf().
                   Each dict must contain: 'document_name', 'page_number', 'text', 'source_path'.
        chunk_size: Target maximum characters per chunk (default: 800).
        chunk_overlap: Overlap characters between consecutive chunks (default: 150).

    Returns:
        List of chunk dictionaries:
        [
            {
                "document_name": str,
                "page_number": int,
                "chunk_id": str,
                "chunk_index": int,
                "text": str,
                "source_path": str,
            },
            ...
        ]

    Raises:
        TypeError: If documents is not a list or document items are not dictionaries.
        ValueError: If chunk_size <= 0, chunk_overlap < 0, chunk_overlap >= chunk_size,
                    or if required metadata keys are missing.
    """
    # Parameter validations
    if isinstance(chunk_size, bool) or not isinstance(chunk_size, int) or chunk_size <= 0:
        raise ValueError(f"chunk_size must be a positive integer, got: {chunk_size}")

    if isinstance(chunk_overlap, bool) or not isinstance(chunk_overlap, int) or chunk_overlap < 0:
        raise ValueError(f"chunk_overlap must be a non-negative integer, got: {chunk_overlap}")

    if chunk_overlap >= chunk_size:
        raise ValueError(
            f"chunk_overlap ({chunk_overlap}) must be strictly smaller than chunk_size ({chunk_size})"
        )

    if not isinstance(documents, list):
        raise TypeError(f"documents must be a list of dictionaries, got: {type(documents).__name__}")

    if not documents:
        return []

    all_chunks: List[Dict[str, Any]] = []

    for doc_idx, doc in enumerate(documents):
        if not isinstance(doc, dict):
            raise TypeError(
                f"Document item at index {doc_idx} is not a dictionary: {type(doc).__name__}"
            )

        missing_keys = REQUIRED_METADATA_KEYS - doc.keys()
        if missing_keys:
            raise ValueError(
                f"Document at index {doc_idx} is missing required metadata key(s): {sorted(missing_keys)}"
            )

        document_name = doc["document_name"]
        page_number = doc["page_number"]
        raw_text = doc["text"]
        source_path = doc["source_path"]

        if not isinstance(document_name, str) or not document_name.strip():
            raise ValueError(f"document_name at index {doc_idx} must be a non-empty string.")

        if isinstance(page_number, bool) or not isinstance(page_number, int) or page_number <= 0:
            raise ValueError(f"page_number at index {doc_idx} must be a positive integer.")

        if not isinstance(raw_text, str):
            raise TypeError(f"text at index {doc_idx} must be a string, got {type(raw_text).__name__}.")

        if not isinstance(source_path, str) or not source_path.strip():
            raise ValueError(f"source_path at index {doc_idx} must be a non-empty string.")

        cleaned_text = raw_text.strip()
        if not cleaned_text:
            logger.debug(
                "Skipping page %d of '%s' due to empty or whitespace-only text.",
                page_number,
                document_name,
            )
            continue

        page_text_chunks = _split_text_into_chunks(
            text=cleaned_text,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        for chunk_idx, chunk_text in enumerate(page_text_chunks):
            chunk_id = f"{document_name}_p{page_number}_c{chunk_idx}"
            all_chunks.append(
                {
                    "document_name": document_name,
                    "page_number": page_number,
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_idx,
                    "text": chunk_text,
                    "source_path": source_path,
                }
            )

    return all_chunks

