"""
Gemini-powered chatbot generator for Rajasthan DTE Student Assistance.
Uses the official google-genai SDK.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict

# Ensure ai-service directory is on sys.path for relative and package imports
_CURRENT_FILE = Path(__file__).resolve()
_CHATBOT_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _CHATBOT_DIR.parent
_PROJECT_ROOT = _AI_SERVICE_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Support both package imports and standalone script execution
try:
    from chatbot.prompt import SYSTEM_INSTRUCTION
except ImportError:
    from prompt import SYSTEM_INSTRUCTION

# Load environment variables relative to project file location, not cwd
_CURRENT_FILE = Path(__file__).resolve()
_CHATBOT_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _CHATBOT_DIR.parent
_PROJECT_ROOT = _AI_SERVICE_DIR.parent

_AI_ENV_PATH = _AI_SERVICE_DIR / ".env"
_ROOT_ENV_PATH = _PROJECT_ROOT / ".env"

if _AI_ENV_PATH.exists():
    load_dotenv(dotenv_path=_AI_ENV_PATH, override=True)
elif _ROOT_ENV_PATH.exists():
    load_dotenv(dotenv_path=_ROOT_ENV_PATH, override=True)
else:
    load_dotenv(override=True)

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def get_gemini_client(api_key: str | None = None) -> genai.Client:
    """
    Initializes and returns a Google GenAI client instance.
    Configures http_options with api_version='v1beta' to support system instructions.
    Raises ValueError if the API key is missing or blank.
    """
    if api_key is not None:
        key = api_key.strip()
    else:
        key = os.getenv("GEMINI_API_KEY", "").strip()

    if not key:
        raise ValueError(
            "GEMINI_API_KEY is not configured. Please add your Gemini API key to "
            "ai-service/.env or set the GEMINI_API_KEY environment variable."
        )
    return genai.Client(
        api_key=key,
        http_options=types.HttpOptions(api_version="v1beta"),
    )


def generate_response(
    question: str,
    system_instruction: str = SYSTEM_INSTRUCTION,
    model: str | None = None,
    api_key: str | None = None,
) -> Dict[str, Any]:
    """
    Sends a student question to Gemini and returns structured response data.

    Handles:
    - Empty or whitespace-only questions
    - Missing or unconfigured API keys
    - API errors (rate limits, network issues, invalid keys)
    """
    cleaned_question = question.strip() if question else ""
    if not cleaned_question:
        return {
            "status": "error",
            "error_type": "empty_question",
            "message": "Question cannot be empty. Please provide a valid question.",
            "answer": None,
        }

    try:
        client = get_gemini_client(api_key=api_key)
    except ValueError as err:
        return {
            "status": "error",
            "error_type": "missing_api_key",
            "message": str(err),
            "answer": None,
        }

    selected_model = model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3,
        )
        response = client.models.generate_content(
            model=selected_model,
            contents=cleaned_question,
            config=config,
        )
        return {
            "status": "success",
            "model": selected_model,
            "answer": response.text,
            "error_type": None,
            "message": None,
        }
    except APIError as err:
        return {
            "status": "error",
            "error_type": "api_error",
            "message": f"Gemini API Error: {err.message or str(err)}",
            "answer": None,
        }
    except Exception as err:
        return {
            "status": "error",
            "error_type": "unexpected_error",
            "message": f"Unexpected error while contacting Gemini API: {str(err)}",
            "answer": None,
        }


def ask_chatbot(question: str) -> str:
    """
    Convenience function that accepts a student question and returns the answer string directly.
    """
    result = generate_response(question)
    if result["status"] == "success":
        return result["answer"] or "No response generated."
    return f"[{result['error_type']}] {result['message']}"

