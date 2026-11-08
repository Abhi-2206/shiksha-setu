"""
Unit tests for the Cutoff Predictor module.
Uses synthetic multi-year fixtures clearly identified as test data.
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

from recommendation.cutoff_predictor import (
    PREDICTOR_DISCLAIMER,
    calculate_linear_trend,
    predict_cutoff,
)

# ---------------------------------------------------------------------------
# Synthetic Multi-Year Test Fixtures
# ---------------------------------------------------------------------------

MULTI_YEAR_SYNTHETIC_RECORDS = [
    # 3-year series for College Alpha (increasing cutoffs)
    {
        "college_id": "SYNTH_GPC_01",
        "college_name": "Synthetic Polytechnic College Alpha",
        "location": "Jaipur",
        "course_name": "Civil Engineering",
        "category": "GEN",
        "admission_year": 2022,
        "opening_rank": 800,
        "closing_rank": 2600,
        "source": "Synthetic Report 2022",
        "source_year": 2022,
    },
    {
        "college_id": "SYNTH_GPC_01",
        "college_name": "Synthetic Polytechnic College Alpha",
        "location": "Jaipur",
        "course_name": "Civil Engineering",
        "category": "GEN",
        "admission_year": 2023,
        "opening_rank": 850,
        "closing_rank": 2800,
        "source": "Synthetic Report 2023",
        "source_year": 2023,
    },
    {
        "college_id": "SYNTH_GPC_01",
        "college_name": "Synthetic Polytechnic College Alpha",
        "location": "Jaipur",
        "course_name": "Civil Engineering",
        "category": "GEN",
        "admission_year": 2024,
        "opening_rank": 900,
        "closing_rank": 3000,
        "source": "Synthetic Report 2024",
        "source_year": 2024,
    },
    # 2-year series for College Beta
    {
        "college_id": "SYNTH_GPC_02",
        "college_name": "Synthetic Polytechnic College Beta",
        "location": "Jaipur",
        "course_name": "Computer Science",
        "category": "OBC",
        "admission_year": 2023,
        "opening_rank": 400,
        "closing_rank": 1400,
        "source": "Synthetic Report 2023",
        "source_year": 2023,
    },
    {
        "college_id": "SYNTH_GPC_02",
        "college_name": "Synthetic Polytechnic College Beta",
        "location": "Jaipur",
        "course_name": "Computer Science",
        "category": "OBC",
        "admission_year": 2024,
        "opening_rank": 450,
        "closing_rank": 1500,
        "source": "Synthetic Report 2024",
        "source_year": 2024,
    },
    # 1-year series for College Gamma
    {
        "college_id": "SYNTH_GPC_03",
        "college_name": "Synthetic Polytechnic College Gamma",
        "location": "Jodhpur",
        "course_name": "Electrical Engineering",
        "category": "SC",
        "admission_year": 2024,
        "opening_rank": 1200,
        "closing_rank": 4500,
        "source": "Synthetic Report 2024",
        "source_year": 2024,
    },
]


class TestCutoffPrediction:
    def test_multi_year_high_confidence_prediction(self):
        """3+ years of data yields High confidence and positive estimated closing rank."""
        res = predict_cutoff(
            college_id="SYNTH_GPC_01",
            course_name="Civil Engineering",
            category="GEN",
            records=MULTI_YEAR_SYNTHETIC_RECORDS,
        )

        assert res["confidence"] == "High"
        assert res["estimated_closing_rank"] is not None
        assert res["estimated_closing_rank"] > 3000  # Linear progression from 2600 -> 2800 -> 3000
        assert res["trend"] == "increasing"
        assert len(res["historical_records"]) == 3
        assert res["target_year"] == 2025
        assert PREDICTOR_DISCLAIMER in res["disclaimer"]

    def test_two_year_moderate_confidence_prediction(self):
        """2 years of data yields Moderate confidence."""
        res = predict_cutoff(
            college_id="SYNTH_GPC_02",
            course_name="Computer Science",
            category="OBC",
            records=MULTI_YEAR_SYNTHETIC_RECORDS,
        )

        assert res["confidence"] == "Moderate"
        assert res["estimated_closing_rank"] is not None
        assert len(res["historical_records"]) == 2
        assert res["trend"] in {"increasing", "decreasing", "stable"}

    def test_single_year_insufficient_data(self):
        """1 year of data returns confidence Low and estimated_closing_rank None."""
        res = predict_cutoff(
            college_id="SYNTH_GPC_03",
            course_name="Electrical Engineering",
            category="SC",
            records=MULTI_YEAR_SYNTHETIC_RECORDS,
        )

        assert res["confidence"] == "Low"
        assert res["estimated_closing_rank"] is None
        assert res["trend"] == "insufficient_data"
        assert "at least 2 distinct academic sessions" in res["explanation"]
        assert len(res["historical_records"]) == 1

    def test_missing_college_or_course_raises(self):
        """Requesting an unlisted college or course raises ValueError."""
        with pytest.raises(ValueError, match="No historical cutoff records found"):
            predict_cutoff(
                college_id="NON_EXISTENT_COLLEGE",
                course_name="Civil Engineering",
                category="GEN",
                records=MULTI_YEAR_SYNTHETIC_RECORDS,
            )

        with pytest.raises(ValueError, match="No historical cutoff records found"):
            predict_cutoff(
                college_id="SYNTH_GPC_01",
                course_name="Biotechnology",
                category="GEN",
                records=MULTI_YEAR_SYNTHETIC_RECORDS,
            )

    def test_missing_category_records_raises(self):
        """Requesting a category with no records for that college raises ValueError."""
        with pytest.raises(ValueError, match="No historical cutoff records found"):
            predict_cutoff(
                college_id="SYNTH_GPC_01",
                course_name="Civil Engineering",
                category="ST",  # Only GEN is in the fixture for GPC_01
                records=MULTI_YEAR_SYNTHETIC_RECORDS,
            )

    def test_empty_input_parameters_raise(self):
        """Empty college_id or course_name raises ValueError."""
        with pytest.raises(ValueError, match="college_id must be a non-empty string"):
            predict_cutoff("", "Civil Engineering", "GEN", records=MULTI_YEAR_SYNTHETIC_RECORDS)

        with pytest.raises(ValueError, match="course_name must be a non-empty string"):
            predict_cutoff("SYNTH_GPC_01", "", "GEN", records=MULTI_YEAR_SYNTHETIC_RECORDS)

    def test_source_and_history_preserved(self):
        """Historical records output contains source and source_year accurately."""
        res = predict_cutoff(
            college_id="SYNTH_GPC_01",
            course_name="Civil Engineering",
            category="GEN",
            records=MULTI_YEAR_SYNTHETIC_RECORDS,
        )
        first_record = res["historical_records"][0]
        assert first_record["admission_year"] == 2022
        assert first_record["opening_rank"] == 800
        assert first_record["closing_rank"] == 2600
        assert first_record["source"] == "Synthetic Report 2022"
        assert first_record["source_year"] == 2022


class TestLinearTrendCalculation:
    def test_calculate_linear_trend_helper(self):
        """Helper returns positive projected rank and correct trend label."""
        years = [2022, 2023, 2024]
        ranks = [1000, 1100, 1200]
        proj, trend = calculate_linear_trend(years, ranks, target_year=2025)
        assert proj == 1300
        assert trend == "increasing"
