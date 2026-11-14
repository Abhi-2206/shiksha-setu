# Shiksha Setu AI Service — API Reference

Base URL (local): `http://localhost:8000`

Interactive Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## Endpoints

| Method | Path | Tag | Description |
|---|---|---|---|
| `GET` | `/health` | System | Service status and version |
| `POST` | `/chat` | Chatbot & RAG | Grounded student Q&A |
| `POST` | `/recommend-colleges` | Recommendations | College list by rank and category |
| `POST` | `/predict-cutoff` | Predictions | Historical cutoff trend projection |

---

## 1. `GET /health`

Returns the current operating status and service metadata.

### Response `200 OK`

```json
{
  "status": "healthy",
  "service": "Shiksha Setu AI Service",
  "version": "1.0.0",
  "description": "AI Student Assistance API for Department of Technical Education (DTE), Rajasthan"
}
```

### Response Schema

| Field | Type | Description |
|---|---|---|
| `status` | `string` | Always `"healthy"` when the service is running |
| `service` | `string` | Service identifier |
| `version` | `string` | Semantic version |
| `description` | `string` | Human-readable service description |

---

## 2. `POST /chat`

Answers a student's natural-language question using Retrieval-Augmented Generation (RAG).

**Workflow:** Embeds the question → searches ChromaDB → passes retrieved context to Gemini → returns a grounded answer with source citations.

### Request Body

```json
{
  "question": "What is the eligibility for polytechnic diploma courses in Rajasthan?",
  "top_k": 5
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `question` | `string` | ✅ | Non-empty, non-whitespace | Student question in English, Hindi, or Hinglish |
| `top_k` | `integer` | ❌ | `1 ≤ top_k ≤ 20`, default `5` | Number of document chunks to retrieve |

### Response `200 OK`

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

### Response Schema

| Field | Type | Description |
|---|---|---|
| `answer` | `string \| null` | Grounded response from the chatbot |
| `sources` | `SourceReference[]` | Deduplicated list of official document citations |
| `sources[].document_name` | `string` | PDF filename |
| `sources[].page_number` | `integer` | 1-based page number |
| `sources[].source_path` | `string` | Relative path to source document |
| `success` | `boolean` | `true` on success |
| `status` | `string` | `"success"` or `"error"` |
| `error_type` | `string \| null` | Machine-readable error category on failure |
| `message` | `string \| null` | Human-readable error detail on failure |

### Validation Rules

- `question` must not be empty or whitespace-only. The validator strips leading/trailing whitespace.
- `top_k` must be an integer between 1 and 20 inclusive.

### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | Empty question, whitespace-only question, or invalid `top_k` |
| `422 Unprocessable Entity` | Pydantic validation failure (wrong field type, missing required field) |
| `503 Service Unavailable` | Missing Gemini API key, ChromaDB connection failure, or Gemini API error |
| `500 Internal Server Error` | Unexpected unhandled exception |

**Example `400` response:**

```json
{
  "error": "Bad Request",
  "detail": "Question cannot be empty or whitespace only."
}
```

**Example `422` response:**

```json
{
  "error": "Validation Error",
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "question"],
      "msg": "Field required"
    }
  ],
  "message": "One or more input fields failed validation."
}
```

---

## 3. `POST /recommend-colleges`

Recommends polytechnic and engineering colleges based on student merit rank, reservation category, and optional preferences. Results are classified into **Likely**, **Moderate**, and **Ambitious** tiers.

> [!WARNING]
> The college cutoff dataset (`data/college_cutoffs.csv`) ships as a schema-only file with no real DTE data. This endpoint will return empty recommendations until the dataset is populated with verified official DTE counseling records.

### Request Body

```json
{
  "rank": 2500,
  "category": "OBC",
  "preferred_course": "Civil Engineering",
  "preferred_location": "Jaipur",
  "top_k": 10
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `rank` | `integer` | ✅ | `> 0` | Student merit rank |
| `category` | `string` | ✅ | Non-empty; normalised to uppercase | Reservation category |
| `preferred_course` | `string \| null` | ❌ | — | Optional course name filter (substring match) |
| `preferred_location` | `string \| null` | ❌ | — | Optional district/city filter (substring match) |
| `top_k` | `integer` | ❌ | `1 ≤ top_k ≤ 50`, default `10` | Maximum recommendations to return |

**Valid category values:** `GEN`, `OBC`, `SC`, `ST`, `EWS`, `MBC`, `TFWS`, `PWD`  
(The validator also accepts `GENERAL` and normalises it to `GEN`.)

### Response `200 OK`

```json
{
  "student_rank": 2500,
  "category": "OBC",
  "preferred_course": "Civil Engineering",
  "preferred_location": "Jaipur",
  "disclaimer": "DISCLAIMER: These college recommendations and category classifications (Likely, Moderate, Ambitious) are indicative estimates based strictly on historical cutoff data. They do not guarantee admission. Actual cutoffs for the current academic session will vary based on total applicants, seat matrices, and official Rajasthan DTE centralized counseling rounds.",
  "total_recommendations": 1,
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
    "likely": [ /* CollegeRecommendationItem[] */ ],
    "moderate": [],
    "ambitious": []
  }
}
```

### Tier Classification Logic

| Tier | Condition |
|---|---|
| **Likely** | `student_rank ≤ historical_closing_rank` |
| **Moderate** | `student_rank ≤ historical_closing_rank × 1.2` |
| **Ambitious** | `student_rank > historical_closing_rank × 1.2` |

### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | Empty category, rank ≤ 0 |
| `422 Unprocessable Entity` | Wrong field types |
| `503 Service Unavailable` | Cutoff CSV file missing or unreadable |

---

## 4. `POST /predict-cutoff`

Estimates the projected closing rank for a specific college, course, and category for the upcoming admission session using multi-year linear trend analysis over historical records.

> [!WARNING]
> The dataset (`data/college_cutoffs.csv`) ships as a schema-only file. This endpoint returns `"confidence": "insufficient_data"` until historical records are loaded.

### Request Body

```json
{
  "college_id": "GPC_JAIPUR",
  "course_name": "Civil Engineering",
  "category": "GEN"
}
```

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `college_id` | `string` | ✅ | Non-empty | Unique institution identifier |
| `course_name` | `string` | ✅ | Non-empty | Exact course name as in the dataset |
| `category` | `string` | ✅ | Non-empty | Reservation category |

All three fields are stripped of whitespace. Empty or whitespace-only values are rejected with `400`.

### Response `200 OK`

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
  "disclaimer": "DISCLAIMER: This projected cutoff is an indicative mathematical estimate calculated from historical admission records. It is NOT an official cutoff published by the Department of Technical Education (DTE), Government of Rajasthan. Actual cutoffs will vary each academic session."
}
```

### Response Schema

| Field | Type | Description |
|---|---|---|
| `college_id` | `string` | Institution identifier (echoed) |
| `college_name` | `string` | Full institution name from dataset |
| `course_name` | `string` | Course name (echoed) |
| `category` | `string` | Category (echoed) |
| `estimated_closing_rank` | `integer \| null` | Projected rank, or `null` if insufficient data |
| `confidence` | `string` | `"High"` (≥3 years), `"Moderate"` (2 years), `"Low"` (1 year), `"insufficient_data"` |
| `trend` | `string` | `"increasing"`, `"decreasing"`, `"stable"`, or `"insufficient_data"` |
| `target_year` | `integer` | The projection year |
| `historical_records` | `HistoricalCutoffRecord[]` | Source records used for projection |
| `explanation` | `string` | Human-readable explanation of the calculation |
| `methodology` | `string` | Brief methodology statement |
| `disclaimer` | `string` | Mandatory disclaimer — not an official DTE cutoff |

### Error Responses

| Status | Condition |
|---|---|
| `400 Bad Request` | Any field empty or whitespace-only |
| `422 Unprocessable Entity` | Wrong field types |
| `503 Service Unavailable` | Cutoff CSV file missing or unreadable |

---

## Global Error Format

All error responses from the API follow one of two formats:

**Validation errors (`422`):**

```json
{
  "error": "Validation Error",
  "detail": [ /* Pydantic error list */ ],
  "message": "One or more input fields failed validation."
}
```

**All other errors (`400`, `500`, `503`):**

```json
{
  "error": "Bad Request" | "HTTP Error" | "Internal Server Error",
  "detail": "Human-readable description"
}
```

> [!NOTE]
> The `500 Internal Server Error` response never includes stack traces, exception messages, or API key fragments. All internal details are logged server-side only.
