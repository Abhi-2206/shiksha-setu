"""
College recommendation module for Rajasthan DTE AI Student Assistance Chatbot.
Provides transparent, data-driven college guidance comparing student merit ranks
against verified historical cutoff benchmarks.
"""
from __future__ import annotations

import csv
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

# Ensure ai-service directory is on sys.path
_CURRENT_FILE = Path(__file__).resolve()
_RECOMMENDATION_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _RECOMMENDATION_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

logger = logging.getLogger(__name__)

DEFAULT_DATASET_PATH = _AI_SERVICE_DIR / "data" / "college_cutoffs.csv"

REQUIRED_FIELDS: Set[str] = {
    "college_id",
    "college_name",
    "location",
    "course_name",
    "category",
    "admission_year",
    "opening_rank",
    "closing_rank",
    "source",
    "source_year",
}

VALID_CATEGORIES: Set[str] = {
    "GEN",
    "GENERAL",
    "OBC",
    "SC",
    "ST",
    "EWS",
    "MBC",
    "TFWS",
    "PWD",
}

RECOMMENDATION_DISCLAIMER = (
    "DISCLAIMER: These college recommendations and category classifications (Likely, Moderate, Ambitious) "
    "are indicative estimates based strictly on historical cutoff data. They do not guarantee admission. "
    "Actual cutoffs for the current academic session will vary based on total applicants, seat matrices, "
    "and official Rajasthan DTE centralized counseling rounds."
)


def normalize_category(category: str) -> str:
    """
    Normalizes category string to uppercase standard format.
    Maps aliases like 'GENERAL' to 'GEN'.
    """
    if not isinstance(category, str) or not category.strip():
        raise ValueError("Category must be a non-empty string.")

    cleaned = category.strip().upper()
    if cleaned not in VALID_CATEGORIES:
        raise ValueError(
            f"Invalid category '{category}'. Recognized categories are: {sorted(VALID_CATEGORIES)}"
        )

    if cleaned == "GENERAL":
        return "GEN"
    return cleaned


def load_and_validate_cutoffs(
    data_path: Optional[str | Path] = None,
    records: Optional[List[Dict[str, Any]]] = None,
    strict: bool = True,
) -> List[Dict[str, Any]]:
    """
    Loads and validates cutoff records from memory or a CSV file.

    Args:
        data_path: Optional path to CSV file. Defaults to ai-service/data/college_cutoffs.csv.
        records: Optional in-memory list of raw dictionaries (bypasses CSV disk read).
        strict: If True, raises ValueError on invalid cutoff numbers. If False, skips bad rows.

    Returns:
        List of cleaned, validated cutoff dictionaries.

    Raises:
        FileNotFoundError: If the specified CSV dataset file does not exist.
        ValueError: If the dataset is empty, missing required columns, or contains invalid cutoff numbers.
    """
    raw_data: List[Dict[str, Any]] = []

    if records is not None:
        if not isinstance(records, list):
            raise TypeError(f"records must be a list of dictionaries, got: {type(records).__name__}")
        raw_data = records
    else:
        path = Path(data_path) if data_path else DEFAULT_DATASET_PATH
        if not path.exists():
            raise FileNotFoundError(f"Cutoff dataset not found at '{path}'.")

        with open(path, mode="r", encoding="utf-8-sig") as csv_file:
            reader = csv.DictReader(csv_file)
            if not reader.fieldnames:
                raise ValueError("Cutoff dataset is empty (missing header row).")

            missing_headers = REQUIRED_FIELDS - set(reader.fieldnames)
            if missing_headers:
                raise ValueError(f"Cutoff dataset is missing required column(s): {sorted(missing_headers)}")

            raw_data = list(reader)

    if not raw_data:
        raise ValueError("Cutoff dataset is empty. No historical cutoff records available.")

    validated: List[Dict[str, Any]] = []
    seen_keys: set = set()

    for idx, row in enumerate(raw_data):
        if not isinstance(row, dict):
            if strict:
                raise TypeError(f"Row {idx} is not a dictionary.")
            continue

        missing_keys = REQUIRED_FIELDS - row.keys()
        if missing_keys:
            if strict:
                raise ValueError(f"Record at index {idx} missing required field(s): {sorted(missing_keys)}")
            continue

        # Parse and validate numerical fields
        try:
            admission_year = int(row["admission_year"])
            opening_rank = int(row["opening_rank"])
            closing_rank = int(row["closing_rank"])
            source_year = int(row["source_year"])
        except (ValueError, TypeError) as num_err:
            if strict:
                raise ValueError(f"Record at index {idx} contains non-integer rank or year: {num_err}") from num_err
            continue

        if opening_rank <= 0 or closing_rank <= 0 or admission_year <= 0 or source_year <= 0:
            if strict:
                raise ValueError(f"Record at index {idx} has non-positive rank or year values.")
            continue

        if opening_rank > closing_rank:
            if strict:
                raise ValueError(
                    f"Record at index {idx} has opening_rank ({opening_rank}) greater than closing_rank ({closing_rank})."
                )
            continue

        college_id = str(row["college_id"]).strip()
        college_name = str(row["college_name"]).strip()
        location = str(row["location"]).strip()
        course_name = str(row["course_name"]).strip()
        raw_category = str(row["category"]).strip().upper()

        if not college_id or not college_name or not course_name or not location or not raw_category:
            if strict:
                raise ValueError(f"Record at index {idx} contains empty required text fields.")
            continue

        category = "GEN" if raw_category == "GENERAL" else raw_category

        # Deduplication key
        dedup_key = (college_id, course_name, category, admission_year)
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        validated.append(
            {
                "college_id": college_id,
                "college_name": college_name,
                "location": location,
                "course_name": course_name,
                "category": category,
                "admission_year": admission_year,
                "opening_rank": opening_rank,
                "closing_rank": closing_rank,
                "source": str(row["source"]).strip(),
                "source_year": source_year,
            }
        )

    if not validated:
        raise ValueError("No valid cutoff records found after dataset validation.")

    return validated


def classify_admission_chance(student_rank: int, closing_rank: int) -> tuple[str, str]:
    """
    Determines admission category and rationale based on student rank relative to closing cutoff.

    Criteria:
    - Likely: student_rank <= 0.85 * closing_rank (Student rank comfortably inside closing rank)
    - Moderate: 0.85 * closing_rank < student_rank <= 1.05 * closing_rank (Near cutoff margin)
    - Ambitious: 1.05 * closing_rank < student_rank <= 1.25 * closing_rank (Reach option)
    """
    if student_rank <= int(0.85 * closing_rank):
        return (
            "Likely",
            f"Your rank ({student_rank}) is safely within the historical closing rank ({closing_rank}).",
        )
    elif student_rank <= int(1.05 * closing_rank):
        return (
            "Moderate",
            f"Your rank ({student_rank}) is close to the historical closing rank ({closing_rank}).",
        )
    else:
        return (
            "Ambitious",
            f"Your rank ({student_rank}) is above the historical closing rank ({closing_rank}), but may be possible in later rounds.",
        )


def recommend_colleges(
    rank: int,
    category: str,
    preferred_course: Optional[str] = None,
    preferred_location: Optional[str] = None,
    top_k: int = 10,
    data_path: Optional[str | Path] = None,
    records: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Recommends colleges based on student rank, reservation category, and optional preferences.

    Args:
        rank: Student's merit rank (must be a positive integer).
        category: Reservation category (e.g., 'GEN', 'OBC', 'SC', 'ST', 'EWS').
        preferred_course: Optional filter by course name (case-insensitive substring match).
        preferred_location: Optional filter by location/district (case-insensitive substring match).
        top_k: Maximum number of college options to return (default: 10).
        data_path: Optional path to CSV cutoff dataset.
        records: Optional in-memory list of cutoff dictionaries.

    Returns:
        Structured recommendation dictionary:
        {
            "student_rank": int,
            "category": str,
            "preferred_course": str | None,
            "preferred_location": str | None,
            "disclaimer": str,
            "total_recommendations": int,
            "recommendations": list[dict],
            "categorized": {
                "likely": list[dict],
                "moderate": list[dict],
                "ambitious": list[dict],
            }
        }
    """
    if isinstance(rank, bool) or not isinstance(rank, int) or rank <= 0:
        raise ValueError("Student rank must be a positive integer.")

    if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
        raise ValueError("top_k must be a positive integer.")

    normalized_cat = normalize_category(category)

    # Load and validate cutoff database
    data = load_and_validate_cutoffs(data_path=data_path, records=records)

    # Filter by category
    category_matches = [r for r in data if r["category"] == normalized_cat]

    # Filter by optional course preference
    if preferred_course and preferred_course.strip():
        course_query = preferred_course.strip().lower()
        category_matches = [
            r for r in category_matches if course_query in r["course_name"].lower()
        ]

    # Filter by optional location preference
    if preferred_location and preferred_location.strip():
        loc_query = preferred_location.strip().lower()
        category_matches = [
            r for r in category_matches if loc_query in r["location"].lower()
        ]

    if not category_matches:
        return {
            "student_rank": rank,
            "category": normalized_cat,
            "preferred_course": preferred_course,
            "preferred_location": preferred_location,
            "disclaimer": RECOMMENDATION_DISCLAIMER,
            "total_recommendations": 0,
            "recommendations": [],
            "categorized": {
                "likely": [],
                "moderate": [],
                "ambitious": [],
            },
        }

    # For each unique (college_id, course_name), select the most recent admission year
    latest_per_college_course: Dict[tuple[str, str], Dict[str, Any]] = {}
    for r in category_matches:
        key = (r["college_id"], r["course_name"])
        existing = latest_per_college_course.get(key)
        if existing is None or r["admission_year"] > existing["admission_year"]:
            latest_per_college_course[key] = r

    eligible_options: List[Dict[str, Any]] = []

    for item in latest_per_college_course.values():
        closing = item["closing_rank"]

        # Discard options where rank is too far beyond reach (> 1.25 * closing)
        if rank > int(1.25 * closing):
            continue

        status, rationale = classify_admission_chance(rank, closing)

        rec_entry = {
            "college_id": item["college_id"],
            "college_name": item["college_name"],
            "location": item["location"],
            "course_name": item["course_name"],
            "category": item["category"],
            "historical_opening_rank": item["opening_rank"],
            "historical_closing_rank": item["closing_rank"],
            "admission_year": item["admission_year"],
            "source": item["source"],
            "source_year": item["source_year"],
            "category_status": status,
            "rationale": rationale,
        }
        eligible_options.append(rec_entry)

    # Sort options: Likely first, then Moderate, then Ambitious; within group by closing rank
    status_order = {"Likely": 0, "Moderate": 1, "Ambitious": 2}
    eligible_options.sort(
        key=lambda x: (status_order[x["category_status"]], abs(x["historical_closing_rank"] - rank))
    )

    top_results = eligible_options[:top_k]

    categorized = {
        "likely": [x for x in top_results if x["category_status"] == "Likely"],
        "moderate": [x for x in top_results if x["category_status"] == "Moderate"],
        "ambitious": [x for x in top_results if x["category_status"] == "Ambitious"],
    }

    return {
        "student_rank": rank,
        "category": normalized_cat,
        "preferred_course": preferred_course,
        "preferred_location": preferred_location,
        "disclaimer": RECOMMENDATION_DISCLAIMER,
        "total_recommendations": len(top_results),
        "recommendations": top_results,
        "categorized": categorized,
    }
