"""
FastAPI application for Shiksha Setu AI Student Assistance Service.
Integrates RAG Chatbot, Semantic Retrieval, College Recommendations,
and Cutoff Trend Predictions into clean, production-ready REST endpoints.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict

# Ensure ai-service directory is on sys.path
_CURRENT_FILE = Path(__file__).resolve()
_API_DIR = _CURRENT_FILE.parent
_AI_SERVICE_DIR = _API_DIR.parent
_PROJECT_ROOT = _AI_SERVICE_DIR.parent

if str(_AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_AI_SERVICE_DIR))

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from api.schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    PredictCutoffRequest,
    PredictCutoffResponse,
    RecommendCollegesRequest,
    RecommendCollegesResponse,
)
from chatbot.generator import ask_chatbot
from recommendation.college_recommender import recommend_colleges
from recommendation.cutoff_predictor import predict_cutoff

logger = logging.getLogger("shiksha_setu_api")

app = FastAPI(
    title="Shiksha Setu AI Service API",
    description=(
        "Official AI Student Assistance REST API for the Department of Technical Education (DTE), "
        "Government of Rajasthan. Provides grounded RAG student assistance, official document retrieval, "
        "college recommendations, and historical cutoff analysis."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================================
# Centralized Error Handlers
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handles Pydantic validation failures with sanitized detail."""
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "detail": jsonable_encoder(exc.errors()),
            "message": "One or more input fields failed validation.",
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Handles domain ValueError as HTTP 400 Bad Request."""
    logger.warning("Bad request on %s %s: %s", request.method, request.url.path, str(exc))
    return JSONResponse(
        status_code=400,
        content={
            "error": "Bad Request",
            "detail": str(exc),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Preserves HTTP exceptions with their status codes."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Error",
            "detail": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catches unhandled exceptions, logs internal details, and returns safe response without leaking stack traces or keys."""
    logger.error("Unhandled exception processing %s %s", request.method, request.url.path, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An internal server error occurred while processing the request.",
        },
    )


# ============================================================================
# Endpoints
# ============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check and service status",
    tags=["System"],
)
async def health_check() -> HealthResponse:
    """
    Returns the current operating status and service metadata.
    """
    return HealthResponse(
        status="healthy",
        service="Shiksha Setu AI Service",
        version="1.0.0",
        description="AI Student Assistance API for Department of Technical Education (DTE), Rajasthan",
    )


@app.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask the Shiksha Setu AI Assistant",
    tags=["Chatbot & RAG"],
    status_code=status.HTTP_200_OK,
)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    Answers student questions grounded strictly in official Rajasthan DTE documents.

    Workflow:
    - Performs semantic vector search on ChromaDB knowledge base.
    - Generates grounded, hallucination-resistant answers with Gemini.
    - Returns verified source citations and disclaimers.
    """
    result = ask_chatbot(question=request.question, top_k=request.top_k)

    if not result.get("success", False):
        error_type = result.get("error_type")
        msg = result.get("message", "An error occurred during chat generation.")

        if error_type in ("empty_question", "invalid_top_k", "retrieval_validation_error"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
        elif error_type == "missing_api_key":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is currently unavailable due to configuration constraints.",
            )
        elif error_type in ("retrieval_error", "api_error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service dependency error: {msg}",
            )
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=msg)

    return ChatResponse(
        answer=result.get("answer"),
        sources=result.get("sources", []),
        success=True,
        status="success",
        error_type=None,
        message=None,
    )


@app.post(
    "/recommend-colleges",
    response_model=RecommendCollegesResponse,
    summary="Recommend colleges by rank and preferences",
    tags=["Recommendations"],
    status_code=status.HTTP_200_OK,
)
async def recommend_colleges_endpoint(request: RecommendCollegesRequest) -> RecommendCollegesResponse:
    """
    Recommends polytechnic and engineering colleges based on student merit rank,
    reservation category, and optional course/location preferences.
    """
    try:
        recommendations = recommend_colleges(
            rank=request.rank,
            category=request.category,
            preferred_course=request.preferred_course,
            preferred_location=request.preferred_location,
            top_k=request.top_k,
        )
        return RecommendCollegesResponse(**recommendations)
    except FileNotFoundError as fnf_err:
        logger.error("Cutoff dataset file missing: %s", fnf_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Historical cutoff database is currently unavailable.",
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))


@app.post(
    "/predict-cutoff",
    response_model=PredictCutoffResponse,
    summary="Estimate historical cutoff trends for a college course",
    tags=["Predictions"],
    status_code=status.HTTP_200_OK,
)
async def predict_cutoff_endpoint(request: PredictCutoffRequest) -> PredictCutoffResponse:
    """
    Estimates upcoming closing rank cutoffs for a specific college, course, and category
    using multi-year historical trend modeling.
    """
    try:
        prediction = predict_cutoff(
            college_id=request.college_id,
            course_name=request.course_name,
            category=request.category,
        )
        return PredictCutoffResponse(**prediction)
    except FileNotFoundError as fnf_err:
        logger.error("Cutoff dataset file missing: %s", fnf_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Historical cutoff database is currently unavailable.",
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))


# ============================================================================
# Dynamic Server Configuration & Direct Startup
# ============================================================================

def get_port(raw_port: Optional[str | int] = None) -> int:
    """
    Resolves and validates the server port:
    - Reads PORT environment variable if raw_port is not provided.
    - Defaults to 8000 if PORT is missing, empty, or whitespace-only.
    - Accepts integers from 1 through 65535.
    - Raises ValueError for non-numeric or out-of-range values.
    - Does not silently fall back to 8000 when an invalid PORT is supplied.
    """
    if raw_port is None:
        port_str = os.getenv("PORT", "").strip()
    elif isinstance(raw_port, int):
        port_str = str(raw_port)
    else:
        port_str = str(raw_port).strip()

    if not port_str:
        return 8000

    try:
        port = int(port_str)
    except ValueError as err:
        raise ValueError(
            f"Invalid PORT '{port_str}'. Port must be an integer between 1 and 65535."
        ) from err

    if not (1 <= port <= 65535):
        raise ValueError(
            f"Invalid PORT {port}. Port must be between 1 and 65535."
        )

    return port


def get_host(raw_host: Optional[str] = None) -> str:
    """
    Resolves the server host:
    - Reads HOST environment variable if raw_host is not provided.
    - Defaults to '0.0.0.0' if missing, empty, or whitespace-only.
    """
    if raw_host is None:
        host_str = os.getenv("HOST", "").strip()
    else:
        host_str = str(raw_host).strip()

    return host_str if host_str else "0.0.0.0"


if __name__ == "__main__":
    import uvicorn

    host = get_host()
    try:
        port = get_port()
    except ValueError as err:
        logger.critical("Startup failed: %s", err)
        print(f"Startup configuration error: {err}", file=sys.stderr)
        sys.exit(1)

    logger.info("Starting Shiksha Setu AI Service on %s:%d", host, port)
    uvicorn.run(app, host=host, port=port)
