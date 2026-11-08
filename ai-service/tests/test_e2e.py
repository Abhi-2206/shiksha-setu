"""
End-to-End (E2E) Test Suite for Shiksha Setu AI Service.

Validates:
1. Complete Ingestion-to-Storage pipeline:
   PDF creation -> text extraction -> chunking -> vector embedding -> ChromaDB persistent storage.
2. Semantic Retrieval workflow:
   User question -> query vector embedding -> vector similarity search -> chunk retrieval.
3. Grounded Chat Generation:
   Retrieved context -> grounded Gemini prompt -> answer with verified source citations.
4. FastAPI Endpoints E2E:
   /chat, /recommend-colleges, /predict-cutoff, /health.
5. Critical Failure Modes:
   Corrupt/empty PDFs, missing API keys, DB downtime, Gemini API errors, malformed payloads.

All tests run completely offline with mocked Gemini API and ephemeral ChromaDB instances.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure ai-service directory is on sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

import fitz  # PyMuPDF
import pytest
from fastapi.testclient import TestClient
from google.genai import types
from google.genai.errors import APIError

from api.main import app
from chatbot.generator import ask_chatbot
from embeddings.embedding_generator import generate_embeddings
from ingestion.pdf_loader import PDFExtractionError, extract_text_from_pdf
from ingestion.text_chunker import chunk_documents
from recommendation.college_recommender import recommend_colleges
from recommendation.cutoff_predictor import predict_cutoff
from retrieval.retriever import retrieve_relevant_chunks
from vector_store.chroma_store import (
    delete_collection,
    get_chroma_client,
    get_collection_count,
    get_or_create_collection,
    store_embeddings,
)


# ---------------------------------------------------------------------------
# Fixtures & Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def test_client():
    """Provides a fresh FastAPI test client without raising server exceptions."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def ephemeral_client():
    """Provides a clean in-memory ChromaDB client."""
    return get_chroma_client(ephemeral=True)


@pytest.fixture
def clean_collection(ephemeral_client):
    """Provides an isolated ChromaDB collection that is deleted on teardown."""
    col = get_or_create_collection(ephemeral_client, collection_name="e2e_test_knowledge")
    yield col
    try:
        delete_collection(ephemeral_client, col.name)
    except Exception:
        pass


def create_sample_pdf(file_path: Path, pages_text: list[str]) -> Path:
    """Helper to generate a real, valid multi-page PDF document on disk."""
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), text, fontsize=11)
    doc.save(str(file_path))
    doc.close()
    return file_path


def make_mock_embedding_client(dimension: int = 3) -> MagicMock:
    """Creates a mock Gemini client for embedding requests."""
    mock_client = MagicMock()

    def mock_embed(model, contents, **kwargs):
        # Return deterministic dummy vectors based on length of input text list
        num_texts = len(contents) if isinstance(contents, list) else 1
        vectors = [[0.1 * ((i + j) % 5 + 1) for j in range(dimension)] for i in range(num_texts)]
        embeddings = [types.ContentEmbedding(values=v) for v in vectors]
        return types.EmbedContentResponse(embeddings=embeddings)

    mock_client.models.embed_content.side_effect = mock_embed
    return mock_client


def make_mock_chat_client(answer_text: str = "Based on official records, eligibility is Class 10 pass.") -> MagicMock:
    """Creates a mock Gemini client for generate_content chat calls."""
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = answer_text
    client.models.generate_content.return_value = mock_resp
    return client


# ---------------------------------------------------------------------------
# Stage 1: Pipeline Integration (PDF -> Chunks -> Embeddings -> VectorStore)
# ---------------------------------------------------------------------------

class TestEndToEndPipeline:
    def test_full_ingestion_and_retrieval_cycle(self, clean_collection, tmp_path):
        """
        Tests the complete chain:
        1. Create sample PDF on disk.
        2. Extract text page by page.
        3. Split text into overlapping chunks.
        4. Generate embeddings via mocked Gemini.
        5. Store vectors and metadata into ChromaDB.
        6. Query ChromaDB with semantic question.
        7. Feed retrieved chunks into RAG chatbot to produce answer with citations.
        """
        # Step 1: Create a realistic PDF
        pdf_path = tmp_path / "rajasthan_polytechnic_admissions_2024.pdf"
        page_1 = (
            "Government of Rajasthan, Department of Technical Education.\n"
            "Admission Guidelines for Engineering Diploma Courses 2024-2025.\n"
            "Eligibility Criteria: Candidates seeking admission to 3-year Polytechnic Diploma "
            "must have passed Secondary Examination (Class 10th) with minimum 35% aggregate marks "
            "with Science and Mathematics subjects from Board of Secondary Education Rajasthan (BSER) "
            "or equivalent recognized board."
        )
        page_2 = (
            "Annual Fee Structure for Government Polytechnic Colleges:\n"
            "The annual tuition fee for government institutions is fixed at INR 6,500 per year.\n"
            "Examination fees and hostel charges shall be notified separately by the Board of Technical "
            "Education Rajasthan (BTER) Jodhpur."
        )
        create_sample_pdf(pdf_path, [page_1, page_2])
        assert pdf_path.exists()

        # Step 2: Extract text
        extracted_pages = extract_text_from_pdf(str(pdf_path))
        assert len(extracted_pages) == 2
        assert extracted_pages[0]["page_number"] == 1
        assert "Eligibility Criteria" in extracted_pages[0]["text"]

        # Step 3: Text Chunking
        chunks = chunk_documents(extracted_pages, chunk_size=250, chunk_overlap=50)
        assert len(chunks) >= 2
        for chunk in chunks:
            assert chunk["document_name"] == "rajasthan_polytechnic_admissions_2024.pdf"
            assert chunk["chunk_id"].startswith("rajasthan_polytechnic_admissions_2024.pdf_p")

        # Step 4: Embedding generation
        mock_embed_client = make_mock_embedding_client(dimension=4)
        embedded_chunks = generate_embeddings(chunks, client=mock_embed_client)
        assert len(embedded_chunks) == len(chunks)
        assert "embedding" in embedded_chunks[0]
        assert len(embedded_chunks[0]["embedding"]) == 4

        # Step 5: Store in ChromaDB
        stored_count = store_embeddings(embedded_chunks, clean_collection)
        assert stored_count == len(chunks)
        assert get_collection_count(clean_collection) == len(chunks)

        # Step 6: Semantic Retrieval
        retrieved = retrieve_relevant_chunks(
            query="What is the admission qualification for polytechnic?",
            top_k=2,
            collection=clean_collection,
            gemini_client=mock_embed_client,
        )
        assert len(retrieved) > 0
        assert retrieved[0]["document_name"] == "rajasthan_polytechnic_admissions_2024.pdf"
        assert "distance" in retrieved[0]

        # Step 7: RAG Chatbot Response Generation
        mock_chat_client = make_mock_chat_client(
            "According to the official guidelines, candidates must pass Class 10th with minimum 35% marks."
        )
        chat_result = ask_chatbot(
            question="What is the qualification for polytechnic?",
            top_k=2,
            collection=clean_collection,
            client=mock_chat_client,
            retriever_func=lambda q, top_k, **kw: retrieved,
        )

        assert chat_result["success"] is True
        assert "35% marks" in chat_result["answer"]
        assert len(chat_result["sources"]) >= 1
        assert chat_result["sources"][0]["document_name"] == "rajasthan_polytechnic_admissions_2024.pdf"


# ---------------------------------------------------------------------------
# Stage 2: Full FastAPI Endpoints E2E Workflows
# ---------------------------------------------------------------------------

class TestFastAPIEndToEnd:
    @patch("api.main.ask_chatbot")
    def test_e2e_chat_api_workflow(self, mock_ask, test_client):
        """Full request to POST /chat with valid payload returns grounded answer and sources."""
        mock_ask.return_value = {
            "answer": "Polytechnic annual fee is INR 6,500.",
            "sources": [
                {
                    "document_name": "fee_circular_2024.pdf",
                    "page_number": 2,
                    "source_path": "/data/fee_circular_2024.pdf",
                }
            ],
            "success": True,
            "status": "success",
            "error_type": None,
            "message": None,
        }

        response = test_client.post(
            "/chat",
            json={"question": "What is the fee for government polytechnic?", "top_k": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["answer"] == "Polytechnic annual fee is INR 6,500."
        assert len(data["sources"]) == 1
        assert data["sources"][0]["document_name"] == "fee_circular_2024.pdf"

    @patch("api.main.recommend_colleges")
    def test_e2e_recommendation_api_workflow(self, mock_rec, test_client):
        """Full request to POST /recommend-colleges returns tiered options."""
        mock_rec.return_value = {
            "student_rank": 3200,
            "category": "OBC",
            "preferred_course": "Civil Engineering",
            "preferred_location": "Jaipur",
            "disclaimer": "Indicative estimate based on historical cutoffs.",
            "total_recommendations": 2,
            "recommendations": [
                {
                    "college_id": "GPC_JAIPUR",
                    "college_name": "Government Polytechnic College Jaipur",
                    "location": "Jaipur",
                    "course_name": "Civil Engineering",
                    "category": "OBC",
                    "historical_opening_rank": 500,
                    "historical_closing_rank": 3800,
                    "admission_year": 2024,
                    "source": "DTE Cutoff Report 2024",
                    "source_year": 2024,
                    "category_status": "Likely",
                    "rationale": "Rank is safely within historical closing rank.",
                }
            ],
            "categorized": {
                "likely": [
                    {
                        "college_id": "GPC_JAIPUR",
                        "college_name": "Government Polytechnic College Jaipur",
                        "location": "Jaipur",
                        "course_name": "Civil Engineering",
                        "category": "OBC",
                        "historical_opening_rank": 500,
                        "historical_closing_rank": 3800,
                        "admission_year": 2024,
                        "source": "DTE Cutoff Report 2024",
                        "source_year": 2024,
                        "category_status": "Likely",
                        "rationale": "Rank is safely within historical closing rank.",
                    }
                ],
                "moderate": [],
                "ambitious": [],
            },
        }

        response = test_client.post(
            "/recommend-colleges",
            json={
                "rank": 3200,
                "category": "OBC",
                "preferred_course": "Civil Engineering",
                "preferred_location": "Jaipur",
                "top_k": 5,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["student_rank"] == 3200
        assert payload["category"] == "OBC"
        assert len(payload["recommendations"]) == 1
        assert payload["recommendations"][0]["category_status"] == "Likely"

    @patch("api.main.predict_cutoff")
    def test_e2e_cutoff_predictor_api_workflow(self, mock_pred, test_client):
        """Full request to POST /predict-cutoff returns multi-year trend and projections."""
        mock_pred.return_value = {
            "college_id": "GPC_JAIPUR",
            "college_name": "Government Polytechnic College Jaipur",
            "course_name": "Civil Engineering",
            "category": "GEN",
            "estimated_closing_rank": 3150,
            "confidence": "High",
            "trend": "increasing",
            "target_year": 2025,
            "historical_records": [
                {
                    "admission_year": 2023,
                    "opening_rank": 700,
                    "closing_rank": 2900,
                    "source": "Official Cutoff 2023",
                    "source_year": 2023,
                },
                {
                    "admission_year": 2024,
                    "opening_rank": 750,
                    "closing_rank": 3100,
                    "source": "Official Cutoff 2024",
                    "source_year": 2024,
                },
            ],
            "explanation": "Calculated via multi-year linear regression.",
            "methodology": "Multi-year linear trend projection.",
            "disclaimer": "Not an official cutoff.",
        }

        response = test_client.post(
            "/predict-cutoff",
            json={
                "college_id": "GPC_JAIPUR",
                "course_name": "Civil Engineering",
                "category": "GEN",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["college_id"] == "GPC_JAIPUR"
        assert data["estimated_closing_rank"] == 3150
        assert data["confidence"] == "High"


# ---------------------------------------------------------------------------
# Stage 3: Failure Modes & Security Safeguards
# ---------------------------------------------------------------------------

class TestFailureModesAndSecurity:
    def test_corrupt_or_zero_byte_pdf_handling(self, tmp_path):
        """0-byte and corrupt PDF files raise PDFExtractionError cleanly."""
        empty_pdf = tmp_path / "zero_byte.pdf"
        empty_pdf.write_bytes(b"")

        with pytest.raises(PDFExtractionError, match="empty"):
            extract_text_from_pdf(str(empty_pdf))

        corrupt_pdf = tmp_path / "corrupt.pdf"
        corrupt_pdf.write_bytes(b"Not a real PDF file contents")

        with pytest.raises(PDFExtractionError, match="Failed to open or parse"):
            extract_text_from_pdf(str(corrupt_pdf))

    def test_no_relevant_retrieved_chunks_returns_unverified_disclaimer(self, clean_collection):
        """When knowledge base has no matching documents, return safe disclaimer without fabricating."""
        mock_gemini = MagicMock()
        result = ask_chatbot(
            question="What is the admission cutoff for astrophysics in 2035?",
            collection=clean_collection,
            client=mock_gemini,
        )
        assert result["success"] is True
        assert "could not be verified" in result["answer"]
        assert "dte.rajasthan.gov.in" in result["answer"]
        assert result["sources"] == []
        mock_gemini.models.generate_content.assert_not_called()

    def test_missing_api_key_returns_graceful_error(self, clean_collection):
        """Missing API key returns structured error without crashing or leaking."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
            res = ask_chatbot(
                question="Tell me the fee",
                api_key="",
                client=None,
                retriever_func=lambda q, **kw: [{"document_name": "d.pdf", "page_number": 1, "source_path": "/d.pdf", "text": "fee"}],
            )
            assert res["success"] is False
            assert res["error_type"] == "missing_api_key"

    @patch("api.main.ask_chatbot")
    def test_gemini_api_failure_returns_503(self, mock_ask, test_client):
        """Gemini API failure returns HTTP 503 instead of 500 crash."""
        mock_ask.return_value = {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "api_error",
            "message": "Gemini 429 Quota Exceeded",
        }
        res = test_client.post("/chat", json={"question": "Syllabus info"})
        assert res.status_code == 503
        assert "AI service dependency error" in res.json()["detail"]

    @patch("api.main.ask_chatbot")
    def test_chromadb_unavailable_returns_503(self, mock_ask, test_client):
        """ChromaDB failure returns HTTP 503 instead of falling back to hallucinated answer."""
        mock_ask.return_value = {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "retrieval_error",
            "message": "Connection to ChromaDB timed out",
        }
        res = test_client.post("/chat", json={"question": "Hostel rules"})
        assert res.status_code == 503
        assert "AI service dependency error" in res.json()["detail"]

    def test_malformed_requests_rejected_by_pydantic(self, test_client):
        """Missing required fields or invalid types are rejected with 422."""
        # Missing question
        r1 = test_client.post("/chat", json={})
        assert r1.status_code == 422

        # Invalid rank (negative)
        r2 = test_client.post("/recommend-colleges", json={"rank": -5, "category": "GEN"})
        assert r2.status_code == 422

        # Missing college_id in predictor
        r3 = test_client.post("/predict-cutoff", json={"course_name": "Civil", "category": "GEN"})
        assert r3.status_code == 422

