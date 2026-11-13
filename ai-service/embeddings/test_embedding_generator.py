"""
Unit test suite for the text embedding generation module (ai-service/embeddings/embedding_generator.py).
Mocks all Gemini API interactions to ensure offline, deterministic, and isolated testing.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure ai-service directory is on sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

import pytest
from google.genai.errors import APIError
from google.genai import types

from embeddings.embedding_generator import (
    EmbeddingGenerationError,
    generate_embeddings,
    get_gemini_client,
)


def make_sample_chunk(
    text: str,
    doc_name: str = "rajasthan_polytechnic_syllabus.pdf",
    page_num: int = 1,
    chunk_idx: int = 0,
    source_path: str = "/data/rajasthan_polytechnic_syllabus.pdf",
) -> dict:
    """Helper to create a valid chunk matching chunk_documents() output format."""
    return {
        "document_name": doc_name,
        "page_number": page_num,
        "chunk_id": f"{doc_name}_p{page_num}_c{chunk_idx}",
        "chunk_index": chunk_idx,
        "text": text,
        "source_path": source_path,
    }


def make_mock_client(return_vectors: list[list[float]]) -> MagicMock:
    """Helper to create a mocked genai.Client returning specific embedding vectors."""
    mock_client = MagicMock()
    mock_embeddings = [types.ContentEmbedding(values=vec) for vec in return_vectors]
    mock_response = types.EmbedContentResponse(embeddings=mock_embeddings)
    mock_client.models.embed_content.return_value = mock_response
    return mock_client


def test_empty_input_returns_empty_list():
    """An empty list of chunks should return an empty list without calling the API."""
    mock_client = MagicMock()
    result = generate_embeddings([], client=mock_client)
    assert result == []
    mock_client.models.embed_content.assert_not_called()


def test_successful_single_chunk_embedding():
    """Verify embedding is generated and attached for a single chunk."""
    chunk = make_sample_chunk("Rajasthan DTE polytechnic diploma course details.")
    dummy_vector = [0.15] * 768

    mock_client = make_mock_client([dummy_vector])
    result = generate_embeddings([chunk], client=mock_client)

    assert len(result) == 1
    enriched = result[0]
    assert enriched["document_name"] == chunk["document_name"]
    assert enriched["page_number"] == chunk["page_number"]
    assert enriched["chunk_id"] == chunk["chunk_id"]
    assert enriched["chunk_index"] == chunk["chunk_index"]
    assert enriched["source_path"] == chunk["source_path"]
    assert enriched["text"] == chunk["text"]
    assert enriched["embedding"] == dummy_vector
    assert len(enriched["embedding"]) == 768

    mock_client.models.embed_content.assert_called_once()


def test_multiple_chunks_and_correct_mapping():
    """Ensure returned vectors map accurately to their respective chunks in sequence."""
    chunk1 = make_sample_chunk("First chunk text: admissions.", chunk_idx=0)
    chunk2 = make_sample_chunk("Second chunk text: scholarships.", chunk_idx=1)
    chunk3 = make_sample_chunk("Third chunk text: examination schedule.", chunk_idx=2)

    vec1 = [0.1, 0.2, 0.3]
    vec2 = [0.4, 0.5, 0.6]
    vec3 = [0.7, 0.8, 0.9]

    mock_client = make_mock_client([vec1, vec2, vec3])
    result = generate_embeddings([chunk1, chunk2, chunk3], client=mock_client)

    assert len(result) == 3
    assert result[0]["chunk_id"] == chunk1["chunk_id"]
    assert result[0]["embedding"] == vec1

    assert result[1]["chunk_id"] == chunk2["chunk_id"]
    assert result[1]["embedding"] == vec2

    assert result[2]["chunk_id"] == chunk3["chunk_id"]
    assert result[2]["embedding"] == vec3


def test_batching_multiple_chunks():
    """Verify large lists of chunks are split into batches of MAX_BATCH_SIZE."""
    total_chunks = 125
    chunks = [
        make_sample_chunk(f"Chunk text content number {i}", chunk_idx=i)
        for i in range(total_chunks)
    ]
    dummy_vector = [0.01] * 128

    mock_client = MagicMock()
    # Batch 1 returns 100 vectors, batch 2 returns 25 vectors
    resp1 = types.EmbedContentResponse(
        embeddings=[types.ContentEmbedding(values=dummy_vector) for _ in range(100)]
    )
    resp2 = types.EmbedContentResponse(
        embeddings=[types.ContentEmbedding(values=dummy_vector) for _ in range(25)]
    )
    mock_client.models.embed_content.side_effect = [resp1, resp2]

    result = generate_embeddings(chunks, client=mock_client)

    assert len(result) == 125
    assert mock_client.models.embed_content.call_count == 2
    for r in result:
        assert r["embedding"] == dummy_vector


def test_empty_or_whitespace_chunk_text():
    """Chunks with empty or whitespace-only text must raise ValueError."""
    mock_client = MagicMock()

    empty_chunk = make_sample_chunk("")
    with pytest.raises(ValueError, match="missing or empty text"):
        generate_embeddings([empty_chunk], client=mock_client)

    whitespace_chunk = make_sample_chunk("   \n\t  ")
    with pytest.raises(ValueError, match="missing or empty text"):
        generate_embeddings([whitespace_chunk], client=mock_client)


def test_missing_metadata_keys():
    """Missing required chunk metadata keys must raise ValueError."""
    mock_client = MagicMock()

    invalid_chunk = {
        "text": "Valid text",
        "document_name": "test.pdf",
        # Missing page_number, chunk_id, chunk_index, source_path
    }
    with pytest.raises(ValueError, match="missing required metadata key"):
        generate_embeddings([invalid_chunk], client=mock_client)


def test_missing_api_key_handling():
    """If no API key is provided and none in environment, raises ValueError."""
    chunk = make_sample_chunk("Some valid content.")

    with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=True):
        with pytest.raises(ValueError, match="GEMINI_API_KEY is not configured"):
            generate_embeddings([chunk], api_key=None, client=None)


def test_gemini_api_error_handling():
    """API errors raised by the Gemini SDK must be wrapped in EmbeddingGenerationError."""
    chunk = make_sample_chunk("Some valid content.")

    mock_client = MagicMock()
    mock_client.models.embed_content.side_effect = APIError(
        429,
        {"error": {"message": "Resource has been exhausted (rate limit)"}},
    )

    with pytest.raises(EmbeddingGenerationError, match="Gemini API error"):
        generate_embeddings([chunk], client=mock_client)


def test_inconsistent_vector_dimensions():
    """If the API returns inconsistent vector lengths, raises EmbeddingGenerationError."""
    chunk1 = make_sample_chunk("Chunk 1", chunk_idx=0)
    chunk2 = make_sample_chunk("Chunk 2", chunk_idx=1)

    vec1 = [0.1] * 768
    vec2 = [0.1] * 512  # Different dimension

    mock_client = make_mock_client([vec1, vec2])
    with pytest.raises(EmbeddingGenerationError, match="Vector dimension mismatch"):
        generate_embeddings([chunk1, chunk2], client=mock_client)


def test_non_numerical_vector():
    """If vector elements are non-numerical, raises EmbeddingGenerationError."""
    chunk = make_sample_chunk("Chunk 1")
    mock_item = MagicMock()
    mock_item.values = ["not_a_number", 0.5]
    mock_resp = MagicMock()
    mock_resp.embeddings = [mock_item]

    mock_client = MagicMock()
    mock_client.models.embed_content.return_value = mock_resp

    with pytest.raises(EmbeddingGenerationError, match="non-numerical"):
        generate_embeddings([chunk], client=mock_client)


def test_model_parameter_forwarding():
    """Verify that model override is passed to the SDK embed_content call."""
    chunk = make_sample_chunk("Content for custom model.")
    mock_client = make_mock_client([[0.5] * 128])

    generate_embeddings([chunk], model="custom-embedding-model-v2", client=mock_client)

    mock_client.models.embed_content.assert_called_once()
    call_kwargs = mock_client.models.embed_content.call_args.kwargs
    assert call_kwargs["model"] == "custom-embedding-model-v2"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
