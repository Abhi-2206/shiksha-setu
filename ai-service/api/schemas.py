"""
Pydantic schemas for Shiksha Setu AI Service API endpoints.
Defines strict validation rules and OpenAPI documentation examples.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Health Check Schemas
# ============================================================================

class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    service: str = Field(..., examples=["Shiksha Setu AI Service"])
    version: str = Field(..., examples=["1.0.0"])
    description: str = Field(
        ...,
        examples=["AI Student Assistance API for Department of Technical Education (DTE), Rajasthan"],
    )


# ============================================================================
# Chatbot RAG Schemas
# ============================================================================

class SourceReference(BaseModel):
    document_name: str = Field(..., examples=["admission_guidelines_2024.pdf"])
    page_number: int = Field(..., examples=[3])
    source_path: str = Field(..., examples=["/data/admission_guidelines_2024.pdf"])


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        description="Student question in English, Hindi, or Hinglish.",
        examples=["What is the eligibility for polytechnic diploma courses in Rajasthan?"],
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of relevant document chunks to retrieve.",
        examples=[5],
    )

    @field_validator("question")
    @classmethod
    def validate_question_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question cannot be empty or whitespace only.")
        return v.strip()


class ChatResponse(BaseModel):
    answer: Optional[str] = Field(
        None,
        description="Official grounded response from Shiksha Setu chatbot.",
        examples=["Eligibility requires Class 10 pass with Science and Mathematics from a recognized board."],
    )
    sources: List[SourceReference] = Field(
        default_factory=list,
        description="Verified official document source references.",
    )
    success: bool = Field(..., examples=[True])
    status: str = Field(..., examples=["success"])
    error_type: Optional[str] = Field(None, examples=[None])
    message: Optional[str] = Field(None, examples=[None])


# ============================================================================
# College Recommendation Schemas
# ============================================================================

class CollegeRecommendationItem(BaseModel):
    college_id: str = Field(..., examples=["GPC_JAIPUR"])
    college_name: str = Field(..., examples=["Government Polytechnic College, Jaipur"])
    location: str = Field(..., examples=["Jaipur"])
    course_name: str = Field(..., examples=["Civil Engineering"])
    category: str = Field(..., examples=["GEN"])
    historical_opening_rank: int = Field(..., examples=[500])
    historical_closing_rank: int = Field(..., examples=[2800])
    admission_year: int = Field(..., examples=[2024])
    source: str = Field(..., examples=["DTE Rajasthan Official Cutoff 2024"])
    source_year: int = Field(..., examples=[2024])
    category_status: str = Field(
        ...,
        description="Admission chance classification: 'Likely', 'Moderate', or 'Ambitious'.",
        examples=["Likely"],
    )
    rationale: str = Field(
        ...,
        examples=["Your rank (2000) is safely within the historical closing rank (2800)."],
    )


class CategorizedRecommendations(BaseModel):
    likely: List[CollegeRecommendationItem] = Field(default_factory=list)
    moderate: List[CollegeRecommendationItem] = Field(default_factory=list)
    ambitious: List[CollegeRecommendationItem] = Field(default_factory=list)


class RecommendCollegesRequest(BaseModel):
    rank: int = Field(
        ...,
        gt=0,
        description="Student merit rank (positive integer).",
        examples=[2500],
    )
    category: str = Field(
        ...,
        min_length=1,
        description="Reservation category: GEN, OBC, SC, ST, EWS, MBC, TFWS, PWD.",
        examples=["OBC"],
    )
    preferred_course: Optional[str] = Field(
        default=None,
        description="Optional course name filter (e.g., 'Civil Engineering').",
        examples=["Civil Engineering"],
    )
    preferred_location: Optional[str] = Field(
        default=None,
        description="Optional district/location filter (e.g., 'Jaipur').",
        examples=["Jaipur"],
    )
    top_k: int = Field(
        default=10,
        gt=0,
        le=50,
        description="Maximum number of college recommendations to return.",
        examples=[10],
    )

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Category cannot be empty.")
        return v.strip().upper()


class RecommendCollegesResponse(BaseModel):
    student_rank: int = Field(..., examples=[2500])
    category: str = Field(..., examples=["OBC"])
    preferred_course: Optional[str] = Field(None, examples=["Civil Engineering"])
    preferred_location: Optional[str] = Field(None, examples=["Jaipur"])
    disclaimer: str = Field(
        ...,
        examples=["Indicative estimate based strictly on historical cutoff data."],
    )
    total_recommendations: int = Field(..., examples=[3])
    recommendations: List[CollegeRecommendationItem] = Field(default_factory=list)
    categorized: CategorizedRecommendations


# ============================================================================
# Cutoff Predictor Schemas
# ============================================================================

class HistoricalCutoffRecord(BaseModel):
    admission_year: int = Field(..., examples=[2023])
    opening_rank: int = Field(..., examples=[450])
    closing_rank: int = Field(..., examples=[1500])
    source: str = Field(..., examples=["DTE Rajasthan Annual Report 2023"])
    source_year: int = Field(..., examples=[2023])


class PredictCutoffRequest(BaseModel):
    college_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier for the institution.",
        examples=["GPC_JAIPUR"],
    )
    course_name: str = Field(
        ...,
        min_length=1,
        description="Course name (e.g., 'Civil Engineering').",
        examples=["Civil Engineering"],
    )
    category: str = Field(
        ...,
        min_length=1,
        description="Reservation category: GEN, OBC, SC, ST, EWS, MBC, etc.",
        examples=["GEN"],
    )

    @field_validator("college_id", "course_name", "category")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or whitespace only.")
        return v.strip()


class PredictCutoffResponse(BaseModel):
    college_id: str = Field(..., examples=["GPC_JAIPUR"])
    college_name: str = Field(..., examples=["Government Polytechnic College, Jaipur"])
    course_name: str = Field(..., examples=["Civil Engineering"])
    category: str = Field(..., examples=["GEN"])
    estimated_closing_rank: Optional[int] = Field(
        None,
        description="Estimated closing rank projection for upcoming session.",
        examples=[2950],
    )
    confidence: str = Field(
        ...,
        description="'High', 'Moderate', or 'Low' based on historical data depth.",
        examples=["High"],
    )
    trend: str = Field(
        ...,
        description="'increasing', 'decreasing', 'stable', or 'insufficient_data'.",
        examples=["increasing"],
    )
    target_year: int = Field(..., examples=[2025])
    historical_records: List[HistoricalCutoffRecord] = Field(default_factory=list)
    explanation: str = Field(
        ...,
        examples=["Calculated using multi-year historical trend regression."],
    )
    methodology: str = Field(..., examples=["Multi-year linear trend projection."])
    disclaimer: str = Field(
        ...,
        examples=["Mathematical projection based strictly on historical trends; not an official cutoff."],
    )
