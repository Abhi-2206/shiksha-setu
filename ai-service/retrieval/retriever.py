"""
Semantic retrieval module for Shiksha Setu AI Student Assistance Chatbot.
Performs vector similarity search against the ChromaDB knowledge collection using
Gemini embeddings to find the most relevant document chunks for a student query.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure ai-service directory is on sys.path
_CURRENT_FILE = Path(__file__).resolve()
_RETRIEVAL_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _RETRIEVAL_DIR.parent
_PROJECT_ROOT = _AI_SERVICE_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError

from chromadb.api.models.Collection import Collection
from embeddings.embedding_generator import (
    DEFAULT_EMBEDDING_MODEL,
    EmbeddingGenerationError,
    get_gemini_client,
)
from vector_store.chroma_store import (
    COLLECTION_NAME,
    ChromaStoreError,
    get_chroma_client,
    get_or_create_collection,
)

# Load environment variables
_AI_ENV_PATH = _AI_SERVICE_DIR / ".env"
_ROOT_ENV_PATH = _PROJECT_ROOT / ".env"

if _AI_ENV_PATH.exists():
    load_dotenv(dotenv_path=_AI_ENV_PATH, override=True)
elif _ROOT_ENV_PATH.exists():
    load_dotenv(dotenv_path=_ROOT_ENV_PATH, override=True)
else:
    load_dotenv(override=True)

logger = logging.getLogger(__name__)

# Cached default ChromaDB client and collection for reuse across requests
_CACHED_CLIENT = None
_CACHED_COLLECTION: Optional[Collection] = None


class RetrievalError(Exception):
    """Raised when a semantic retrieval operation fails."""
    pass


def get_default_collection() -> Collection:
    """
    Return the singleton ChromaDB collection instance for retrieval.
    Reuses the persistent client and collection to avoid duplicate connections.
    """
    global _CACHED_CLIENT, _CACHED_COLLECTION
    if _CACHED_COLLECTION is None:
        try:
            if _CACHED_CLIENT is None:
                _CACHED_CLIENT = get_chroma_client()
            _CACHED_COLLECTION = get_or_create_collection(_CACHED_CLIENT, collection_name=COLLECTION_NAME)
        except ChromaStoreError as err:
            raise RetrievalError(f"Failed to connect to ChromaDB collection: {err}") from err
        except Exception as err:
            raise RetrievalError(f"Unexpected error initializing vector store: {err}") from err
    return _CACHED_COLLECTION


def generate_query_embedding(
    query: str,
    gemini_client: Optional[genai.Client] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> List[float]:
    """
    Generate an embedding vector for a student query using the Gemini embedding model.

    Args:
        query: Student natural language query string.
        gemini_client: Optional genai.Client instance (useful for testing/mocking).
        model: Optional embedding model override. Defaults to GEMINI_EMBEDDING_MODEL or gemini-embedding-001.
        api_key: Optional API key override.

    Returns:
        List of floats representing the numerical embedding vector.

    Raises:
        ValueError: If the query is empty or API key is not configured.
        EmbeddingGenerationError: If the Gemini API call fails or returns invalid output.
    """
    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query must be a non-empty string.")

    client = gemini_client or get_gemini_client(api_key=api_key)
    selected_model = model or os.getenv("GEMINI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)

    try:
        response = client.models.embed_content(
            model=selected_model,
            contents=[query.strip()],
        )
    except APIError as api_err:
        raise EmbeddingGenerationError(
            f"Gemini API error during query embedding: {api_err.message or str(api_err)}"
        ) from api_err
    except Exception as err:
        raise EmbeddingGenerationError(
            f"Failed to generate query embedding via Gemini API: {str(err)}"
        ) from err

    if not response or not hasattr(response, "embeddings") or not response.embeddings:
        raise EmbeddingGenerationError("Gemini API returned an empty or invalid embedding response.")

    item = response.embeddings[0]
    values = getattr(item, "values", None)
    if values is None and isinstance(item, (list, tuple)):
        values = item

    if not values or not isinstance(values, (list, tuple)):
        raise EmbeddingGenerationError("Invalid embedding vector returned for query.")

    try:
        return [float(v) for v in values]
    except (ValueError, TypeError) as num_err:
        raise EmbeddingGenerationError(f"Embedding vector contains non-numerical values: {num_err}") from num_err


def retrieve_relevant_chunks(
    query: str,
    top_k: int = 5,
    collection: Optional[Collection] = None,
    gemini_client: Optional[genai.Client] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    query_embedding: Optional[List[float]] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieve the top_k most semantically relevant chunks for a student query.

    Args:
        query: Student natural language question.
        top_k: Number of relevant chunks to retrieve. Must be a positive integer. Defaults to 5.
        collection: Optional ChromaDB Collection instance (uses persistent singleton by default).
        gemini_client: Optional genai.Client instance for testing or mocking.
        model: Optional Gemini embedding model override.
        api_key: Optional API key override.
        query_embedding: Optional pre-computed query embedding vector (bypasses embedding API).

    Returns:
        List of structured result dictionaries sorted by similarity:
        [
            {
                "chunk_id": str,
                "text": str,
                "document_name": str,
                "page_number": int,
                "source_path": str,
                "distance": float,
            },
            ...
        ]

    Raises:
        ValueError: If query is empty or top_k is not a positive integer, or API key is missing.
        RetrievalError: If embedding generation or ChromaDB query fails.
    """
    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query must be a non-empty string.")

    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
        raise ValueError("top_k must be a positive integer.")

    # Obtain or resolve target ChromaDB collection
    target_collection = collection if collection is not None else get_default_collection()

    # If collection is empty, return early without calling the embedding API
    try:
        col_count = target_collection.count()
        if col_count == 0:
            logger.info("ChromaDB collection '%s' is empty; returning 0 results.", target_collection.name)
            return []
    except Exception as err:
        raise RetrievalError(f"Failed to inspect ChromaDB collection count: {err}") from err

    # Generate query embedding if not pre-provided
    if query_embedding is not None:
        vector = query_embedding
    else:
        try:
            vector = generate_query_embedding(
                query=query,
                gemini_client=gemini_client,
                model=model,
                api_key=api_key,
            )
        except ValueError:
            raise
        except EmbeddingGenerationError as err:
            raise RetrievalError(f"Query embedding generation failed: {err}") from err
        except Exception as err:
            raise RetrievalError(f"Unexpected error during query embedding generation: {err}") from err

    # Query ChromaDB collection with vector
    try:
        query_results = target_collection.query(
            query_embeddings=[vector],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as err:
        raise RetrievalError(f"ChromaDB similarity query failed: {err}") from err

    ids = query_results.get("ids", [[]])[0]
    documents = query_results.get("documents", [[]])[0]
    metadatas = query_results.get("metadatas", [[]])[0]
    distances = query_results.get("distances", [[]])[0]

    if not ids:
        return []

    formatted_results: List[Dict[str, Any]] = []
    for idx in range(len(ids)):
        meta = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
        dist = float(distances[idx]) if idx < len(distances) and distances[idx] is not None else 0.0

        formatted_results.append(
            {
                "chunk_id": ids[idx],
                "text": documents[idx] if idx < len(documents) else "",
                "document_name": meta.get("document_name", ""),
                "page_number": int(meta.get("page_number", 1)),
                "source_path": meta.get("source_path", ""),
                "distance": dist,
            }
        )

    return formatted_results
