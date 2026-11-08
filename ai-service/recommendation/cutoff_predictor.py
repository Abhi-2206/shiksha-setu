"""
Cutoff prediction module for Rajasthan DTE AI Student Assistance Chatbot.
Provides transparent, explainable historical trend estimation for college cutoffs
without claiming unverified machine learning precision.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure ai-service directory is on sys.path
_CURRENT_FILE = Path(__file__).resolve()
_RECOMMENDATION_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _RECOMMENDATION_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

try:
    from recommendation.college_recommender import (
        load_and_validate_cutoffs,
        normalize_category,
    )
except ImportError:
    from college_recommender import (
        load_and_validate_cutoffs,
        normalize_category,
    )

logger = logging.getLogger(__name__)

PREDICTOR_DISCLAIMER = (
    "DISCLAIMER: This projected cutoff is an indicative mathematical estimate calculated from "
    "historical admission records. It is NOT an official cutoff published by the Department of "
    "Technical Education (DTE), Government of Rajasthan. Actual cutoffs will vary each academic session."
)


def calculate_linear_trend(years: List[int], closing_ranks: List[int], target_year: int) -> tuple[int, str]:
    """
    Calculates a transparent linear slope and predicts the cutoff rank for the target year.
    Returns (projected_rank, trend_direction).
    """
    n = len(years)
    mean_y = sum(years) / n
    mean_c = sum(closing_ranks) / n

    numerator = sum((years[i] - mean_y) * (closing_ranks[i] - mean_c) for i in range(n))
    denominator = sum((years[i] - mean_y) ** 2 for i in range(n))

    if denominator == 0:
        slope = 0.0
    else:
        slope = numerator / denominator

    intercept = mean_c - slope * mean_y
    projected = round(slope * target_year + intercept)
    projected_rank = max(1, projected)

    if slope > 25.0:
        trend = "increasing"  # Cutoffs opening up / more relaxed
    elif slope < -25.0:
        trend = "decreasing"  # Cutoffs getting stricter / more competitive
    else:
        trend = "stable"

    return projected_rank, trend


def predict_cutoff(
    college_id: str,
    course_name: str,
    category: str,
    data_path: Optional[str | Path] = None,
    records: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Estimates the expected closing cutoff rank based on historical multi-year records.

    Methodology:
    - 0 years of data: Raises ValueError (no historical data available).
    - 1 year of data: Returns confidence="Low", estimated_closing_rank=None (insufficient historical depth for trend).
    - 2 years of data: Returns confidence="Moderate", calculates 2-year annualized rate of change.
    - 3+ years of data: Returns confidence="High", fits a transparent linear trend projection.

    Args:
        college_id: Identifier of the college (e.g. 'GPC_JAIPUR').
        course_name: Name of the course (e.g. 'Civil Engineering').
        category: Reservation category (e.g. 'GEN', 'OBC', 'SC', 'ST').
        data_path: Optional path to the CSV dataset.
        records: Optional in-memory list of validated records.

    Returns:
        Structured prediction dictionary with historical records, projected rank, and confidence rating.

    Raises:
        ValueError: If input parameters are invalid, or no matching records exist.
    """
    if not isinstance(college_id, str) or not college_id.strip():
        raise ValueError("college_id must be a non-empty string.")

    if not isinstance(course_name, str) or not course_name.strip():
        raise ValueError("course_name must be a non-empty string.")

    normalized_cat = normalize_category(category)

    # Load dataset
    dataset = load_and_validate_cutoffs(data_path=data_path, records=records)

    target_cid = college_id.strip().lower()
    target_course = course_name.strip().lower()

    # Filter matching historical records
    matches = [
        r
        for r in dataset
        if r["college_id"].lower() == target_cid
        and r["course_name"].lower() == target_course
        and r["category"] == normalized_cat
    ]

    if not matches:
        raise ValueError(
            f"No historical cutoff records found for college '{college_id}', "
            f"course '{course_name}', category '{normalized_cat}'."
        )

    # Sort chronologically
    sorted_matches = sorted(matches, key=lambda x: x["admission_year"])
    college_name = sorted_matches[-1]["college_name"]

    years = [r["admission_year"] for r in sorted_matches]
    closing_ranks = [r["closing_rank"] for r in sorted_matches]

    latest_year = years[-1]
    target_year = latest_year + 1

    formatted_history = [
        {
            "admission_year": r["admission_year"],
            "opening_rank": r["opening_rank"],
            "closing_rank": r["closing_rank"],
            "source": r["source"],
            "source_year": r["source_year"],
        }
        for r in sorted_matches
    ]

    count = len(sorted_matches)

    if count == 1:
        # Insufficient historical years for trend analysis
        return {
            "college_id": college_id.strip(),
            "college_name": college_name,
            "course_name": course_name.strip(),
            "category": normalized_cat,
            "estimated_closing_rank": None,
            "confidence": "Low",
            "trend": "insufficient_data",
            "target_year": target_year,
            "historical_records": formatted_history,
            "explanation": (
                f"Only 1 academic year ({years[0]}) of cutoff data is available. "
                "Multi-year trend analysis requires at least 2 distinct academic sessions."
            ),
            "methodology": "Single-point historical record (trend extrapolation unavailable).",
            "disclaimer": PREDICTOR_DISCLAIMER,
        }

    elif count == 2:
        # 2 years: Annualized rate of change
        y1, y2 = years[0], years[1]
        c1, c2 = closing_ranks[0], closing_ranks[1]
        year_diff = max(1, y2 - y1)
        annual_change = (c2 - c1) / year_diff

        # Moderated projection: c2 + 0.5 * annual_change
        projected = round(c2 + 0.5 * annual_change)
        projected_rank = max(1, projected)

        if annual_change > 20:
            trend = "increasing"
        elif annual_change < -20:
            trend = "decreasing"
        else:
            trend = "stable"

        return {
            "college_id": college_id.strip(),
            "college_name": college_name,
            "course_name": course_name.strip(),
            "category": normalized_cat,
            "estimated_closing_rank": projected_rank,
            "confidence": "Moderate",
            "trend": trend,
            "target_year": target_year,
            "historical_records": formatted_history,
            "explanation": (
                f"Calculated from 2-year change rate between {y1} ({c1}) and {y2} ({c2}). "
                f"Average annual change: {annual_change:+.1f} ranks."
            ),
            "methodology": "Two-point historical annualized trend calculation.",
            "disclaimer": PREDICTOR_DISCLAIMER,
        }

    else:
        # 3+ years: Multi-year linear trend regression
        projected_rank, trend = calculate_linear_trend(years, closing_ranks, target_year)

        return {
            "college_id": college_id.strip(),
            "college_name": college_name,
            "course_name": course_name.strip(),
            "category": normalized_cat,
            "estimated_closing_rank": projected_rank,
            "confidence": "High",
            "trend": trend,
            "target_year": target_year,
            "historical_records": formatted_history,
            "explanation": (
                f"Projected using linear trend estimation across {count} historical sessions "
                f"({min(years)} to {max(years)})."
            ),
            "methodology": f"Multi-year linear trend projection across {count} sessions.",
            "disclaimer": PREDICTOR_DISCLAIMER,
        }
