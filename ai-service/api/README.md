# Shiksha Setu AI Service API

REST API for the Rajasthan Department of Technical Education (DTE) AI Student Assistance Chatbot and Advisory System.

## Overview

The AI Service exposes endpoints for:
1. **Health Verification** (`GET /health`)
2. **Grounded RAG Chatbot** (`POST /chat`)
3. **Merit-Based College Recommendations** (`POST /recommend-colleges`)
4. **Historical Cutoff Trend Prediction** (`POST /predict-cutoff`)

Interactive OpenAPI / Swagger documentation is available at `/docs` (and ReDoc at `/redoc`).

---

## Starting the Service

From the project root:
```bash
./ai-service/.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --app-dir ai-service
```

---

## Endpoints

### 1. Health Check
- **Route:** `GET /health`
- **Description:** Verifies service status and version.
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "Shiksha Setu AI Service",
  "version": "1.0.0",
  "description": "AI Student Assistance API for Department of Technical Education (DTE), Rajasthan"
}
```

---

### 2. Grounded RAG Chatbot
- **Route:** `POST /chat`
- **Description:** Answers student questions strictly grounded in official DTE PDF documents.
- **Request Body:**
```json
{
  "question": "What is the eligibility for polytechnic diploma courses in Rajasthan?",
  "top_k": 5
}
```
- **Response (200 OK):**
```json
{
  "answer": "Admission to 3-year engineering polytechnic diploma courses in Rajasthan requires candidates to have passed Class 10 with Mathematics and Science from a recognized board with minimum 35% marks.",
  "sources": [
    {
      "document_name": "admission_guidelines_2024.pdf",
      "page_number": 3,
      "source_path": "/data/admission_guidelines_2024.pdf"
    }
  ],
  "success": true,
  "status": "success",
  "error_type": null,
  "message": null
}
```

---

### 3. College Recommendations
- **Route:** `POST /recommend-colleges`
- **Description:** Recommends colleges categorized into Likely, Moderate, and Ambitious tiers based on student rank and preferences.
- **Request Body:**
```json
{
  "rank": 2500,
  "category": "OBC",
  "preferred_course": "Civil Engineering",
  "preferred_location": "Jaipur",
  "top_k": 10
}
```
- **Response (200 OK):**
```json
{
  "student_rank": 2500,
  "category": "OBC",
  "preferred_course": "Civil Engineering",
  "preferred_location": "Jaipur",
  "disclaimer": "DISCLAIMER: These college recommendations... are indicative estimates based strictly on historical cutoff data...",
  "total_recommendations": 2,
  "recommendations": [
    {
      "college_id": "GPC_JAIPUR",
      "college_name": "Government Polytechnic College Jaipur",
      "location": "Jaipur",
      "course_name": "Civil Engineering",
      "category": "OBC",
      "historical_opening_rank": 500,
      "historical_closing_rank": 3100,
      "admission_year": 2024,
      "source": "DTE Rajasthan Cutoff Report 2024",
      "source_year": 2024,
      "category_status": "Likely",
      "rationale": "Your rank (2500) is safely within the historical closing rank (3100)."
    }
  ],
  "categorized": {
    "likely": [...],
    "moderate": [...],
    "ambitious": [...]
  }
}
```

---

### 4. Cutoff Trend Prediction
- **Route:** `POST /predict-cutoff`
- **Description:** Calculates transparent multi-year linear trend projections for closing ranks.
- **Request Body:**
```json
{
  "college_id": "GPC_JAIPUR",
  "course_name": "Civil Engineering",
  "category": "GEN"
}
```
- **Response (200 OK):**
```json
{
  "college_id": "GPC_JAIPUR",
  "college_name": "Government Polytechnic College Jaipur",
  "course_name": "Civil Engineering",
  "category": "GEN",
  "estimated_closing_rank": 2950,
  "confidence": "High",
  "trend": "increasing",
  "target_year": 2025,
  "historical_records": [
    {
      "admission_year": 2022,
      "opening_rank": 800,
      "closing_rank": 2600,
      "source": "DTE Rajasthan Report 2022",
      "source_year": 2022
    },
    {
      "admission_year": 2023,
      "opening_rank": 850,
      "closing_rank": 2800,
      "source": "DTE Rajasthan Report 2023",
      "source_year": 2023
    },
    {
      "admission_year": 2024,
      "opening_rank": 900,
      "closing_rank": 3000,
      "source": "DTE Rajasthan Report 2024",
      "source_year": 2024
    }
  ],
  "explanation": "Projected using linear trend estimation across 3 historical sessions (2022 to 2024).",
  "methodology": "Multi-year linear trend projection across 3 sessions.",
  "disclaimer": "DISCLAIMER: This projected cutoff is an indicative mathematical estimate..."
}
```
