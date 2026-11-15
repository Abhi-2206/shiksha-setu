"""
Shared exception classes for the Shiksha Setu AI Service.

This module defines exceptions used across multiple packages (chatbot, embeddings,
retrieval) to ensure a single class identity for consistent exception handling.
"""
from __future__ import annotations


class MissingAPIKeyError(ValueError):
    """Raised when GEMINI_API_KEY is missing or empty."""
    pass


__all__ = ["MissingAPIKeyError"]
