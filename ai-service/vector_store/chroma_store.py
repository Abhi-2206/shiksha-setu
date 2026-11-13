"""
ChromaDB vector storage module for Shiksha Setu AI Student Assistance Chatbot.
Provides persistent storage for embedding vectors generated from PDF document chunks.
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

# Ensure ai-service directory is on sys.path
_CURRENT_FILE = Path(__file__).resolve()
_VECTOR_STORE_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _VECTOR_STORE_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

logger = logging.getLogger(__name__)

COLLECTION_NAME = "shiksha_setu_knowledge"
DEFAULT_CHROMA_PATH = _AI_SERVICE_DIR / "data" / "chroma_db"

REQUIRED_CHUNK_KEYS: Set[str] = {
    "chunk_id",
    "text",
    "embedding",
    "document_name",
    "page_number",
    "chunk_index",
    "source_path",
}


class ChromaStoreError(Exception):
    """Raised when a ChromaDB storage operation fails."""
    pass


def get_chroma_client(
    persist_path: Optional[str | Path] = None,
    ephemeral: bool = False,
) -> ClientAPI:
    """
    Initialize and return a ChromaDB client.

    Args:
        persist_path: Directory path for persistent storage.
                      Defaults to ai-service/data/chroma_db/.
        ephemeral: If True, use an in-memory EphemeralClient (for testing only).

    Returns:
        A configured ChromaDB ClientAPI instance.

    Raises:
        ChromaStoreError: If the client cannot be initialized.
    """
    if ephemeral:
        try:
            return chromadb.EphemeralClient()
        except Exception as err:
            raise ChromaStoreError(f"Failed to create ephemeral ChromaDB client: {err}") from err

    chroma_path = Path(persist_path) if persist_path else DEFAULT_CHROMA_PATH
    chroma_path.mkdir(parents=True, exist_ok=True)

    try:
        client = chromadb.PersistentClient(path=str(chroma_path))
        logger.info("ChromaDB PersistentClient initialized at: %s", chroma_path)
        return client
    except Exception as err:
        raise ChromaStoreError(
            f"Failed to initialize persistent ChromaDB client at '{chroma_path}': {err}"
        ) from err


def get_or_create_collection(
    client: ClientAPI,
    collection_name: str = COLLECTION_NAME,
) -> Collection:
    """
    Return the existing ChromaDB collection, or create it if absent.

    Args:
        client: An initialized ChromaDB ClientAPI instance.
        collection_name: Name of the collection. Defaults to 'shiksha_setu_knowledge'.

    Returns:
        The ChromaDB Collection object.

    Raises:
        ChromaStoreError: If the collection cannot be created or retrieved.
    """
    try:
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"project": "ShikshaSetu", "source": "DTE-Rajasthan"},
        )
        logger.info(
            "Collection '%s' ready. Current count: %d", collection_name, collection.count()
        )
        return collection
    except Exception as err:
        raise ChromaStoreError(
            f"Failed to get or create ChromaDB collection '{collection_name}': {err}"
        ) from err


def _validate_chunk(chunk: Dict[str, Any], idx: int) -> None:
    """
    Validate a single embedding chunk dictionary.
    Raises ValueError with a clear message on first detected problem.
    """
    if not isinstance(chunk, dict):
        raise TypeError(f"Chunk at index {idx} must be a dictionary, got {type(chunk).__name__}.")

    missing_keys = REQUIRED_CHUNK_KEYS - chunk.keys()
    if missing_keys:
        raise ValueError(
            f"Chunk at index {idx} is missing required key(s): {sorted(missing_keys)}"
        )

    chunk_id = chunk["chunk_id"]
    if not isinstance(chunk_id, str) or not chunk_id.strip():
        raise ValueError(f"Chunk at index {idx}: 'chunk_id' must be a non-empty string.")

    text = chunk["text"]
    if not isinstance(text, str) or not text.strip():
        raise ValueError(
            f"Chunk at index {idx} (id='{chunk_id}'): 'text' must be a non-empty string."
        )

    embedding = chunk["embedding"]
    if embedding is None or not isinstance(embedding, (list, tuple)) or len(embedding) == 0:
        raise ValueError(
            f"Chunk at index {idx} (id='{chunk_id}'): 'embedding' must be a non-empty list."
        )
    for v_idx, val in enumerate(embedding):
        try:
            float(val)
        except (TypeError, ValueError) as num_err:
            raise ValueError(
                f"Chunk at index {idx} (id='{chunk_id}'): embedding element at position {v_idx} "
                f"is not a valid number: {val!r}"
            ) from num_err


def store_embeddings(
    chunks: List[Dict[str, Any]],
    collection: Collection,
) -> int:
    """
    Store embedding vectors, document text, and metadata into ChromaDB.

    Uses upsert semantics: existing records with the same chunk_id are updated
    rather than causing duplicate ID errors.

    Args:
        chunks: List of embedding chunk dictionaries from generate_embeddings().
                Each must contain: chunk_id, text, embedding, document_name,
                page_number, chunk_index, source_path.
        collection: An initialized ChromaDB Collection instance.

    Returns:
        Number of successfully stored (upserted) chunks.

    Raises:
        TypeError: If chunks is not a list or contains non-dict items.
        ValueError: If required fields are missing, text/embedding is invalid,
                    or embedding dimensions are inconsistent across chunks.
        ChromaStoreError: If the ChromaDB upsert operation fails.
    """
    if not isinstance(chunks, list):
        raise TypeError(f"chunks must be a list, got {type(chunks).__name__}")

    if not chunks:
        logger.debug("store_embeddings called with empty chunk list; nothing stored.")
        return 0

    # Validate all chunks up-front before writing anything
    for idx, chunk in enumerate(chunks):
        _validate_chunk(chunk, idx)

    # Validate embedding dimension consistency across all chunks
    expected_dim = len(chunks[0]["embedding"])
    for idx, chunk in enumerate(chunks):
        dim = len(chunk["embedding"])
        if dim != expected_dim:
            raise ValueError(
                f"Inconsistent embedding dimensions: chunk 0 has {expected_dim} dimensions, "
                f"but chunk at index {idx} (id='{chunk['chunk_id']}') has {dim} dimensions."
            )

    ids: List[str] = []
    documents: List[str] = []
    embeddings: List[List[float]] = []
    metadatas: List[Dict[str, Any]] = []

    for chunk in chunks:
        ids.append(chunk["chunk_id"])
        documents.append(chunk["text"].strip())
        embeddings.append([float(v) for v in chunk["embedding"]])

        # ChromaDB metadata must be: str | int | float | bool — no nested objects
        metadatas.append(
            {
                "document_name": str(chunk["document_name"]),
                "page_number": int(chunk["page_number"]),
                "chunk_index": int(chunk["chunk_index"]),
                "source_path": str(chunk["source_path"]),
            }
        )

    try:
        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info("Upserted %d chunk(s) into collection '%s'.", len(ids), collection.name)
        return len(ids)
    except Exception as err:
        raise ChromaStoreError(
            f"ChromaDB upsert failed for {len(ids)} chunk(s): {err}"
        ) from err


def get_collection_count(collection: Collection) -> int:
    """
    Return the total number of stored records in the collection.

    Args:
        collection: An initialized ChromaDB Collection instance.

    Returns:
        Integer count of records currently stored.

    Raises:
        ChromaStoreError: If the count operation fails.
    """
    try:
        return collection.count()
    except Exception as err:
        raise ChromaStoreError(f"Failed to retrieve collection count: {err}") from err


def delete_collection(
    client: ClientAPI,
    collection_name: str = COLLECTION_NAME,
) -> None:
    """
    Permanently delete a ChromaDB collection and all its stored records.

    WARNING: This operation is irreversible. Only call this explicitly when
    re-ingestion or cleanup is intended. Never call this during normal storage
    or initialization workflows.

    Args:
        client: An initialized ChromaDB ClientAPI instance.
        collection_name: Name of the collection to delete.

    Raises:
        ChromaStoreError: If the deletion fails.
    """
    try:
        client.delete_collection(collection_name)
        logger.warning("Collection '%s' has been permanently deleted.", collection_name)
    except Exception as err:
        raise ChromaStoreError(
            f"Failed to delete ChromaDB collection '{collection_name}': {err}"
        ) from err

