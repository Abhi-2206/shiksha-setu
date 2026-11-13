"""Embeddings generation package for Shiksha Setu."""
try:
    from embeddings.embedding_generator import (
        EmbeddingGenerationError,
        generate_embeddings,
    )
except ImportError:
    from .embedding_generator import (
        EmbeddingGenerationError,
        generate_embeddings,
    )

__all__ = ["generate_embeddings", "EmbeddingGenerationError"]

