"""
Unit tests for the College Recommender module.
Uses synthetic test fixtures clearly identified as test data.
No live or fabricated real-world data is used.
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

from recommendation.college_recommender import (
    RECOMMENDATION_DISCLAIMER,
    classify_admission_chance,
    load_and_validate_cutoffs,
    normalize_category,
    recommend_colleges,
)

# ---------------------------------------------------------------------------
# Synthetic Test Fixtures
# ---------------------------------------------------------------------------

SYNTHETIC_TEST_RECORDS = [
    {
        "college_id": "SYNTH_GPC_01",
        "college_name": "Synthetic Polytechnic College Alpha",
        "location": "Jaipur",
        "course_name": "Civil Engineering",
        "category": "GEN",
        "admission_year": 2024,
        "opening_rank": 500,
        "closing_rank": 3000,
        "source": "Synthetic Test Data v1",
        "source_year": 2024,
    },
    {
        "college_id": "SYNTH_GPC_02",
        "college_name": "Synthetic Polytechnic College Beta",
        "location": "Jaipur",
        "course_name": "Computer Science",
        "category": "GEN",
        "admission_year": 2024,
        "opening_rank": 200,
        "closing_rank": 1500,
        "source": "Synthetic Test Data v1",
        "source_year": 2024,
    },
    {
        "college_id": "SYNTH_GPC_03",
        "college_name": "Synthetic Polytechnic College Gamma",
        "location": "Jodhpur",
        "course_name": "Electrical Engineering",
        "category": "OBC",
        "admission_year": 2024,
        "opening_rank": 800,
        "closing_rank": 4000,
        "source": "Synthetic Test Data v1",
        "source_year": 2024,
    },
    {
        "college_id": "SYNTH_GPC_04",
        "college_name": "Synthetic Polytechnic College Delta",
        "location": "Kota",
        "course_name": "Mechanical Engineering",
        "category": "SC",
        "admission_year": 2024,
        "opening_rank": 1500,
        "closing_rank": 7000,
        "source": "Synthetic Test Data v1",
        "source_year": 2024,
    },
    {
        "college_id": "SYNTH_GPC_05",
        "college_name": "Synthetic Polytechnic College Epsilon",
        "location": "Jaipur",
        "course_name": "Civil Engineering",
        "category": "GEN",
        "admission_year": 2024,
        "opening_rank": 1000,
        "closing_rank": 5000,
        "source": "Synthetic Test Data v1",
        "source_year": 2024,
    },
]


class TestCategoryNormalization:
    def test_normalize_valid_categories(self):
        assert normalize_category("gen") == "GEN"
        assert normalize_category("GENERAL") == "GEN"
        assert normalize_category("obc") == "OBC"
        assert normalize_category("sc") == "SC"
        assert normalize_category("ST") == "ST"
        assert normalize_category("ews") == "EWS"

    def test_normalize_invalid_category_raises(self):
        with pytest.raises(ValueError, match="Invalid category"):
            normalize_category("UNKNOWN_CATEGORY")

        with pytest.raises(ValueError, match="non-empty string"):
            normalize_category("")


class TestAdmissionChanceClassification:
    def test_likely_chance(self):
        # Rank 2000 vs closing 3000 (2000 <= 0.85 * 3000 = 2550)
        status, rationale = classify_admission_chance(2000, 3000)
        assert status == "Likely"
        assert "safely within" in rationale

    def test_moderate_chance(self):
        # Rank 2800 vs closing 3000 (2550 < 2800 <= 3150)
        status, rationale = classify_admission_chance(2800, 3000)
        assert status == "Moderate"
        assert "close to" in rationale

    def test_ambitious_chance(self):
        # Rank 3500 vs closing 3000 (3150 < 3500 <= 3750)
        status, rationale = classify_admission_chance(3500, 3000)
        assert status == "Ambitious"
        assert "above the historical" in rationale


class TestCollegeRecommendations:
    def test_successful_college_recommendations(self):
        """Student rank 2000 with GEN category receives matching recommendations."""
        res = recommend_colleges(
            rank=2000,
            category="GEN",
            records=SYNTHETIC_TEST_RECORDS,
        )
        assert res["student_rank"] == 2000
        assert res["category"] == "GEN"
        assert res["total_recommendations"] > 0
        assert "disclaimer" in res
        assert RECOMMENDATION_DISCLAIMER in res["disclaimer"]

    def test_category_filtering(self):
        """Filtering by SC category returns only SC options."""
        res = recommend_colleges(
            rank=4000,
            category="SC",
            records=SYNTHETIC_TEST_RECORDS,
        )
        assert res["total_recommendations"] == 1
        assert res["recommendations"][0]["category"] == "SC"
        assert res["recommendations"][0]["college_id"] == "SYNTH_GPC_04"

    def test_course_filtering(self):
        """Filtering by course name returns only colleges offering that course."""
        res = recommend_colleges(
            rank=2000,
            category="GEN",
            preferred_course="Civil Engineering",
            records=SYNTHETIC_TEST_RECORDS,
        )
        assert res["total_recommendations"] == 2
        for rec in res["recommendations"]:
            assert "Civil" in rec["course_name"]

    def test_location_filtering(self):
        """Filtering by location returns only colleges in that location."""
        res = recommend_colleges(
            rank=2500,
            category="OBC",
            preferred_location="Jodhpur",
            records=SYNTHETIC_TEST_RECORDS,
        )
        assert res["total_recommendations"] == 1
        assert res["recommendations"][0]["location"] == "Jodhpur"

    def test_likely_moderate_ambitious_grouping(self):
        """Results are grouped into likely, moderate, and ambitious categories."""
        res = recommend_colleges(
            rank=2700,
            category="GEN",
            records=SYNTHETIC_TEST_RECORDS,
        )
        categorized = res["categorized"]
        assert "likely" in categorized
        assert "moderate" in categorized
        assert "ambitious" in categorized
        # Rank 2700 vs closing 5000 is Likely; rank 2700 vs closing 3000 is Moderate
        assert any(x["college_id"] == "SYNTH_GPC_05" for x in categorized["likely"])
        assert any(x["college_id"] == "SYNTH_GPC_01" for x in categorized["moderate"])

    def test_source_and_year_preserved(self):
        """Source and admission year are preserved accurately in recommendation output."""
        res = recommend_colleges(
            rank=1000,
            category="GEN",
            records=SYNTHETIC_TEST_RECORDS,
        )
        top_rec = res["recommendations"][0]
        assert top_rec["admission_year"] == 2024
        assert top_rec["source_year"] == 2024
        assert "Synthetic Test Data" in top_rec["source"]


class TestDataValidationAndEdgeCases:
    def test_invalid_rank_raises(self):
        for bad_rank in [0, -50, "1000", True, None]:
            with pytest.raises(ValueError, match="Student rank must be a positive integer"):
                recommend_colleges(rank=bad_rank, category="GEN", records=SYNTHETIC_TEST_RECORDS)

    def test_invalid_category_raises(self):
        with pytest.raises(ValueError, match="Invalid category"):
            recommend_colleges(rank=1000, category="INVALID_CAT", records=SYNTHETIC_TEST_RECORDS)

    def test_missing_dataset_file_raises(self):
        with pytest.raises(FileNotFoundError):
            recommend_colleges(rank=1000, category="GEN", data_path="/nonexistent/path/data.csv")

    def test_empty_dataset_raises(self):
        with pytest.raises(ValueError, match="Cutoff dataset is empty"):
            recommend_colleges(rank=1000, category="GEN", records=[])

    def test_duplicate_records_handled(self):
        """Duplicate rows are deduplicated without inflating count."""
        dup_records = [
            SYNTHETIC_TEST_RECORDS[0],
            SYNTHETIC_TEST_RECORDS[0],  # Duplicate
        ]
        validated = load_and_validate_cutoffs(records=dup_records)
        assert len(validated) == 1

    def test_invalid_cutoff_values_rejected(self):
        """opening_rank > closing_rank is rejected."""
        bad_record = [
            {
                "college_id": "BAD_01",
                "college_name": "Bad College",
                "location": "Jaipur",
                "course_name": "Civil",
                "category": "GEN",
                "admission_year": 2024,
                "opening_rank": 5000,
                "closing_rank": 2000,  # Invalid: opening > closing
                "source": "Test",
                "source_year": 2024,
            }
        ]
        with pytest.raises(ValueError, match="opening_rank .* greater than closing_rank"):
            load_and_validate_cutoffs(records=bad_record)
