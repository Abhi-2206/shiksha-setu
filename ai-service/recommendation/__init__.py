"""College recommendation and cutoff prediction package for Shiksha Setu."""
try:
    from recommendation.college_recommender import (
        RECOMMENDATION_DISCLAIMER,
        VALID_CATEGORIES,
        load_and_validate_cutoffs,
        normalize_category,
        recommend_colleges,
    )
    from recommendation.cutoff_predictor import (
        PREDICTOR_DISCLAIMER,
        predict_cutoff,
    )
except ImportError:
    from .college_recommender import (
        RECOMMENDATION_DISCLAIMER,
        VALID_CATEGORIES,
        load_and_validate_cutoffs,
        normalize_category,
        recommend_colleges,
    )
    from .cutoff_predictor import (
        PREDICTOR_DISCLAIMER,
        predict_cutoff,
    )

__all__ = [
    "recommend_colleges",
    "predict_cutoff",
    "load_and_validate_cutoffs",
    "normalize_category",
    "VALID_CATEGORIES",
    "RECOMMENDATION_DISCLAIMER",
    "PREDICTOR_DISCLAIMER",
]
