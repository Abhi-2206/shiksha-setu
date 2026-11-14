"""
Unit and integration test suite for the Semantic Retrieval module.
Mocks Gemini API embedding calls to ensure offline, deterministic test execution.
Uses ChromaDB EphemeralClient to isolate vector storage in memory.
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
from google.genai import types
from google.genai.errors import APIError

from embeddings.embedding_generator import EmbeddingGenerationError
from retrieval.retriever import (
    RetrievalError,
    generate_query_embedding,
    retrieve_relevant_chunks,
)
from vector_store.chroma_store import (
    delete_collection,
    get_chroma_client,
    get_or_create_collection,
    store_embeddings,
)


# ---------------------------------------------------------------------------
# Helpers and Fixtures
# ---------------------------------------------------------------------------

def make_mock_gemini_client(vector: list[float]) -> MagicMock:
    """Creates a mocked Gemini client that returns a specific embedding vector."""
    mock_client = MagicMock()
    mock_embeddings = [types.ContentEmbedding(values=vector)]
    mock_response = types.EmbedContentResponse(embeddings=mock_embeddings)
    mock_client.models.embed_content.return_value = mock_response
    return mock_client


@pytest.fixture
def ephemeral_client():
    """Provides a fresh in-memory ChromaDB client."""
    return get_chroma_client(ephemeral=True)


@pytest.fixture
def test_collection(ephemeral_client):
    """Provides a fresh test collection in the ephemeral client."""
    col = get_or_create_collection(ephemeral_client, collection_name="test_knowledge_col")
    yield col
    try:
        delete_collection(ephemeral_client, col.name)
    except Exception:
        pass


@pytest.fixture
def populated_collection(test_collection):
    """Populates test collection with 3 distinct domain chunks."""
    chunks = [
        {
            "chunk_id": "eligibility_p1_c0",
            "text": "Admission eligibility: 10th pass with Mathematics and Science from recognized board.",
            "embedding": [1.0, 0.0, 0.0],
            "document_name": "admission_guidelines.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "source_path": "/data/admission_guidelines.pdf",
        },
        {
            "chunk_id": "reservation_p2_c1",
            "text": "Reservation policy: SC candidates get 16%, ST candidates get 12% quota in Rajasthan.",
            "embedding": [0.0, 1.0, 0.0],
            "document_name": "reservation_policy.pdf",
            "page_number": 2,
            "chunk_index": 1,
            "source_path": "/data/reservation_policy.pdf",
        },
        {
            "chunk_id": "fee_p1_c0",
            "text": "Fee structure: Tuition fee for government polytechnic colleges is INR 6,500 per year.",
            "embedding": [0.0, 0.0, 1.0],
            "document_name": "fee_structure.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "source_path": "/data/fee_structure.pdf",
        },
    ]
    store_embeddings(chunks, test_collection)
    return test_collection


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

class TestQueryEmbeddingGeneration:
    def test_query_embedding_generation_success(self):
        """generate_query_embedding extracts values and returns a float vector."""
        expected_vector = [0.12, 0.45, 0.78]
        mock_client = make_mock_gemini_client(expected_vector)

        vec = generate_query_embedding("What is the eligibility?", gemini_client=mock_client)
        assert vec == expected_vector
        mock_client.models.embed_content.assert_called_once()

    def test_query_embedding_empty_query_raises(self):
        """Empty or whitespace queries must raise ValueError."""
        with pytest.raises(ValueError, match="non-empty string"):
            generate_query_embedding("")

        with pytest.raises(ValueError, match="non-empty string"):
            generate_query_embedding("   \n\t  ")

    def test_query_embedding_api_failure_raises(self):
        """APIError in Gemini client raises EmbeddingGenerationError."""
        mock_client = MagicMock()
        mock_client.models.embed_content.side_effect = APIError(500, {"error": {"message": "Internal error"}})

        with pytest.raises(EmbeddingGenerationError, match="Gemini API error"):
            generate_query_embedding("Valid query", gemini_client=mock_client)


class TestSemanticRetrieval:
    def test_successful_semantic_retrieval(self, populated_collection):
        """Query with vector close to eligibility chunk retrieves that chunk as top result."""
        # Vector pointing towards eligibility chunk [1.0, 0.0, 0.0]
        query_vector = [0.95, 0.05, 0.0]
        mock_client = make_mock_gemini_client(query_vector)

        results = retrieve_relevant_chunks(
            query="What are the admission eligibility criteria?",
            top_k=1,
            collection=populated_collection,
            gemini_client=mock_client,
        )

        assert len(results) == 1
        top_match = results[0]
        assert top_match["chunk_id"] == "eligibility_p1_c0"
        assert "10th pass" in top_match["text"]
        assert top_match["document_name"] == "admission_guidelines.pdf"
        assert top_match["page_number"] == 1
        assert top_match["source_path"] == "/data/admission_guidelines.pdf"
        assert isinstance(top_match["distance"], float)
        assert top_match["distance"] < 0.2  # Very close distance

    def test_multiple_results_and_ordering(self, populated_collection):
        """Retrieves multiple results ordered by proximity to the query vector."""
        # Query closer to eligibility [1,0,0] than reservation [0,1,0], farthest from fee [0,0,1]
        query_vector = [0.8, 0.6, 0.0]
        mock_client = make_mock_gemini_client(query_vector)

        results = retrieve_relevant_chunks(
            query="Tell me about eligibility and reservation quota",
            top_k=3,
            collection=populated_collection,
            gemini_client=mock_client,
        )

        assert len(results) == 3
        # Should be ordered by distance ascending
        assert results[0]["distance"] <= results[1]["distance"] <= results[2]["distance"]
        result_ids = [r["chunk_id"] for r in results]
        assert "eligibility_p1_c0" in result_ids
        assert "reservation_p2_c1" in result_ids
        assert "fee_p1_c0" in result_ids

    def test_correct_top_k_behavior(self, populated_collection):
        """top_k restricts the number of returned chunks."""
        query_vector = [0.1, 0.1, 0.9]
        mock_client = make_mock_gemini_client(query_vector)

        res_1 = retrieve_relevant_chunks(
            query="How much is the fee?",
            top_k=1,
            collection=populated_collection,
            gemini_client=mock_client,
        )
        assert len(res_1) == 1

        res_2 = retrieve_relevant_chunks(
            query="How much is the fee?",
            top_k=2,
            collection=populated_collection,
            gemini_client=mock_client,
        )
        assert len(res_2) == 2

    def test_metadata_preservation(self, populated_collection):
        """All metadata keys are preserved accurately in the returned dictionary."""
        mock_client = make_mock_gemini_client([0.0, 0.0, 1.0])
        results = retrieve_relevant_chunks(
            query="Annual fee",
            top_k=1,
            collection=populated_collection,
            gemini_client=mock_client,
        )

        assert len(results) == 1
        item = results[0]
        required_keys = {"chunk_id", "text", "document_name", "page_number", "source_path", "distance"}
        assert required_keys.issubset(item.keys())
        assert item["document_name"] == "fee_structure.pdf"
        assert item["page_number"] == 1
        assert item["source_path"] == "/data/fee_structure.pdf"


class TestValidationAndErrorHandling:
    def test_empty_query_rejected(self, test_collection):
        """Empty and whitespace strings must raise ValueError."""
        with pytest.raises(ValueError, match="non-empty string"):
            retrieve_relevant_chunks("", collection=test_collection)

        with pytest.raises(ValueError, match="non-empty string"):
            retrieve_relevant_chunks("   \t  ", collection=test_collection)

    def test_invalid_top_k_rejected(self, test_collection):
        """top_k <= 0 or non-integer must raise ValueError."""
        with pytest.raises(ValueError, match="positive integer"):
            retrieve_relevant_chunks("Query", top_k=0, collection=test_collection)

        with pytest.raises(ValueError, match="positive integer"):
            retrieve_relevant_chunks("Query", top_k=-2, collection=test_collection)

        with pytest.raises(ValueError, match="positive integer"):
            retrieve_relevant_chunks("Query", top_k="five", collection=test_collection)

        with pytest.raises(ValueError, match="positive integer"):
            retrieve_relevant_chunks("Query", top_k=True, collection=test_collection)

    def test_empty_collection_returns_empty_list(self, test_collection):
        """Empty collection returns [] gracefully without attempting embeddings."""
        mock_client = MagicMock()
        results = retrieve_relevant_chunks(
            query="Any question",
            top_k=5,
            collection=test_collection,
            gemini_client=mock_client,
        )
        assert results == []
        # Embedding API must NOT be called if collection is empty
        mock_client.models.embed_content.assert_not_called()

    def test_missing_api_key_raises(self, populated_collection):
        """When GEMINI_API_KEY is unset and no key is provided, raises ValueError."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
            with pytest.raises(ValueError, match="GEMINI_API_KEY"):
                retrieve_relevant_chunks(
                    query="Valid question",
                    collection=populated_collection,
                    api_key="",
                    gemini_client=None,
                )

    def test_gemini_embedding_api_failure_raises_retrieval_error(self, populated_collection):
        """Gemini embedding failure is wrapped into a RetrievalError."""
        mock_client = MagicMock()
        mock_client.models.embed_content.side_effect = APIError(429, {"error": {"message": "Quota exceeded"}})

        with pytest.raises(RetrievalError, match="embedding"):
            retrieve_relevant_chunks(
                query="Valid question",
                collection=populated_collection,
                gemini_client=mock_client,
            )

    def test_chromadb_query_failure_raises_retrieval_error(self, populated_collection):
        """ChromaDB query failure raises RetrievalError."""
        mock_client = make_mock_gemini_client([1.0, 0.0, 0.0])
        with patch.object(populated_collection, "query", side_effect=Exception("DB connection broken")):
            with pytest.raises(RetrievalError, match="similarity query failed"):
                retrieve_relevant_chunks(
                    query="Valid question",
                    collection=populated_collection,
                    gemini_client=mock_client,
                )

    def test_no_results_handling(self, populated_collection):
        """When ChromaDB query returns empty result structure, function returns []."""
        mock_client = make_mock_gemini_client([1.0, 0.0, 0.0])
        empty_query_result = {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        with patch.object(populated_collection, "query", return_value=empty_query_result):
            results = retrieve_relevant_chunks(
                query="Valid question",
                collection=populated_collection,
                gemini_client=mock_client,
            )
            assert results == []


class TestPackageImports:
    def test_imports_from_package(self):
        """Module functions and error classes can be cleanly imported from retrieval."""
        from retrieval import (  # noqa: F401
            RetrievalError,
            generate_query_embedding,
            retrieve_relevant_chunks,
        )
