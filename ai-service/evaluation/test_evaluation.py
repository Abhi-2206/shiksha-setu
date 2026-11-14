"""
Unit tests for the RAG evaluation framework.
Verifies benchmark dataset loading, metrics computation, and report generation.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure ai-service directory is on sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_AI_SERVICE_DIR = _CURRENT_DIR.parent
if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

import pytest
from evaluation.evaluator import evaluate_rag_pipeline, load_benchmark_dataset


class TestRAGEvaluationSuite:
    def test_benchmark_dataset_loads_properly(self):
        """Verifies benchmark dataset structure and required query attributes."""
        data = load_benchmark_dataset()
        assert "metadata" in data
        assert "documents" in data
        assert "queries" in data
        assert len(data["documents"]) >= 2
        assert len(data["queries"]) >= 5

        for q in data["queries"]:
            assert "id" in q
            assert "question" in q
            assert "is_answerable" in q

    def test_evaluate_rag_pipeline_metrics(self):
        """Runs the offline evaluation pipeline and verifies all 4 metrics are calculated."""
        report = evaluate_rag_pipeline()
        assert report["total_queries"] >= 8
        metrics = report["metrics"]

        assert "retrieval_precision_at_k" in metrics
        assert "source_citation_coverage_pct" in metrics
        assert "response_grounding_rate_pct" in metrics
        assert "disclaimer_accuracy_pct" in metrics

        # All scores should be high in the synthetic benchmark
        assert metrics["retrieval_precision_at_k"] >= 90.0
        assert metrics["source_citation_coverage_pct"] >= 90.0
        assert metrics["response_grounding_rate_pct"] >= 90.0
        assert metrics["disclaimer_accuracy_pct"] >= 90.0

