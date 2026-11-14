"""Semantic retrieval package for Shiksha Setu."""
try:
    from retrieval.retriever import (
        RetrievalError,
        generate_query_embedding,
        retrieve_relevant_chunks,
    )
except ImportError:
    from .retriever import (
        RetrievalError,
        generate_query_embedding,
        retrieve_relevant_chunks,
    )

__all__ = [
    "retrieve_relevant_chunks",
    "generate_query_embedding",
    "RetrievalError",
]
