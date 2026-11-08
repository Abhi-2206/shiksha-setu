"""
Text embedding generation module for Shiksha Setu AI Student Assistance Chatbot.
Generates vector embeddings for document chunks using the official Google GenAI SDK.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

# Ensure ai-service directory is on sys.path
_CURRENT_FILE = Path(__file__).resolve()
_EMBEDDINGS_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _EMBEDDINGS_DIR.parent
_PROJECT_ROOT = _AI_SERVICE_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Load environment variables relative to project location
_AI_ENV_PATH = _AI_SERVICE_DIR / ".env"
_ROOT_ENV_PATH = _PROJECT_ROOT / ".env"

if _AI_ENV_PATH.exists():
    load_dotenv(dotenv_path=_AI_ENV_PATH, override=True)
elif _ROOT_ENV_PATH.exists():
    load_dotenv(dotenv_path=_ROOT_ENV_PATH, override=True)
else:
    load_dotenv(override=True)

logger = logging.getLogger(__name__)

DEFAULT_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
MAX_BATCH_SIZE = 100

REQUIRED_CHUNK_KEYS: Set[str] = {
    "document_name",
    "page_number",
    "chunk_id",
    "chunk_index",
    "text",
    "source_path",
}


class EmbeddingGenerationError(Exception):
    """Exception raised when vector embedding generation fails."""
    pass


def get_gemini_client(api_key: Optional[str] = None) -> genai.Client:
    """
    Initializes and returns a Google GenAI Client instance for embeddings.
    Raises ValueError if API key is missing or blank.
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

    return genai.Client(api_key=key)


def generate_embeddings(
    chunks: List[Dict[str, Any]],
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    client: Optional[genai.Client] = None,
) -> List[Dict[str, Any]]:
    """
    Generates numerical vector embeddings for a list of document chunks.

    Args:
        chunks: List of chunk dictionaries returned by chunk_documents().
                Each dict must contain: document_name, page_number, chunk_id,
                chunk_index, text, source_path.
        model: Optional Gemini embedding model override. Defaults to GEMINI_EMBEDDING_MODEL
               from .env, or 'gemini-embedding-001'.
        api_key: Optional API key override. Defaults to GEMINI_API_KEY from .env.
        client: Optional pre-configured genai.Client instance (useful for testing and dependency injection).

    Returns:
        List of chunk dictionaries with the 'embedding' field populated:
        [
            {
                "document_name": str,
                "page_number": int,
                "chunk_id": str,
                "chunk_index": int,
                "text": str,
                "source_path": str,
                "embedding": List[float],
            },
            ...
        ]

    Raises:
        TypeError: If chunks is not a list or elements are not dictionaries.
        ValueError: If required metadata keys are missing, chunk text is empty,
                    or API key is missing.
        EmbeddingGenerationError: If the Gemini API call fails or returns inconsistent vectors.
    """
    if not isinstance(chunks, list):
        raise TypeError(f"chunks must be a list of dictionaries, got: {type(chunks).__name__}")

    if not chunks:
        return []

    # Validate all chunks prior to issuing any API calls
    extracted_texts: List[str] = []
    for idx, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            raise TypeError(f"Chunk at index {idx} is not a dictionary: {type(chunk).__name__}")

        missing_keys = REQUIRED_CHUNK_KEYS - chunk.keys()
        if missing_keys:
            raise ValueError(
                f"Chunk at index {idx} is missing required metadata key(s): {sorted(missing_keys)}"
            )

        text = chunk["text"]
        if not isinstance(text, str) or not text.strip():
            chunk_id = chunk.get("chunk_id", f"index_{idx}")
            raise ValueError(
                f"Chunk at index {idx} (id='{chunk_id}') has missing or empty text."
            )

        extracted_texts.append(text)

    # Initialize client
    gemini_client = client or get_gemini_client(api_key=api_key)
    selected_model = model or os.getenv("GEMINI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)

    all_vectors: List[List[float]] = []

    # Process in batches to adhere to Gemini API batch limits
    for batch_start in range(0, len(extracted_texts), MAX_BATCH_SIZE):
        batch_texts = extracted_texts[batch_start : batch_start + MAX_BATCH_SIZE]

        try:
            response = gemini_client.models.embed_content(
                model=selected_model,
                contents=batch_texts,
            )
        except APIError as api_err:
            raise EmbeddingGenerationError(
                f"Gemini API error during embedding generation: {api_err.message or str(api_err)}"
            ) from api_err
        except Exception as err:
            raise EmbeddingGenerationError(
                f"Failed to generate embeddings via Gemini API: {str(err)}"
            ) from err

        if not response or not hasattr(response, "embeddings") or not response.embeddings:
            raise EmbeddingGenerationError(
                f"Gemini API returned an empty or invalid response for batch starting at {batch_start}."
            )

        raw_embeddings = response.embeddings
        if len(raw_embeddings) != len(batch_texts):
            raise EmbeddingGenerationError(
                f"Batch embedding count mismatch: expected {len(batch_texts)} vectors, "
                f"received {len(raw_embeddings)}."
            )

        for vec_idx, item in enumerate(raw_embeddings):
            values = getattr(item, "values", None)
            if values is None and isinstance(item, (list, tuple)):
                values = item

            if not values or not isinstance(values, (list, tuple)):
                raise EmbeddingGenerationError(
                    f"Invalid embedding vector returned for text at batch index {vec_idx}."
                )

            # Ensure every element is a valid numerical float
            try:
                float_vector = [float(v) for v in values]
            except (ValueError, TypeError) as num_err:
                raise EmbeddingGenerationError(
                    f"Embedding vector contains non-numerical values: {num_err}"
                ) from num_err

            all_vectors.append(float_vector)

    # Validate vector dimension consistency
    if all_vectors:
        expected_dim = len(all_vectors[0])
        for v_idx, vec in enumerate(all_vectors):
            if len(vec) != expected_dim:
                raise EmbeddingGenerationError(
                    f"Vector dimension mismatch at index {v_idx}: expected {expected_dim}, got {len(vec)}."
                )

    # Attach vectors to corresponding chunk copies preserving all metadata
    enriched_chunks: List[Dict[str, Any]] = []
    for chunk, vector in zip(chunks, all_vectors):
        chunk_copy = dict(chunk)
        chunk_copy["embedding"] = vector
        enriched_chunks.append(chunk_copy)

    return enriched_chunks

