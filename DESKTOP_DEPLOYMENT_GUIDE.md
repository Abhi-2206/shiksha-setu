# ShikshaSetu — Desktop Application & AI Deployment Guide

**ShikshaSetu** is an official AI-powered student assistance platform designed for the Department of Technical Education (DTE), Government of Rajasthan.

This guide outlines the system architecture, service prerequisites, environment variables, development workflows, production building, and macOS `.dmg` packaging instructions.

---

## 1. System Architecture Overview

The ShikshaSetu platform consists of three coordinated tiers:

```
┌────────────────────────────────────────────────────────┐
│     Desktop Application (Electron + React 19 + Vite)   │
│     - HashRouter for seamless file:// protocol loading │
│     - Secure contextIsolation, sandbox & preload bridge│
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST (fetch)
                           ▼
┌────────────────────────────────────────────────────────┐
│     Backend API Service (Node.js + Express.js :5001)   │
│     - JWT authentication, Student directory, CORS      │
│     - Chat session history management                  │
└──────────────┬──────────────────────────┬──────────────┘
               │ Prisma ORM               │ HTTP Proxy (:8000)
               ▼                          ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│ PostgreSQL Database :5432 │ │ Python FastAPI AI Service│
│ - Users, Profiles, Cutoffs│ │ - ChromaDB RAG Retriever │
│ - Chat Sessions & Messages│ │ - Gemini Grounded LLM    │
└───────────────────────────┘ └──────────────────────────┘
```

---

## 2. Dependency Installation

### A. Root Backend Dependencies
```bash
cd /Users/abhigyanganguly/Documents/shikshaSetu
npm install
```

### B. Client & Electron Desktop Dependencies
```bash
cd /Users/abhigyanganguly/Documents/shikshaSetu/client
npm install
```

### C. Python AI Service Dependencies
```bash
cd /Users/abhigyanganguly/Documents/shikshaSetu/ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 3. Environment Configuration

### Root `.env` (Express Backend)
Location: `/.env`
```env
PORT=5001
DATABASE_URL="postgresql://postgres:password@localhost:5432/shiksha_setu"
JWT_SECRET="shikshasetu_super_secret_jwt_key_2026_rajasthan"
AI_SERVICE_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"
```

### Client Environment Files
- **Development** (`client/.env.development`):
  ```env
  # Left empty so Vite proxy forwards /api -> http://localhost:5001
  VITE_API_BASE=
  ```
- **Production** (`client/.env.production`):
  ```env
  # Injected during npm run build so Electron points directly to Express
  VITE_API_BASE=http://localhost:5001
  ```

### AI Service Environment (FastAPI)
Set your Google Gemini API key:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

---

## 4. Starting Supporting Services

### Step 1: Start PostgreSQL
```bash
# macOS Homebrew service
brew services start postgresql@14
# or standard PostgreSQL service
brew services start postgresql
```

### Step 2: Start the Express Backend
```bash
cd /Users/abhigyanganguly/Documents/shikshaSetu
npm start
# Server starts on port 5001 (Health check: http://localhost:5001/api/health)
```

### Step 3: Start the Python AI RAG Service
```bash
cd /Users/abhigyanganguly/Documents/shikshaSetu/ai-service
source venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8000
# AI Service runs on port 8000 (Health check: http://localhost:8000/health)
```

---

## 5. Running the Desktop Application in Development

To run with Hot Module Replacement (HMR) and developer tools:

```bash
# Terminal 1 — Start Vite Dev Server
cd client
npm run dev

# Terminal 2 — Start Electron Development Process (after Terminal 1 is ready)
cd client
npm run electron:dev
```

---

## 6. Building the Production React Application

The production build uses `base: './'` in `vite.config.js` to ensure all bundle assets have relative paths suitable for the `file://` protocol:

```bash
cd client
npm run build
```
Output files are generated into `client/dist/`.

To test the built production files directly inside Electron:
```bash
cd client
npm run electron:prod
```

---

## 7. Generating the macOS DMG Installer

Electron Builder packages the production React app, main process, and preload script into a standalone macOS disk image (`.dmg`).

### Build Command
```bash
cd client
npm run electron:build
```

### Output Location
```
client/release/ShikshaSetu-1.0.0-arm64.dmg
```

To install:
1. Double-click the generated `.dmg` file in Finder.
2. Drag `ShikshaSetu.app` into your `Applications` folder.
3. Launch `ShikshaSetu` from Launchpad or Applications.

---

## 8. Service Connectivity Summary

| Tier | Host & Port | Role | Required for Desktop? |
|---|---|---|---|
| **Electron UI** | Native macOS Window | Student Portal & Admin Console | Primary Interface |
| **Express Backend** | `http://localhost:5001` | Auth, Student Profiles, Proxy | Yes (for dynamic data) |
| **PostgreSQL** | `localhost:5432` | Relational Storage | Yes (database persistence) |
| **FastAPI Service** | `http://localhost:8000` | RAG Chatbot, ChromaDB | Yes (for AI features) |
