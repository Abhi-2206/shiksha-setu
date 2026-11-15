# Shiksha Setu AI Service

AI Student Assistance Backend for the **Department of Technical Education (DTE), Government of Rajasthan**.

> [!IMPORTANT]
> This service is a **research and development prototype**. It is not production-ready. The college cutoff dataset ships as a schema-only CSV with no real DTE admission data. All RAG answers and cutoff projections carry explicit disclaimers and must not be treated as official DTE guidance.

---

## Features

| Feature | Description |
|---|---|
| **RAG Chatbot** | Answers student questions grounded strictly in official DTE PDF documents using Gemini |
| **Semantic Retrieval** | Vector similarity search over ChromaDB using Gemini embeddings |
| **College Recommendations** | Merit-rank-based college guidance categorised as Likely / Moderate / Ambitious |
| **Cutoff Prediction** | Transparent linear trend projection from historical closing-rank records |
| **REST API** | FastAPI with Pydantic validation, OpenAPI docs, and structured error responses |

---

## Architecture Overview

```
PDF Documents
     │
     ▼
[PDF Loader] ──► [Text Chunker] ──► [Embedding Generator] ──► [ChromaDB Vector Store]
                                           (Gemini)               (shiksha_setu_knowledge)
                                                                          │
Student Question ──► [Retriever] ◄────────────────────────────────────────
                          │
                          ▼
                  [RAG Generator] ──► [Gemini LLM] ──► Grounded Answer + Sources
                          │
                    [FastAPI Layer]
                    /chat  /recommend-colleges  /predict-cutoff  /health
```

Full architecture details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Technology Stack

| Component | Library / Service |
|---|---|
| LLM & Embeddings | Google Gemini (`google-genai`) — `gemini-2.5-flash` / `gemini-embedding-001` |
| Vector Store | ChromaDB (persistent on-disk) |
| PDF Extraction | PyMuPDF (`pymupdf`) |
| REST API | FastAPI + Uvicorn |
| Validation | Pydantic v2 |
| Data Processing | pandas |
| Environment | python-dotenv |
| Testing | pytest |

---

## Project Structure

```
ai-service/
├── .env.example                  # Environment variable template
├── .gitignore                    # Excludes .env, .venv, __pycache__, *.pyc
├── requirements.txt              # Python dependencies
├── README.md                     # This file
│
├── api/                          # FastAPI application
│   ├── main.py                   # App entrypoint, routes, error handlers
│   ├── schemas.py                # Pydantic request/response models
│   └── test_api.py               # API endpoint tests
│
├── ingestion/                    # Document ingestion
│   ├── pdf_loader.py             # PDF → page-level text extraction (PyMuPDF)
│   ├── text_chunker.py           # Page text → overlapping chunks
│   ├── test_pdf_loader.py        # PDF loader tests (pytest + standalone)
│   └── test_text_chunker.py      # Chunker tests
│
├── embeddings/                   # Embedding generation
│   ├── embedding_generator.py    # Gemini embedding-001 integration
│   └── test_embedding_generator.py
│
├── vector_store/                 # ChromaDB integration
│   ├── chroma_store.py           # Persistent ChromaDB client + upsert logic
│   └── test_chroma_store.py      # ChromaDB storage tests
│
├── retrieval/                    # Semantic retrieval
│   ├── retriever.py              # retrieve_relevant_chunks() — vector search
│   └── test_retriever.py         # Retrieval tests
│
├── chatbot/                      # RAG chatbot
│   ├── generator.py              # ask_chatbot() — RAG pipeline + Gemini generation
│   ├── prompt.py                 # System instructions for grounded responses
│   └── test_chatbot.py           # Chatbot unit tests
│
├── recommendation/               # College advisory
│   ├── college_recommender.py    # recommend_colleges() — rank-based filtering
│   ├── cutoff_predictor.py       # predict_cutoff() — linear trend projection
│   ├── test_college_recommender.py
│   └── test_cutoff_predictor.py
│
├── data/
│   └── college_cutoffs.csv       # Schema-only cutoff dataset (no real DTE data)
│
├── knowledge_base/               # Place DTE PDF documents here for ingestion
│
├── tests/
│   └── test_e2e.py               # End-to-end pipeline tests
│
├── evaluation/
│   ├── benchmark_dataset.json    # Synthetic RAG evaluation queries
│   ├── evaluator.py              # Offline RAG quality evaluator
│   ├── test_evaluation.py        # Evaluation framework tests
│   └── EVALUATION_REPORT.md      # RAG quality benchmark results
│
└── docs/
    ├── ARCHITECTURE.md           # System design and data-flow diagrams
    ├── API_REFERENCE.md          # Endpoint reference with request/response examples
    └── SETUP_AND_DEPLOYMENT.md   # Local setup and deployment guide
```

---

## Installation & Environment Setup

### Prerequisites

- Python 3.10 or later
- A valid [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone the repository

```bash
git clone https://github.com/Abhi-2206/shiksha-setu.git
cd shiksha-setu/ai-service
```

### 2. Create and activate the virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate.bat     # Windows CMD
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

> [!CAUTION]
> Never commit `.env` to version control. It is listed in `.gitignore`. Keep your API key secret.

---

## Running the API Service

The AI service supports dynamic `PORT` and `HOST` configuration for production container deployments.

- `PORT`: Server port (default: `8000`). Cloud platforms (Render, Railway, Heroku, Cloud Run) provide this automatically. Must be an integer between 1 and 65535.
- `HOST`: Server interface (default: `0.0.0.0`). Binds to all interfaces, as required for container ingress.

### Direct Python Startup (Recommended)
Reads `PORT` and `HOST` directly from the environment without relying on shell parameter expansion:

**From project root (`shiksha-setu/`):**
```bash
python3 ai-service/api/main.py
```

**From inside `ai-service/`:**
```bash
python3 api/main.py
```

### Uvicorn CLI Startup
```bash
# Development mode with auto-reload (from project root):
./ai-service/.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --app-dir ai-service

# Dynamic port via shell parameter expansion (where shell is supported):
uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir ai-service
```
*(Note: Shell parameter expansion `${PORT:-8000}` requires an active shell environment. For cloud dashboards without shell expansion, use `python3 ai-service/api/main.py` directly).*

The service starts at `http://localhost:8000` (or `http://localhost:<PORT>`).

| URL | Description |
|---|---|
| `http://localhost:8000/health` | Health check |
| `http://localhost:8000/docs` | Interactive Swagger UI |
| `http://localhost:8000/redoc` | ReDoc API reference |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health and version |
| `POST` | `/chat` | RAG chatbot — grounded student Q&A |
| `POST` | `/recommend-colleges` | College recommendations by rank and category |
| `POST` | `/predict-cutoff` | Historical cutoff trend projection |

Full request/response documentation: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)

---

## Testing

### Run the full test suite

```bash
./ai-service/.venv/bin/pytest ai-service/ -v
```

**Expected result:** 139 tests pass, 7 deprecation warnings (Python 3.14 / ChromaDB / PyMuPDF).

### Run the standalone PDF loader tests

```bash
./ai-service/.venv/bin/python ai-service/ingestion/test_pdf_loader.py
```

**Expected result:** All 7 PDF Loader tests pass.

> [!NOTE]
> The 7 standalone PDF loader tests are a subset already counted in the 139 pytest total. Do not add them together.

### Run tests for a specific module

```bash
# Embeddings only
./ai-service/.venv/bin/pytest ai-service/embeddings/ -v

# ChromaDB store only
./ai-service/.venv/bin/pytest ai-service/vector_store/ -v

# End-to-end tests only
./ai-service/.venv/bin/pytest ai-service/tests/ -v
```

---

## RAG Evaluation

Run the offline RAG quality evaluator (uses mocked Gemini responses — no live API call required):

```bash
./ai-service/.venv/bin/pytest ai-service/evaluation/ -v
```

Review the benchmark report: [`evaluation/EVALUATION_REPORT.md`](evaluation/EVALUATION_REPORT.md)

Evaluation metrics (offline benchmark on 8 synthetic queries):

| Metric | Result |
|---|---|
| Retrieval Precision @3 | 100% (5/5 answerable queries) |
| Source Citation Coverage | 100% (5/5) |
| Response Grounding Rate | 100% (8/8 total) |
| Disclaimer Accuracy | 100% (3/3 unanswerable) |

> [!WARNING]
> These benchmarks are measured on **synthetic evaluation fixtures**, not on live DTE documents. Results on real official PDF circulars may differ due to multi-column tables, scanned image pages, or mixed Hindi-English rosters requiring dedicated OCR preprocessing.

---

## Known Limitations

1. **No real DTE cutoff data.** `ai-service/data/college_cutoffs.csv` contains only the schema header. College recommendation and cutoff prediction endpoints require this file to be populated with verified official DTE counseling data via an administrative ingestion pipeline before they will return useful results.

2. **Knowledge base is empty by default.** Place official DTE PDF documents in `ai-service/knowledge_base/` and run an ingestion script (not yet implemented as a CLI command) to populate ChromaDB before the `/chat` endpoint can retrieve grounded context.

3. **Offline evaluation only.** The RAG evaluation suite uses mocked Gemini API responses. Periodic live spot-tests against real DTE documents should be run during staged rollouts.

4. **No authentication.** The API has no authentication layer. Do not expose it to the public internet without adding auth (e.g., API key header, OAuth).

5. **No rate limiting.** The service does not implement request throttling. Gemini API quota limits apply upstream.

6. **Python 3.14 deprecation warnings.** ChromaDB and PyMuPDF emit deprecation warnings on Python 3.14 (`asyncio.iscoroutinefunction`, `fitz` import). These are library-level issues; all tests pass.

7. **Linear trend projection only.** `predict_cutoff` uses a simple linear regression over historical closing ranks. It does not account for seat-matrix changes, policy shifts, or year-on-year applicant volume changes.

---

## Security Notes

- `.env` and `.venv/` are excluded from Git via `.gitignore`.
- Generated ChromaDB database files (`ai-service/data/chroma_db/`) must not be committed.
- The API catches and logs all unhandled exceptions without leaking stack traces or API keys to HTTP responses.
- See [`docs/SETUP_AND_DEPLOYMENT.md`](docs/SETUP_AND_DEPLOYMENT.md) for full security considerations.
