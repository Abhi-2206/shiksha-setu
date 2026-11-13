"""Vector store package for Shiksha Setu."""
try:
    from vector_store.chroma_store import (
        ChromaStoreError,
        delete_collection,
        get_chroma_client,
        get_collection_count,
        get_or_create_collection,
        store_embeddings,
    )
except ImportError:
    from .chroma_store import (
        ChromaStoreError,
        delete_collection,
        get_chroma_client,
        get_collection_count,
        get_or_create_collection,
        store_embeddings,
    )

__all__ = [
    "get_chroma_client",
    "get_or_create_collection",
    "store_embeddings",
    "get_collection_count",
    "delete_collection",
    "ChromaStoreError",
]

