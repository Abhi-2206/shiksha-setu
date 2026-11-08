# Shiksha Setu AI Service — Setup & Deployment Guide

> [!IMPORTANT]
> This service is a **research and development prototype**, not a production-ready system. Review all security considerations in Section 6 before exposing it beyond localhost.

---

## 1. Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Python | 3.10+ | Developed and tested on 3.14 |
| pip | Latest | Bundled with Python |
| Google Gemini API key | — | Free tier available at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Disk space | ~500 MB | For `.venv`, ChromaDB, and PyMuPDF ONNX models |
| Network | Required at runtime | Gemini API calls for embeddings and generation |

---

## 2. Local Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/Abhi-2206/shiksha-setu.git
cd shiksha-setu/ai-service
```

### Step 2 — Create the virtual environment

```bash
python3 -m venv .venv
```

> [!NOTE]
> The virtual environment is created inside `ai-service/.venv/`. It is excluded from Git by `.gitignore`. Never commit it.

### Step 3 — Activate the virtual environment

**macOS / Linux:**
```bash
source .venv/bin/activate
```

**Windows (CMD):**
```bat
.venv\Scripts\activate.bat
```

**Windows (PowerShell):**
```powershell
.venv\Scripts\Activate.ps1
```

### Step 4 — Install dependencies

```bash
pip install -r requirements.txt
```

This installs:

| Package | Purpose |
|---|---|
| `google-genai` | Gemini LLM and embedding API |
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server |
| `chromadb` | Vector database |
| `pymupdf` | PDF text extraction |
| `python-dotenv` | Environment variable loading |
| `pandas` | CSV data processing |
| `pydantic` | Request/response validation |

> [!NOTE]
> ChromaDB downloads ONNX tokeniser models on first run (~100–200 MB). An internet connection is required for the first startup.

---

## 3. Environment Variables

### Step 1 — Copy the template

```bash
cp .env.example .env
```

### Step 2 — Edit `.env`

```
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — defaults shown
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key. Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | ❌ | `gemini-2.5-flash` | Gemini model for chat generation |
| `GEMINI_EMBEDDING_MODEL` | ❌ | `gemini-embedding-001` | Gemini model for text embeddings |

> [!CAUTION]
> **Never commit `.env` to version control.** The `.gitignore` excludes it, but verify this with `git status` before every commit. A leaked API key must be revoked immediately at [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 4. Running the Service

All commands are run from the **repository root** (`shiksha-setu/`), not from inside `ai-service/`.

### Development mode (with auto-reload)

```bash
./ai-service/.venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload --app-dir ai-service
```

### Without auto-reload (more stable for testing)

```bash
./ai-service/.venv/bin/uvicorn api.main:app --host 127.0.0.1 --port 8000 --app-dir ai-service
```

The service starts at `http://localhost:8000`.

| URL | Description |
|---|---|
| `http://localhost:8000/health` | Health check |
| `http://localhost:8000/docs` | Interactive Swagger UI |
| `http://localhost:8000/redoc` | ReDoc API documentation |

### Quick health verification

```bash
curl http://localhost:8000/health
```

Expected output:
```json
{"status":"healthy","service":"Shiksha Setu AI Service","version":"1.0.0","description":"AI Student Assistance API for Department of Technical Education (DTE), Rajasthan"}
```

---

## 5. Document Ingestion (Populating the Knowledge Base)

Before the `/chat` endpoint can return grounded answers, official DTE PDF documents must be ingested into ChromaDB.

### Step 1 — Place PDF documents

Copy official DTE circulars, admission guidelines, and fee schedules into:

```
ai-service/knowledge_base/
```

### Step 2 — Run ingestion

An automated ingestion CLI is not yet implemented. As an interim approach, use the existing modules directly:

```python
from ingestion.pdf_loader import extract_text_from_pdf
from ingestion.text_chunker import chunk_document_pages
from embeddings.embedding_generator import generate_embeddings, get_gemini_client
from vector_store.chroma_store import get_chroma_client, get_or_create_collection, store_embeddings

# 1. Extract
pages = extract_text_from_pdf("knowledge_base/admission_guidelines_2024.pdf")

# 2. Chunk
chunks = chunk_document_pages(pages)

# 3. Embed
client = get_gemini_client()
chunks_with_embeddings = generate_embeddings(chunks, client)

# 4. Store
chroma = get_chroma_client()
collection = get_or_create_collection(chroma)
store_embeddings(collection, chunks_with_embeddings)
```

> [!NOTE]
> ChromaDB persists data to `ai-service/data/chroma_db/`. Add this directory to `.gitignore` before the first ingestion run to prevent accidentally committing large binary database files.

### Step 3 — Populate the cutoff dataset

The college recommendation and cutoff prediction endpoints require `ai-service/data/college_cutoffs.csv` to be populated with verified DTE counseling records. The file currently contains only the schema header:

```
college_id,college_name,location,course_name,category,admission_year,opening_rank,closing_rank,source,source_year
```

Add rows sourced exclusively from official DTE counseling rosters. Do not fabricate data.

---

## 6. Running Tests

All tests run without a live Gemini API key (Gemini calls are mocked in the test suite).

### Full test suite

```bash
./ai-service/.venv/bin/pytest ai-service/ -v
```

**Expected:** 139 passed, 7 deprecation warnings.

### Standalone PDF loader tests

```bash
./ai-service/.venv/bin/python ai-service/ingestion/test_pdf_loader.py
```

**Expected:** All 7 PDF Loader tests pass.

> [!NOTE]
> The 7 standalone PDF loader tests are already counted in the 139 pytest total. The two counts are not additive.

### Module-level tests

```bash
./ai-service/.venv/bin/pytest ai-service/ingestion/ -v
./ai-service/.venv/bin/pytest ai-service/embeddings/ -v
./ai-service/.venv/bin/pytest ai-service/vector_store/ -v
./ai-service/.venv/bin/pytest ai-service/retrieval/ -v
./ai-service/.venv/bin/pytest ai-service/chatbot/ -v
./ai-service/.venv/bin/pytest ai-service/recommendation/ -v
./ai-service/.venv/bin/pytest ai-service/api/ -v
./ai-service/.venv/bin/pytest ai-service/tests/ -v
./ai-service/.venv/bin/pytest ai-service/evaluation/ -v
```

---

## 7. Deployment Prerequisites

> [!IMPORTANT]
> The service is **not production-ready**. The following are minimum requirements before any public deployment.

### Must-have before deployment

| Requirement | Status | Notes |
|---|---|---|
| Authentication | ❌ Not implemented | Add API key header or OAuth 2.0 |
| Rate limiting | ❌ Not implemented | Protect Gemini API quota |
| HTTPS / TLS termination | ❌ Not implemented | Use a reverse proxy (nginx, Caddy) |
| Real cutoff dataset | ❌ Not populated | Must be populated from official DTE records |
| Knowledge base documents | ❌ Not ingested | Official DTE PDFs must be loaded |
| Secret management | ⚠️ `.env` only | Use a secrets manager (GCP Secret Manager, AWS Secrets Manager, Vault) in production |
| Logging and monitoring | ⚠️ stdout only | Add structured logging, metrics, and alerting |
| Health check endpoint | ✅ `/health` | Available |

### Recommended reverse proxy configuration (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 8. Security Considerations

### API key security

- Store `GEMINI_API_KEY` only in `.env` (local) or a secrets manager (production).
- Rotate the key immediately if it is ever exposed in logs, commits, or error messages.
- Use [Google AI Studio key restrictions](https://aistudio.google.com/app/apikey) to limit key scope.

### File exclusions

Verify `.gitignore` excludes:

```
.venv/
.env
__pycache__/
*.pyc
data/chroma_db/      # Add this before first ingestion
```

Before every commit, run `git status` to confirm no secrets or generated database files are staged.

### Error handling

The API catches all unhandled exceptions at the application layer and returns a fixed safe `500` message. Stack traces and internal error details are logged server-side only and never returned to HTTP clients.

### Prompt injection

The RAG system instruction instructs Gemini to treat the student's question as untrusted input and to never follow instructions contained within it. The student question is submitted as a user-turn message separated from the system instruction, reducing the attack surface for prompt injection.

### No PII storage

The service does not store student questions, embeddings, or generated answers persistently. ChromaDB stores only document chunk text and metadata derived from official DTE PDFs.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ValueError: GEMINI_API_KEY is not configured` | `.env` missing or key blank | Copy `.env.example` → `.env` and set your key |
| `/chat` returns empty `sources` | Knowledge base not ingested | Run the ingestion steps in Section 5 |
| `/recommend-colleges` returns empty list | Cutoff CSV empty | Populate `data/college_cutoffs.csv` with DTE data |
| ChromaDB ONNX download hangs | Slow internet on first run | Wait; models are ~100–200 MB and cached after first download |
| `FutureWarning: fitz API is deprecated` | PyMuPDF / Python 3.14 | Informational only; use `import pymupdf` in custom scripts |
| `DeprecationWarning: asyncio.iscoroutinefunction` | ChromaDB on Python 3.14 | Informational only; all tests pass |
| Port 8000 already in use | Another process on 8000 | Change `--port 8001` or stop the conflicting process |
