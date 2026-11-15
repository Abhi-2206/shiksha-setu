# Shiksha Setu — Backend API Reference

Comprehensive specification of all REST API endpoints for the **Shiksha Setu AI Student Assistance System** (Department of Technical Education, Government of Rajasthan).

---

## 1. Overview & Base URLs

| Service | Environment | Base URL |
|---|---|---|
| **Express Backend API** | Local Development | `http://localhost:5001` |
| **FastAPI AI Service** | Local Development | `http://localhost:8000` |
| **Frontend Client** | Vite Dev Server | `http://localhost:5173` |

### Authentication
Protected endpoints require an `Authorization` header containing a valid JSON Web Token:
```http
Authorization: Bearer <your_jwt_token>
```
Tokens are issued upon successful login at `POST /api/auth/login` with a 24-hour expiration.

---

## 2. Authentication Endpoints (`/api/auth`)

### 2.1 Register User
- **Method / Route:** `POST /api/auth/signup`
- **Access:** Public
- **Description:** Registers a new student account. Role is strictly assigned to `'STUDENT'`.
- **Request Body:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul.sharma@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "role": "STUDENT",
    "createdAt": "2026-11-15T05:00:00.000Z"
  }
}
```

### 2.2 Authenticate & Issue JWT
- **Method / Route:** `POST /api/auth/login`
- **Access:** Public
- **Description:** Validates credentials and returns JWT bearer token containing `id`, `email`, and `role`.
- **Request Body:**
```json
{
  "email": "rahul.sharma@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "role": "STUDENT",
    "createdAt": "2026-11-15T05:00:00.000Z"
  }
}
```

### 2.3 Current User Info
- **Method / Route:** `GET /api/auth/me`
- **Access:** 🔒 Authenticated
- **Response (`200 OK`):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "role": "STUDENT",
    "createdAt": "2026-11-15T05:00:00.000Z"
  }
}
```

---

## 3. Student Profile Endpoints (`/api/student`)

### 3.1 Get Logged-in Student Profile
- **Method / Route:** `GET /api/student/profile`
- **Access:** 🔒 Authenticated Student
- **Description:** Fetches profile for the authenticated student (`req.user.id`).
- **Response (`200 OK`):**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "userId": 1,
    "fullName": "Rahul Sharma",
    "phoneNumber": "9876543210",
    "alternatePhone": "9876543211",
    "dateOfBirth": "2006-05-15T00:00:00.000Z",
    "gender": "Male",
    "address": "123 Tonk Road",
    "district": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302015",
    "isRajasthanDomicile": true,
    "qualifyingExam": "Class 10",
    "tenthPercentage": 86.5,
    "twelfthPercentage": null,
    "diplomaPercentage": null,
    "examRank": 2450,
    "examRollNumber": "DTE-2024-8891",
    "category": "OBC",
    "subCategory": null,
    "preferredCourse": "Civil Engineering",
    "preferredLocation": "Jaipur",
    "preferredCollegeType": "Government",
    "createdAt": "2026-11-15T05:05:00.000Z",
    "updatedAt": "2026-11-15T05:05:00.000Z",
    "user": {
      "id": 1,
      "name": "Rahul Sharma",
      "email": "rahul.sharma@example.com",
      "role": "STUDENT"
    }
  }
}
```

### 3.2 Create or Update Profile
- **Method / Route:** `POST /api/student/profile` (or `PUT /api/student/profile`)
- **Access:** 🔒 Authenticated Student
- **Description:** Upserts the student profile. Prevents unauthorized role modification.
- **Request Body:**
```json
{
  "fullName": "Rahul Sharma",
  "phoneNumber": "9876543210",
  "district": "Jaipur",
  "state": "Rajasthan",
  "isRajasthanDomicile": true,
  "category": "OBC",
  "qualifyingExam": "Class 10",
  "tenthPercentage": 86.5,
  "examRank": 2450,
  "preferredCourse": "Civil Engineering",
  "preferredLocation": "Jaipur",
  "preferredCollegeType": "Government"
}
```

### 3.3 Get Profile by User ID
- **Method / Route:** `GET /api/student/profile/:userId`
- **Access:** 🔒 Authenticated (Self or Admin)
- **Description:** Verifies `req.user.id === targetUserId` or `req.user.role === 'ADMIN'`. Cross-user tampering rejected with `403 Forbidden`.

---

## 4. Chat Endpoints (`/api/chat`)

### 4.1 Create Chat Session
- **Method / Route:** `POST /api/chat/sessions`
- **Access:** 🔒 Authenticated
- **Request Body:**
```json
{
  "title": "Admissions Cutoff Query"
}
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Chat session created successfully",
  "session": {
    "id": "c1a93e50-9942-4f81-80a5-f865d14dfb01",
    "userId": 1,
    "title": "Admissions Cutoff Query",
    "createdAt": "2026-11-15T05:10:00.000Z",
    "updatedAt": "2026-11-15T05:10:00.000Z",
    "messages": []
  }
}
```

### 4.2 List Sessions
- **Method / Route:** `GET /api/chat/sessions`
- **Access:** 🔒 Authenticated
- **Response (`200 OK`):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "c1a93e50-9942-4f81-80a5-f865d14dfb01",
      "userId": 1,
      "title": "Admissions Cutoff Query",
      "createdAt": "2026-11-15T05:10:00.000Z",
      "_count": { "messages": 2 }
    }
  ]
}
```

### 4.3 Get Session with Messages
- **Method / Route:** `GET /api/chat/sessions/:id`
- **Access:** 🔒 Authenticated (Owner or Admin)
- **Description:** Returns session and chronological transcripts. Non-owners receive `403 Forbidden`.

### 4.4 Append Message
- **Method / Route:** `POST /api/chat/sessions/:id/messages`
- **Access:** 🔒 Authenticated (Owner or Admin)
- **Request Body:**
```json
{
  "content": "What are the required documents for polytechnic diploma counseling?",
  "senderType": "STUDENT"
}
```

### 4.5 Delete Session
- **Method / Route:** `DELETE /api/chat/sessions/:id`
- **Access:** 🔒 Authenticated (Owner or Admin)
- **Description:** Cascades deletion to all session messages.

---

## 5. AI Service Integration Endpoints (`/api/ai`)

Express communicates server-side with FastAPI (`AI_SERVICE_URL`) protecting keys and preserving upstream contracts.

### 5.1 AI Grounded Chatbot
- **Method / Route:** `POST /api/ai/chat`
- **Access:** 🔒 Authenticated
- **Description:** Proxies student question to Gemini RAG chatbot. If `sessionId` is provided, automatically records both user utterance and AI response with source citations into the database.
- **Request Body:**
```json
{
  "question": "What is the eligibility for polytechnic diploma in Rajasthan?",
  "top_k": 5,
  "sessionId": "c1a93e50-9942-4f81-80a5-f865d14dfb01"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "answer": "Admission requires candidates to have passed Class 10 with Science and Mathematics from a recognized board with minimum 35% marks.",
  "sources": [
    {
      "document_name": "admission_guidelines_2024.pdf",
      "page_number": 3,
      "source_path": "/data/admission_guidelines_2024.pdf"
    }
  ],
  "sessionId": "c1a93e50-9942-4f81-80a5-f865d14dfb01",
  "status": "success"
}
```

### 5.2 College Recommendations
- **Method / Route:** `POST /api/ai/recommend-colleges`
- **Access:** 🔒 Authenticated
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
- **Response (`200 OK`):**
```json
{
  "success": true,
  "student_rank": 2500,
  "category": "OBC",
  "preferred_course": "Civil Engineering",
  "preferred_location": "Jaipur",
  "disclaimer": "DISCLAIMER: These college recommendations... are indicative estimates based strictly on historical cutoff data...",
  "total_recommendations": 2,
  "recommendations": [...],
  "categorized": {
    "likely": [...],
    "moderate": [...],
    "ambitious": [...]
  }
}
```

### 5.3 Cutoff Trend Prediction
- **Method / Route:** `POST /api/ai/predict-cutoff`
- **Access:** 🔒 Authenticated
- **Request Body:**
```json
{
  "college_id": "GPC_JAIPUR",
  "course_name": "Civil Engineering",
  "category": "GEN"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "college_id": "GPC_JAIPUR",
  "college_name": "Government Polytechnic College Jaipur",
  "course_name": "Civil Engineering",
  "category": "GEN",
  "estimated_closing_rank": 2950,
  "confidence": "High",
  "trend": "increasing",
  "target_year": 2025,
  "historical_records": [...],
  "explanation": "Projected using linear trend estimation across historical sessions.",
  "disclaimer": "DISCLAIMER: Indicative estimate calculated from historical admission records."
}
```

---

## 6. College and Cutoff Management Endpoints (`/api/colleges`, `/api/cutoffs`)

### 6.1 List Colleges
- **Method / Route:** `GET /api/colleges`
- **Access:** Public / Authenticated
- **Query Parameters:** `location`, `district`, `type`, `isActive`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "count": 1,
  "colleges": [
    {
      "id": 1,
      "code": "GPC_JAIPUR",
      "name": "Government Polytechnic College Jaipur",
      "location": "Jaipur",
      "district": "Jaipur",
      "state": "Rajasthan",
      "type": "Government",
      "establishedYear": 1959,
      "isActive": true
    }
  ]
}
```

### 6.2 Get College Details
- **Method / Route:** `GET /api/colleges/:id`
- **Access:** Public / Authenticated

### 6.3 Create College (Admin Only)
- **Method / Route:** `POST /api/colleges`
- **Access:** 🔒 Admin Only (`requireAdmin`)
- **Headers:** `Authorization: Bearer <admin_jwt_token>`
- **Non-admin attempt:** `403 Forbidden`

### 6.4 Update College (Admin Only)
- **Method / Route:** `PUT /api/colleges/:id`
- **Access:** 🔒 Admin Only (`requireAdmin`)

### 6.5 Delete College (Admin Only)
- **Method / Route:** `DELETE /api/colleges/:id`
- **Access:** 🔒 Admin Only (`requireAdmin`)

### 6.6 Query Cutoffs
- **Method / Route:** `GET /api/cutoffs`
- **Access:** Public / Authenticated
- **Query Parameters:** `collegeId`, `courseName`, `category`, `admissionYear`, `maxClosingRank`

### 6.7 Add Cutoff Record (Admin Only)
- **Method / Route:** `POST /api/cutoffs`
- **Access:** 🔒 Admin Only (`requireAdmin`)
- **Request Body:**
```json
{
  "collegeId": 1,
  "courseName": "Civil Engineering",
  "category": "GEN",
  "admissionYear": 2024,
  "openingRank": 500,
  "closingRank": 2800,
  "round": 1,
  "source": "DTE Rajasthan Official Cutoff 2024"
}
```

---

## 7. Error Handling Standard

All API errors return consistent JSON:

```json
{
  "success": false,
  "message": "Human-readable explanation of the error",
  "errors": ["Optional list of validation errors"]
}
```

| HTTP Status | Meaning |
|---|---|
| `400 Bad Request` | Missing required field, malformed ID, or validation failure |
| `401 Unauthorized` | Missing, expired, or invalid JWT bearer token |
| `403 Forbidden` | Authenticated user lacks permission (e.g. student modifying admin resource or another student's profile) |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Unique constraint violation (e.g. duplicate email, duplicate cutoff) |
| `503 Service Unavailable` | Downstream dependency failure (FastAPI service offline or DB unavailable) |
| `504 Gateway Timeout` | Downstream AI service request timed out |
