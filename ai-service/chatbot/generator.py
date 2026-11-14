"""
Gemini-powered RAG chatbot generator for Rajasthan DTE Student Assistance.
Combines semantic retrieval over official documents with Gemini generation.
Uses the official google-genai SDK.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

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
    from chatbot.prompt import RAG_SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION
except ImportError:
    from prompt import RAG_SYSTEM_INSTRUCTION, SYSTEM_INSTRUCTION

try:
    from retrieval.retriever import retrieve_relevant_chunks
except ImportError:
    from retrieval import retrieve_relevant_chunks

# Load environment variables relative to project file location
_AI_ENV_PATH = _AI_SERVICE_DIR / ".env"
_ROOT_ENV_PATH = _PROJECT_ROOT / ".env"

if _AI_ENV_PATH.exists():
    load_dotenv(dotenv_path=_AI_ENV_PATH, override=True)
elif _ROOT_ENV_PATH.exists():
    load_dotenv(dotenv_path=_ROOT_ENV_PATH, override=True)
else:
    load_dotenv(override=True)

logger = logging.getLogger(__name__)

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


def format_retrieved_context(chunks: List[Dict[str, Any]]) -> str:
    """
    Format retrieved document chunks as an untrusted reference context block.
    Encapsulates each chunk with source document name and page number.
    """
    if not chunks:
        return "No relevant official documents found."

    context_blocks: List[str] = []
    for idx, chunk in enumerate(chunks, 1):
        doc_name = str(chunk.get("document_name", "Unknown Document"))
        page_num = chunk.get("page_number", 1)
        text = str(chunk.get("text", "")).strip()
        context_blocks.append(
            f"<document index=\"{idx}\" name=\"{doc_name}\" page=\"{page_num}\">\n{text}\n</document>"
        )
    return "\n\n".join(context_blocks)


def extract_unique_sources(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extracts unique source references preserving document_name, page_number, and source_path.
    Deduplicates repeated page references.
    """
    unique_sources: List[Dict[str, Any]] = []
    seen: set = set()
    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        doc_name = str(chunk.get("document_name", "Unknown Document"))
        page_num = int(chunk.get("page_number", 1))
        src_path = str(chunk.get("source_path", ""))
        key = (doc_name, page_num, src_path)
        if key not in seen:
            seen.add(key)
            unique_sources.append(
                {
                    "document_name": doc_name,
                    "page_number": page_num,
                    "source_path": src_path,
                }
            )
    return unique_sources


def ask_chatbot(
    question: str,
    top_k: int = 5,
    client: Optional[genai.Client] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    retriever_func: Optional[Callable] = None,
    collection: Optional[Any] = None,
    system_instruction: str = RAG_SYSTEM_INSTRUCTION,
) -> Dict[str, Any]:
    """
    Main RAG chatbot interface for Shiksha Setu.

    Workflow:
    1. Validates the student question and top_k parameter.
    2. Retrieves top_k relevant chunks from ChromaDB knowledge base.
    3. Handles empty retrieval or retrieval errors gracefully without ungrounded fallbacks.
    4. Formats retrieved chunks as untrusted reference context.
    5. Calls Gemini to generate a response grounded strictly in the context.
    6. Returns answer, deduplicated sources, and execution status.

    Args:
        question: Natural language question from student.
        top_k: Number of relevant chunks to retrieve (positive integer, default: 5).
        client: Optional pre-configured genai.Client instance (useful for testing/mocking).
        model: Optional Gemini model override.
        api_key: Optional API key override.
        retriever_func: Optional retriever function override (defaults to retrieve_relevant_chunks).
        collection: Optional ChromaDB Collection instance to query.
        system_instruction: Optional system instruction prompt override.

    Returns:
        Structured response dictionary:
        {
            "answer": str | None,
            "sources": [
                {
                    "document_name": str,
                    "page_number": int,
                    "source_path": str,
                }
            ],
            "success": bool,
            "status": str,
            "error_type": str | None,
            "message": str | None,
        }
    """
    cleaned_question = question.strip() if (question and isinstance(question, str)) else ""
    if not cleaned_question:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "empty_question",
            "message": "Question cannot be empty. Please provide a valid question.",
        }

    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "invalid_top_k",
            "message": "top_k must be a positive integer.",
        }

    # Step 1: Semantic Retrieval
    retriever = retriever_func or retrieve_relevant_chunks
    try:
        if collection is not None:
            retrieved_chunks = retriever(cleaned_question, top_k=top_k, collection=collection)
        else:
            retrieved_chunks = retriever(cleaned_question, top_k=top_k)
    except ValueError as val_err:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "retrieval_validation_error",
            "message": str(val_err),
        }
    except Exception as ret_err:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "retrieval_error",
            "message": f"Failed to retrieve reference documents: {str(ret_err)}",
        }

    if not isinstance(retrieved_chunks, list):
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "malformed_context",
            "message": "Retrieved chunks must be a list of dictionaries.",
        }

    # Step 2: Handle empty retrieval results gracefully
    if not retrieved_chunks:
        return {
            "answer": (
                "The requested information could not be verified from the available official documents. "
                "Please refer to the official Rajasthan DTE portal (https://dte.rajasthan.gov.in) or "
                "contact the respective institution for authoritative confirmation."
            ),
            "sources": [],
            "success": True,
            "status": "success",
            "error_type": None,
            "message": "No relevant documents found.",
        }

    # Step 3: Extract deduplicated sources
    sources = extract_unique_sources(retrieved_chunks)

    # Step 4: Obtain Gemini client
    try:
        gemini_client = client or get_gemini_client(api_key=api_key)
    except ValueError as key_err:
        return {
            "answer": None,
            "sources": sources,
            "success": False,
            "status": "error",
            "error_type": "missing_api_key",
            "message": str(key_err),
        }

    # Step 5: Construct grounded prompt with untrusted data boundary
    formatted_context = format_retrieved_context(retrieved_chunks)
    prompt_contents = f"""<official_documents>
{formatted_context}
</official_documents>

Student Question: {cleaned_question}

Please provide an accurate, helpful response strictly based on the official documents provided above."""

    selected_model = model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

    # Step 6: Generate grounded response
    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2,
        )
        response = gemini_client.models.generate_content(
            model=selected_model,
            contents=prompt_contents,
            config=config,
        )
        return {
            "answer": response.text,
            "sources": sources,
            "success": True,
            "status": "success",
            "model": selected_model,
            "error_type": None,
            "message": None,
        }
    except APIError as api_err:
        return {
            "answer": None,
            "sources": sources,
            "success": False,
            "status": "error",
            "error_type": "api_error",
            "message": f"Gemini API Error: {api_err.message or str(api_err)}",
        }
    except Exception as gen_err:
        return {
            "answer": None,
            "sources": sources,
            "success": False,
            "status": "error",
            "error_type": "unexpected_error",
            "message": f"Unexpected error while contacting Gemini API: {str(gen_err)}",
        }


def generate_response(
    question: str,
    system_instruction: str = SYSTEM_INSTRUCTION,
    model: str | None = None,
    api_key: str | None = None,
    top_k: int = 5,
    client: Optional[genai.Client] = None,
    retriever_func: Optional[Callable] = None,
    collection: Optional[Any] = None,
    use_rag: bool = True,
) -> Dict[str, Any]:
    """
    Sends a student question to Gemini and returns structured response data.
    Provides backward compatibility while defaulting to RAG retrieval workflow.

    Args:
        question: Student question.
        system_instruction: System instructions prompt.
        model: Optional model override.
        api_key: Optional API key override.
        top_k: Number of retrieved chunks if use_rag is True.
        client: Optional pre-configured genai.Client instance.
        retriever_func: Optional custom retriever.
        collection: Optional ChromaDB collection.
        use_rag: If True, uses RAG retrieval. If False, queries Gemini directly.
    """
    cleaned_question = question.strip() if (question and isinstance(question, str)) else ""
    if not cleaned_question:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "empty_question",
            "message": "Question cannot be empty. Please provide a valid question.",
        }

    if use_rag:
        return ask_chatbot(
            question=cleaned_question,
            top_k=top_k,
            client=client,
            model=model,
            api_key=api_key,
            retriever_func=retriever_func,
            collection=collection,
            system_instruction=system_instruction,
        )

    # Pure direct generation fallback (when use_rag=False)
    try:
        gemini_client = client or get_gemini_client(api_key=api_key)
    except ValueError as err:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "missing_api_key",
            "message": str(err),
        }

    selected_model = model or os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3,
        )
        response = gemini_client.models.generate_content(
            model=selected_model,
            contents=cleaned_question,
            config=config,
        )
        return {
            "answer": response.text,
            "sources": [],
            "success": True,
            "status": "success",
            "model": selected_model,
            "error_type": None,
            "message": None,
        }
    except APIError as err:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "api_error",
            "message": f"Gemini API Error: {err.message or str(err)}",
        }
    except Exception as err:
        return {
            "answer": None,
            "sources": [],
            "success": False,
            "status": "error",
            "error_type": "unexpected_error",
            "message": f"Unexpected error while contacting Gemini API: {str(err)}",
        }
