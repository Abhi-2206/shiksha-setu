"""
Unit test suite for the text chunking module (ai-service/ingestion/text_chunker.py).
Tests all chunking behaviors, overlap correctness, metadata preservation, and validation edge cases using synthetic data.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure ai-service is in sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

import pytest
from ingestion.text_chunker import chunk_documents


def make_sample_doc(
    text: str,
    doc_name: str = "rajasthan_polytechnic_guidelines.pdf",
    page_num: int = 1,
    source_path: str = "/data/rajasthan_polytechnic_guidelines.pdf",
) -> dict:
    """Helper to generate a mock document dictionary matching extract_text_from_pdf() output."""
    return {
        "document_name": doc_name,
        "page_number": page_num,
        "text": text,
        "source_path": source_path,
    }


def test_short_text_produces_single_chunk():
    """Short text below chunk_size should produce exactly one chunk."""
    text = (
        "The Department of Technical Education, Government of Rajasthan conducts centralized "
        "admission for polytechnic engineering diploma courses."
    )
    doc = make_sample_doc(text)
    chunks = chunk_documents([doc], chunk_size=800, chunk_overlap=150)

    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk["chunk_index"] == 0
    assert chunk["chunk_id"] == "rajasthan_polytechnic_guidelines.pdf_p1_c0"
    assert chunk["document_name"] == doc["document_name"]
    assert chunk["page_number"] == 1
    assert chunk["source_path"] == doc["source_path"]
    assert chunk["text"] == text


def test_long_text_produces_multiple_chunks():
    """Long text exceeding chunk_size should be split into multiple chunks."""
    paragraph = (
        "Rajasthan Technical Education Department supervises polytechnic colleges across all districts. "
        "Students can choose branches such as Computer Science, Civil, Electrical, and Mechanical Engineering. "
        "Centralized counseling is held every academic year through the official DTE Rajasthan portal. "
    )
    # Total length ~4000 characters
    long_text = paragraph * 15
    doc = make_sample_doc(long_text)
    chunks = chunk_documents([doc], chunk_size=800, chunk_overlap=150)

    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk["text"]) <= 850  # Allows slight margin for sentence boundary


def test_correct_overlap_between_consecutive_chunks():
    """Consecutive chunks must have overlapping text."""
    paragraph = (
        "The Directorate of Technical Education Rajasthan oversees quality standards, curriculum updates, "
        "faculty development programs, and laboratory modernization across state polytechnics. "
        "Scholarships and fee concessions are granted to meritorious and reserved category applicants. "
    )
    long_text = paragraph * 10
    doc = make_sample_doc(long_text)
    chunks = chunk_documents([doc], chunk_size=800, chunk_overlap=150)

    assert len(chunks) >= 2
    for i in range(len(chunks) - 1):
        curr_chunk = chunks[i]["text"]
        next_chunk = chunks[i + 1]["text"]

        # The tail of curr_chunk and the head of next_chunk should overlap
        # Check by searching for word sequences from the beginning of next_chunk in curr_chunk
        next_words = next_chunk.split()[:8]
        next_phrase = " ".join(next_words)

        assert next_phrase in curr_chunk, (
            f"Expected overlap phrase '{next_phrase}' from chunk {i+1} to be present in chunk {i}"
        )


def test_no_text_loss_during_chunking():
    """Ensure every distinct sentence in the original document appears in at least one chunk."""
    sentences = [
        f"Sentence number {i:03d} detailing Rajasthan educational policy clause {i}."
        for i in range(1, 40)
    ]
    full_text = " ".join(sentences)
    doc = make_sample_doc(full_text)
    chunks = chunk_documents([doc], chunk_size=600, chunk_overlap=120)

    for sentence in sentences:
        found = any(sentence in chunk["text"] for chunk in chunks)
        assert found, f"Sentence was lost during chunking: '{sentence}'"


def test_no_empty_chunks():
    """Chunks should never be empty or whitespace-only."""
    text = "Section 1: Details.   \n\n   Section 2: Rules.   \n\n\n   Section 3: Conclusion. "
    doc = make_sample_doc(text)
    chunks = chunk_documents([doc], chunk_size=50, chunk_overlap=10)

    assert len(chunks) > 0
    for chunk in chunks:
        assert len(chunk["text"].strip()) > 0


def test_document_metadata_preservation():
    """All metadata fields must be preserved on all generated chunks."""
    doc = make_sample_doc(
        text="A" * 2000,
        doc_name="dte_circular_2026.pdf",
        page_num=5,
        source_path="/var/docs/dte_circular_2026.pdf",
    )
    chunks = chunk_documents([doc], chunk_size=600, chunk_overlap=100)

    for chunk in chunks:
        assert chunk["document_name"] == "dte_circular_2026.pdf"
        assert chunk["page_number"] == 5
        assert chunk["source_path"] == "/var/docs/dte_circular_2026.pdf"


def test_correct_chunk_indexing():
    """Chunk index should be 0-based and increment sequentially per page."""
    doc = make_sample_doc("Word " * 500)
    chunks = chunk_documents([doc], chunk_size=400, chunk_overlap=80)

    assert len(chunks) >= 3
    for idx, chunk in enumerate(chunks):
        assert chunk["chunk_index"] == idx
        assert chunk["chunk_id"] == f"{doc['document_name']}_p1_c{idx}"


def test_multiple_pages_processed_independently():
    """Chunks from different pages must not merge and must track page numbers properly."""
    doc_page1 = make_sample_doc("Page 1 Content: " + ("Admissions " * 150), page_num=1)
    doc_page2 = make_sample_doc("Page 2 Content: " + ("Examinations " * 150), page_num=2)

    chunks = chunk_documents([doc_page1, doc_page2], chunk_size=500, chunk_overlap=100)

    p1_chunks = [c for c in chunks if c["page_number"] == 1]
    p2_chunks = [c for c in chunks if c["page_number"] == 2]

    assert len(p1_chunks) > 1
    assert len(p2_chunks) > 1

    # Verify Page 1 chunks only contain Page 1 content
    for c in p1_chunks:
        assert "Examinations" not in c["text"]
        assert "Admissions" in c["text"]
    assert p1_chunks[0]["chunk_index"] == 0

    # Verify Page 2 chunks only contain Page 2 content
    for c in p2_chunks:
        assert "Admissions" not in c["text"]
        assert "Examinations" in c["text"]
    assert p2_chunks[0]["chunk_index"] == 0


def test_multiple_documents_processed_independently():
    """Multiple documents must be processed without cross-contamination."""
    doc_a = make_sample_doc("College A: Jaipur " * 100, doc_name="college_a.pdf")
    doc_b = make_sample_doc("College B: Jodhpur " * 100, doc_name="college_b.pdf")

    chunks = chunk_documents([doc_a, doc_b], chunk_size=600, chunk_overlap=100)

    chunks_a = [c for c in chunks if c["document_name"] == "college_a.pdf"]
    chunks_b = [c for c in chunks if c["document_name"] == "college_b.pdf"]

    assert len(chunks_a) > 0
    assert len(chunks_b) > 0
    for c in chunks_a:
        assert "Jodhpur" not in c["text"]
    for c in chunks_b:
        assert "Jaipur" not in c["text"]


def test_empty_document_list():
    """An empty document list should return an empty list of chunks."""
    assert chunk_documents([]) == []


def test_empty_and_whitespace_only_page_text():
    """Pages with empty or whitespace text should be skipped and produce no chunks."""
    empty_doc = make_sample_doc("", page_num=1)
    whitespace_doc = make_sample_doc("   \n\t   \n  ", page_num=2)
    valid_doc = make_sample_doc("Valid content for page 3.", page_num=3)

    chunks = chunk_documents([empty_doc, whitespace_doc, valid_doc])
    assert len(chunks) == 1
    assert chunks[0]["page_number"] == 3
    assert chunks[0]["text"] == "Valid content for page 3."


def test_invalid_chunk_size():
    """Invalid chunk_size values must raise ValueError."""
    doc = make_sample_doc("Sample text")

    for invalid in [0, -50, True, False]:
        with pytest.raises(ValueError):
            chunk_documents([doc], chunk_size=invalid)

    for invalid in ["800", None, 3.14]:
        with pytest.raises(ValueError):
            chunk_documents([doc], chunk_size=invalid)  # type: ignore


def test_invalid_chunk_overlap():
    """Negative overlap or overlap >= chunk_size must raise ValueError."""
    doc = make_sample_doc("Sample text")

    # Negative
    with pytest.raises(ValueError):
        chunk_documents([doc], chunk_overlap=-1)

    # Boolean
    with pytest.raises(ValueError):
        chunk_documents([doc], chunk_overlap=True)

    # Overlap equal to chunk_size
    with pytest.raises(ValueError):
        chunk_documents([doc], chunk_size=500, chunk_overlap=500)

    # Overlap greater than chunk_size
    with pytest.raises(ValueError):
        chunk_documents([doc], chunk_size=500, chunk_overlap=600)


def test_missing_metadata_keys():
    """Missing any required metadata key must raise ValueError."""
    # Missing 'document_name'
    invalid_doc1 = {"page_number": 1, "text": "Hello", "source_path": "/path"}
    with pytest.raises(ValueError):
        chunk_documents([invalid_doc1])

    # Missing 'page_number'
    invalid_doc2 = {"document_name": "d.pdf", "text": "Hello", "source_path": "/path"}
    with pytest.raises(ValueError):
        chunk_documents([invalid_doc2])

    # Missing 'text'
    invalid_doc3 = {"document_name": "d.pdf", "page_number": 1, "source_path": "/path"}
    with pytest.raises(ValueError):
        chunk_documents([invalid_doc3])

    # Missing 'source_path'
    invalid_doc4 = {"document_name": "d.pdf", "page_number": 1, "text": "Hello"}
    with pytest.raises(ValueError):
        chunk_documents([invalid_doc4])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

