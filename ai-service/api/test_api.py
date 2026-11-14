"""
Unit and integration test suite for Shiksha Setu FastAPI REST endpoints.
Uses FastAPI TestClient with mocked underlying AI modules to ensure
offline, deterministic execution without live Gemini API or network dependencies.
"""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure ai-service directory is on sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    """Provides a fresh FastAPI TestClient instance configured for HTTP status verification."""
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Health Endpoint Tests
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_check_returns_200_and_status(self, client):
        """GET /health returns 200 with service metadata."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "Shiksha Setu AI Service"
        assert "version" in data
        assert "description" in data


# ---------------------------------------------------------------------------
# Chat Endpoint Tests
# ---------------------------------------------------------------------------

class TestChatEndpoint:
    @patch("api.main.ask_chatbot")
    def test_successful_chat_request(self, mock_ask, client):
        """POST /chat successfully returns grounded answer and source citations."""
        mock_ask.return_value = {
            "answer": "Admission eligibility requires Class 10 pass with Mathematics and Science.",
            "sources": [
                {
                    "document_name": "admission_guidelines_2024.pdf",
                    "page_number": 1,
                    "source_path": "/data/admission_guidelines_2024.pdf",
                }
            ],
            "success": True,
            "status": "success",
            "error_type": None,
            "message": None,
        }

        response = client.post(
            "/chat",
            json={"question": "What is the eligibility for polytechnic?", "top_k": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "10 pass" in data["answer"]
        assert len(data["sources"]) == 1
        assert data["sources"][0]["document_name"] == "admission_guidelines_2024.pdf"
        mock_ask.assert_called_once_with(question="What is the eligibility for polytechnic?", top_k=3)

    def test_empty_chat_question_returns_422(self, client):
        """Empty or whitespace-only question is rejected with 422 Unprocessable Entity."""
        response = client.post("/chat", json={"question": ""})
        assert response.status_code == 422

        response_ws = client.post("/chat", json={"question": "   \n\t "})
        assert response_ws.status_code == 422

    @patch("api.main.ask_chatbot")
    def test_chat_retrieval_failure_returns_503(self, mock_ask, client):
        """When semantic retrieval fails, return 503 Service Unavailable."""
        mock_ask.return_value = {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "retrieval_error",
            "message": "ChromaDB connection broken",
        }

        response = client.post("/chat", json={"question": "What are the fees?"})
        assert response.status_code == 503
        data = response.json()
        assert "AI service dependency error" in data["detail"]

    @patch("api.main.ask_chatbot")
    def test_chat_missing_api_key_returns_503(self, mock_ask, client):
        """When Gemini API key is not configured, return 503 Service Unavailable."""
        mock_ask.return_value = {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "missing_api_key",
            "message": "GEMINI_API_KEY is not configured",
        }

        response = client.post("/chat", json={"question": "What are the fees?"})
        assert response.status_code == 503
        data = response.json()
        assert "unavailable due to configuration" in data["detail"]


# ---------------------------------------------------------------------------
# College Recommendation Endpoint Tests
# ---------------------------------------------------------------------------

class TestRecommendationEndpoint:
    @patch("api.main.recommend_colleges")
    def test_successful_recommendation_request(self, mock_rec, client):
        """POST /recommend-colleges returns structured recommendations."""
        mock_rec.return_value = {
            "student_rank": 2500,
            "category": "GEN",
            "preferred_course": "Civil Engineering",
            "preferred_location": "Jaipur",
            "disclaimer": "Indicative estimates only.",
            "total_recommendations": 1,
            "recommendations": [
                {
                    "college_id": "GPC_01",
                    "college_name": "Government Polytechnic College Jaipur",
                    "location": "Jaipur",
                    "course_name": "Civil Engineering",
                    "category": "GEN",
                    "historical_opening_rank": 500,
                    "historical_closing_rank": 3000,
                    "admission_year": 2024,
                    "source": "Official Cutoff 2024",
                    "source_year": 2024,
                    "category_status": "Likely",
                    "rationale": "Rank is comfortably within cutoff.",
                }
            ],
            "categorized": {
                "likely": [
                    {
                        "college_id": "GPC_01",
                        "college_name": "Government Polytechnic College Jaipur",
                        "location": "Jaipur",
                        "course_name": "Civil Engineering",
                        "category": "GEN",
                        "historical_opening_rank": 500,
                        "historical_closing_rank": 3000,
                        "admission_year": 2024,
                        "source": "Official Cutoff 2024",
                        "source_year": 2024,
                        "category_status": "Likely",
                        "rationale": "Rank is comfortably within cutoff.",
                    }
                ],
                "moderate": [],
                "ambitious": [],
            },
        }

        response = client.post(
            "/recommend-colleges",
            json={
                "rank": 2500,
                "category": "GEN",
                "preferred_course": "Civil Engineering",
                "preferred_location": "Jaipur",
                "top_k": 5,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["student_rank"] == 2500
        assert data["category"] == "GEN"
        assert len(data["recommendations"]) == 1
        assert data["recommendations"][0]["category_status"] == "Likely"

    def test_invalid_rank_returns_422(self, client):
        """Non-positive ranks (0, negative) return 422 Unprocessable Entity."""
        res_zero = client.post("/recommend-colleges", json={"rank": 0, "category": "GEN"})
        assert res_zero.status_code == 422

        res_neg = client.post("/recommend-colleges", json={"rank": -10, "category": "GEN"})
        assert res_neg.status_code == 422

    @patch("api.main.recommend_colleges")
    def test_invalid_category_returns_400(self, mock_rec, client):
        """When recommender raises ValueError for bad category, API returns 400 Bad Request."""
        mock_rec.side_effect = ValueError("Invalid category 'UNKNOWN'")

        response = client.post(
            "/recommend-colleges",
            json={"rank": 1000, "category": "UNKNOWN"},
        )
        assert response.status_code == 400
        assert "Invalid category" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Cutoff Predictor Endpoint Tests
# ---------------------------------------------------------------------------

class TestPredictCutoffEndpoint:
    @patch("api.main.predict_cutoff")
    def test_successful_cutoff_prediction(self, mock_pred, client):
        """POST /predict-cutoff returns historical analysis and projected cutoff rank."""
        mock_pred.return_value = {
            "college_id": "GPC_JAIPUR",
            "college_name": "Government Polytechnic College Jaipur",
            "course_name": "Civil Engineering",
            "category": "GEN",
            "estimated_closing_rank": 3100,
            "confidence": "High",
            "trend": "increasing",
            "target_year": 2025,
            "historical_records": [
                {
                    "admission_year": 2023,
                    "opening_rank": 800,
                    "closing_rank": 2800,
                    "source": "Report 2023",
                    "source_year": 2023,
                },
                {
                    "admission_year": 2024,
                    "opening_rank": 900,
                    "closing_rank": 3000,
                    "source": "Report 2024",
                    "source_year": 2024,
                },
            ],
            "explanation": "Calculated via multi-year linear regression.",
            "methodology": "Multi-year linear trend projection.",
            "disclaimer": "Not an official cutoff.",
        }

        response = client.post(
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
        assert data["estimated_closing_rank"] == 3100
        assert data["confidence"] == "High"
        assert len(data["historical_records"]) == 2

    @patch("api.main.predict_cutoff")
    def test_missing_cutoff_data_returns_400(self, mock_pred, client):
        """When requested college/course has no data, return 400 Bad Request."""
        mock_pred.side_effect = ValueError("No historical cutoff records found for college 'XYZ'")

        response = client.post(
            "/predict-cutoff",
            json={
                "college_id": "XYZ",
                "course_name": "Civil Engineering",
                "category": "GEN",
            },
        )
        assert response.status_code == 400
        assert "No historical cutoff records found" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Security & Error Handling Tests
# ---------------------------------------------------------------------------

class TestSecurityAndErrorHandling:
    def test_malformed_json_payload_returns_422(self, client):
        """Malformed or incomplete JSON payloads return 422 Unprocessable Entity."""
        response = client.post(
            "/chat",
            content="not a json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422

    @patch("api.main.ask_chatbot")
    def test_internal_service_error_returns_500_without_leaking_secrets(self, mock_ask, client):
        """Unhandled exceptions return 500 without leaking stack traces or API keys."""
        mock_ask.side_effect = RuntimeError("Fatal DB Crash with secret_key=AIzaSySecretKey123")

        response = client.post("/chat", json={"question": "Valid Question"})
        assert response.status_code == 500
        body_text = response.text
        # Secrets, internal error objects, and tracebacks must NEVER be leaked in responses
        assert "AIzaSySecretKey123" not in body_text
        assert "RuntimeError" not in body_text
        assert response.json()["error"] == "Internal Server Error"
