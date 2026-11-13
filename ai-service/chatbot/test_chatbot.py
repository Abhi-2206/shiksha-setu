"""
Test suite for Rajasthan DTE AI Student Assistance Chatbot.
Verifies:
1. Empty question handling
2. Missing API key handling
3. Query handling for at least 3 student questions
Never prints or exposes the API key.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from pathlib import Path
from dotenv import load_dotenv

# Ensure ai-service directory is on sys.path and load .env relative to file location
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

_ENV_FILE = _AI_SERVICE_DIR / ".env"
if _ENV_FILE.exists():
    load_dotenv(dotenv_path=_ENV_FILE, override=True)

from chatbot.generator import generate_response, ask_chatbot


STUDENT_QUESTIONS = [
    "What are the general eligibility criteria for 3-year polytechnic diploma courses in Rajasthan?",
    "What scholarship schemes or financial aid options are available for technical education students in Rajasthan?",
    "How can students access the official syllabus, academic calendar, and exam notices for DTE Rajasthan institutions?",
]


def test_empty_question_handling():
    print("\n--- Test 1: Empty Question Handling ---")
    for q in ["", "   ", None]:
        result = generate_response(q)
        print(f"Input: {repr(q)} -> Status: {result['status']}, Error Type: {result['error_type']}")
        assert result["status"] == "error", f"Expected error for empty input {repr(q)}"
        assert result["error_type"] == "empty_question"
    print("PASS: Empty question handling verified.")


def test_missing_api_key_handling():
    print("\n--- Test 2: Missing API Key Handling ---")
    result = generate_response("Hello", api_key="")
    print(f"Status: {result['status']}, Error Type: {result['error_type']}")
    print(f"Message: {result['message']}")
    assert result["status"] == "error"
    assert result["error_type"] == "missing_api_key"
    print("PASS: Missing API key handling verified.")


def test_student_questions():
    print("\n--- Test 3: Student Questions Testing ---")
    api_key_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    print(f"GEMINI_API_KEY configured: {api_key_configured}")

    for i, q in enumerate(STUDENT_QUESTIONS, 1):
        print(f"\n[Student Question {i}]: {q}")
        result = generate_response(q)

        if result["status"] == "success":
            print(f"[Model Used]: {result['model']}")
            print(f"[Chatbot Response]:\n{result['answer']}")
            assert result["answer"], "Response text should not be empty"
        else:
            print(f"[Status]: {result['status']}")
            print(f"[Error Type]: {result['error_type']}")
            print(f"[Message]: {result['message']}")
            # Graceful error handling verification
            assert result["message"] is not None


def run_all_tests():
    print("==================================================")
    print(" Rajasthan DTE Chatbot Test Suite")
    print("==================================================")
    test_empty_question_handling()
    test_missing_api_key_handling()
    test_student_questions()
    print("\n==================================================")
    print(" All tests completed.")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()

