# ShikshaSetu Frontend Integration & Routing Architecture

## 1. Overview
The ShikshaSetu frontend application is built with React 19, Vite 8, and React Router 7 (`HashRouter`). It is fully compatible with both web browsers and the Electron desktop wrapper.

## 2. Route Architecture & Role Access

| Path | Component | Protected | Authorized Roles | Description |
|---|---|---|---|---|
| `/` | `HomePage` | No | Public | Landing page with platform overview and circular notices |
| `/login` | `LoginPage` | No | Public | Tabbed student registration and portal login |
| `/colleges` | `CollegesPage` | No | Public | Polytechnic institutions directory and diploma branch filter |
| `/cutoffs` | `CutoffPredictorPage` | No | Public | Historical cutoff analyzer and AI prediction model |
| `/chatbot` | `ChatbotPage` | No / Yes | Public / Student | RAG conversational assistant with session history and citations |
| `/dashboard` | `StudentDashboard` | Yes | Student | Academic overview, profile score, and counseling shortcuts |
| `/recommendations` | `RecommendationsPage`| No / Yes | Public / Student | Safe, Moderate, and Ambitious college seat recommendations |
| `/profile` | `ProfilePage` | Yes | Student | Personal info, 10th/12th percentages, and preference settings |
| `/admin` | `AdminDashboard` | Yes | Administrator | College creation, branch intake, and cutoff management |
| `/students` | `StudentPage` | Yes | Administrator | Full student records directory with search and CRUD modals |

## 3. API Integration Contracts
All frontend network requests are routed to the Express backend via `client/src/api.js`:
- **Base URL**: Resolves dynamically (`''` in Vite dev server with proxy to `:5001`; `http://localhost:5001` in Electron).
- **Authentication**: JWT token attached as `Authorization: Bearer <token>` automatically on every request.
- **Session Expiry**: Intercepts `401 Unauthorized` responses and fires the `auth:expired` event to reset local state and prompt re-login.
- **AI Service Proxy**: The browser never calls the FastAPI AI service or Google Gemini directly. All calls route through Express endpoints (`/api/ai/*`) which maintain session persistence, rate limits, and server-side timeouts.

## 4. Verification & Testing
- **Production Build**: Verified with `npm --prefix client run build` (passes with 0 errors).
- **Backend API Integration**: Verified with `npm test` (47 integration tests passing).
- **AI RAG Service**: Verified with `pytest ai-service/ -q` (139 unit and integration tests passing).
