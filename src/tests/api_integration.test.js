/**
 * Comprehensive Backend API Integration Test Suite.
 * Tests HTTP endpoints, JWT authentication, role verification, ownership checks,
 * AI proxy error handling, CORS headers, and college/cutoff management.
 * 
 * Uses isolated test database: shiksha_setu_test
 */
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../server");
const prisma = require("../lib/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "shiksha_setu_super_secret_jwt_key_2026_dev_env";

let server;
let baseUrl;
let studentToken;
let studentUser;
let student2Token;
let student2User;
let adminToken;
let adminUser;

describe("Backend API Integration Tests", () => {
  before(async () => {
    // Start Express app on dynamic available port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Clean test database tables
    await prisma.chatMessage.deleteMany({});
    await prisma.chatSession.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    await prisma.collegeCutoff.deleteMany({});
    await prisma.college.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash("Password123!", 10);

    // Create student 1
    studentUser = await prisma.user.create({
      data: {
        name: "Aman Verma",
        email: "aman.verma@example.com",
        password: passwordHash,
        role: "STUDENT",
      },
    });
    studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: studentUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Create student 2 (for cross-user tampering checks)
    student2User = await prisma.user.create({
      data: {
        name: "Neha Joshi",
        email: "neha.joshi@example.com",
        password: passwordHash,
        role: "STUDENT",
      },
    });
    student2Token = jwt.sign(
      { id: student2User.id, email: student2User.email, role: student2User.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Create admin
    adminUser = await prisma.user.create({
      data: {
        name: "DTE Officer",
        email: "officer.dte@rajasthan.gov.in",
        password: passwordHash,
        role: "ADMIN",
      },
    });
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
  });

  after(async () => {
    await prisma.chatMessage.deleteMany({});
    await prisma.chatSession.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    await prisma.collegeCutoff.deleteMany({});
    await prisma.college.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();

    await new Promise((resolve) => server.close(resolve));
  });

  // ==========================================================================
  // 1. Health & CORS Tests
  // ==========================================================================
  describe("Health & CORS Headers", () => {
    it("GET /api/health should return 200 with service info", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.match(data.message, /running successfully/i);
    });

    it("should allow requests from authorized Vite origin", async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: "http://localhost:5173" },
      });
      assert.strictEqual(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
      assert.strictEqual(res.headers.get("access-control-allow-credentials"), "true");
    });
  });

  // ==========================================================================
  // 2. Authentication APIs
  // ==========================================================================
  describe("Authentication Endpoints", () => {
    it("POST /api/auth/signup should register a new student", async () => {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Kavita Rao",
          email: "kavita.rao@example.com",
          password: "SecurePass123!",
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.role, "STUDENT");
    });

    it("POST /api/auth/login should authenticate and return token with role", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "aman.verma@example.com",
          password: "Password123!",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);

      const decoded = jwt.verify(data.token, JWT_SECRET);
      assert.strictEqual(decoded.role, "STUDENT");
    });

    it("GET /api/auth/me should reject request without token (401)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(res.status, 401);
    });

    it("GET /api/auth/me should return authenticated user details", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.user.email, "aman.verma@example.com");
    });
  });

  // ==========================================================================
  // 3. Student Profile APIs
  // ==========================================================================
  describe("Student Profile Endpoints", () => {
    it("POST /api/student/profile should create a student profile", async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          fullName: "Aman Verma",
          phoneNumber: "9876543210",
          district: "Jaipur",
          state: "Rajasthan",
          category: "OBC",
          qualifyingExam: "Class 10",
          tenthPercentage: 88.5,
          examRank: 1950,
          preferredCourse: "Civil Engineering",
          preferredLocation: "Jaipur",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.profile.examRank, 1950);
      assert.strictEqual(data.profile.category, "OBC");
    });

    it("GET /api/student/profile should retrieve the logged-in student's profile", async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.profile.fullName, "Aman Verma");
    });

    it("GET /api/student/profile/:userId should reject cross-user access (403)", async () => {
      // student 2 attempting to view student 1's profile
      const res = await fetch(`${baseUrl}/api/student/profile/${studentUser.id}`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /not authorized/i);
    });

    it("GET /api/student/profile/:userId should allow admin to view student profile", async () => {
      const res = await fetch(`${baseUrl}/api/student/profile/${studentUser.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.profile.fullName, "Aman Verma");
    });

    it("POST /api/student/profile should validate percentages and category", async () => {
      const res = await fetch(`${baseUrl}/api/student/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          category: "INVALID_CAT",
          tenthPercentage: 150.0,
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.errors.length >= 2);
    });

    // ==========================================================================
    // Student Directory & Admin Endpoints (Contribution 1)
    // ==========================================================================
    it("GET /api/students should reject unauthenticated request (401)", async () => {
      const res = await fetch(`${baseUrl}/api/students`);
      assert.strictEqual(res.status, 401);
    });

    it("GET /api/students should reject student request with 403", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Admin role required/i);
    });

    it("GET /api/students should allow admin to list students (200)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data));
    });

    it("GET /api/students/:id should reject unauthenticated request (401)", async () => {
      const res = await fetch(`${baseUrl}/api/students/${studentUser.id}`);
      assert.strictEqual(res.status, 401);
    });

    it("GET /api/students/:id should reject student request with 403", async () => {
      const res = await fetch(`${baseUrl}/api/students/${studentUser.id}`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Admin role required/i);
    });

    it("GET /api/students/:id should allow admin to retrieve student by ID (200)", async () => {
      const res = await fetch(`${baseUrl}/api/students/${studentUser.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.student.id, studentUser.id);
    });

    it("GET /api/students/:id with non-numeric ID should return 400", async () => {
      const res = await fetch(`${baseUrl}/api/students/not-a-number`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Invalid ID");
    });

    it("GET /api/students/:id with non-existent numeric ID should return 404", async () => {
      const res = await fetch(`${baseUrl}/api/students/999999`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Student not found");
    });

    // ==========================================================================
    // Student Creation Validation Tests (Contribution 2)
    // ==========================================================================
    it("POST /api/students should reject unauthenticated request (401)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Direct Student",
          email: "direct.student@example.com",
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 401);
    });

    it("POST /api/students should reject student token with 403", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          name: "Direct Student",
          email: "student.denied@example.com",
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Admin role required/i);
    });

    it("POST /api/students should reject missing name (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: "missing.name@example.com",
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(Array.isArray(data.errors));
      assert.ok(data.errors.some((e) => /name/i.test(e)));
    });

    it("POST /api/students should reject missing email (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Missing Email",
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(Array.isArray(data.errors));
      assert.ok(data.errors.some((e) => /email/i.test(e)));
    });

    it("POST /api/students should reject missing password (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Missing Password",
          email: "missing.password@example.com",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(Array.isArray(data.errors));
      assert.ok(data.errors.some((e) => /password/i.test(e)));
    });

    it("POST /api/students should reject whitespace-only name (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "     ",
          email: "whitespace.name@example.com",
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /name/i.test(e)));
    });

    it("POST /api/students should reject invalid email format (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Invalid Email Format",
          email: "not-an-email-at-all",
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /email/i.test(e)));
    });

    it("POST /api/students should reject non-string name or email (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 99999,
          email: true,
          password: "Password123!",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /name/i.test(e)));
      assert.ok(data.errors.some((e) => /email/i.test(e)));
    });

    it("POST /api/students should reject password below minimum length of 6 characters (400)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Short Pass",
          email: "short.pass@example.com",
          password: "123",
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /password/i.test(e)));
    });

    it("POST /api/students should allow admin to create student with valid inputs (201)", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "  Rohan Gupta  ",
          email: "  ROHAN.GUPTA@example.com  ",
          password: "SecurePassword123!",
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, "Student created successfully");
      assert.strictEqual(data.student.name, "Rohan Gupta");
      assert.strictEqual(data.student.email, "rohan.gupta@example.com");
      assert.ok(data.student.id);
    });

    it("POST /api/students should reject role override attempts and enforce STUDENT role", async () => {
      const res = await fetch(`${baseUrl}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Sneha Patel",
          email: "sneha.patel@example.com",
          password: "SecurePassword123!",
          role: "ADMIN",
          id: 7777,
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.notStrictEqual(data.student.id, 7777);

      const createdUser = await prisma.user.findUnique({
        where: { id: data.student.id },
      });
      assert.strictEqual(createdUser.role, "STUDENT");
    });
  });

  // ==========================================================================
  // 4. Chat APIs
  // ==========================================================================
  describe("Chat Endpoints", () => {
    let testSessionId;

    it("POST /api/chat/sessions should create a new chat session", async () => {
      const res = await fetch(`${baseUrl}/api/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ title: "Polytechnic Cutoffs 2024" }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.session.id);
      testSessionId = data.session.id;
    });

    it("GET /api/chat/sessions should list the student's sessions", async () => {
      const res = await fetch(`${baseUrl}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.sessions.length >= 1);
    });

    it("POST /api/chat/sessions/:id/messages should append student message", async () => {
      const res = await fetch(`${baseUrl}/api/chat/sessions/${testSessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          content: "What are the reservation quotas?",
          senderType: "STUDENT",
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.message.content, "What are the reservation quotas?");
    });

    it("GET /api/chat/sessions/:id should reject student B from reading student A's session (403)", async () => {
      const res = await fetch(`${baseUrl}/api/chat/sessions/${testSessionId}`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });

      assert.strictEqual(res.status, 403);
    });

    it("DELETE /api/chat/sessions/:id should delete student's own session", async () => {
      const res = await fetch(`${baseUrl}/api/chat/sessions/${testSessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      assert.strictEqual(res.status, 200);
    });
  });

  // ==========================================================================
  // 5. College and Cutoff APIs
  // ==========================================================================
  describe("College & Cutoff Management Endpoints", () => {
    let createdCollegeId;

    it("GET /api/colleges should be open without authentication", async () => {
      const res = await fetch(`${baseUrl}/api/colleges`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    it("POST /api/colleges should reject student creation attempts (403)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          code: "GPC_TEST",
          name: "Test College",
          location: "Kota",
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    it("POST /api/colleges should allow admin to create college", async () => {
      const res = await fetch(`${baseUrl}/api/colleges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: "GPC_KOTA",
          name: "Government Polytechnic College, Kota",
          location: "Kota",
          district: "Kota",
          type: "Government",
          establishedYear: 1960,
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.college.code, "GPC_KOTA");
      createdCollegeId = data.college.id;
    });

    it("POST /api/cutoffs should reject student attempts (403)", async () => {
      const res = await fetch(`${baseUrl}/api/cutoffs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          collegeId: createdCollegeId,
          courseName: "Mechanical Engineering",
          category: "GEN",
          admissionYear: 2024,
          openingRank: 400,
          closingRank: 2200,
          source: "Test",
        }),
      });

      assert.strictEqual(res.status, 403);
    });

    it("POST /api/cutoffs should allow admin to add official cutoff", async () => {
      const res = await fetch(`${baseUrl}/api/cutoffs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          collegeId: createdCollegeId,
          courseName: "Mechanical Engineering",
          category: "GEN",
          admissionYear: 2024,
          openingRank: 400,
          closingRank: 2200,
          round: 1,
          source: "DTE Rajasthan Official Cutoff 2024",
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.cutoff.closingRank, 2200);
    });

    it("GET /api/cutoffs should query cutoffs by filters", async () => {
      const res = await fetch(`${baseUrl}/api/cutoffs?courseName=Mechanical`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.cutoffs.length >= 1);
    });

    // ==========================================================================
    // Branch Creation Endpoints & Validation Tests
    // ==========================================================================
    it("POST /api/colleges/:id/branches should reject unauthenticated request (401)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 401);
    });

    it("POST /api/colleges/:id/branches should reject student request with 403", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 403);
    });

    it("POST /api/colleges/:id/branches should reject invalid college ID (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/not-a-number/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Invalid college ID");
    });

    it("POST /api/colleges/:id/branches should reject college ID 0 (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/0/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Invalid college ID");
    });

    it("POST /api/colleges/:id/branches should reject negative college ID (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/-5/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Invalid college ID");
    });

    it("POST /api/colleges/:id/branches should reject fractional college ID (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/1.5/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Invalid college ID");
    });

    it("POST /api/colleges/:id/branches should reject extremely large numeric college ID (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/999999999999999999999999999999999999999999/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Invalid college ID");
    });

    it("POST /api/colleges/:id/branches should reject non-existent college (404)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/999999/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Civil Engineering", code: "CE" }),
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "College not found");
    });

    it("POST /api/colleges/:id/branches should reject array request body (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify([]),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /JSON object/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject null request body (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(null),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /JSON object/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject missing name and code (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(Array.isArray(data.errors));
      assert.ok(data.errors.some((e) => /name/i.test(e)));
      assert.ok(data.errors.some((e) => /code/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject non-string name and code (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: 12345, code: true }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /name/i.test(e)));
      assert.ok(data.errors.some((e) => /code/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject whitespace-only name and code (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "   ", code: "   " }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /name/i.test(e)));
      assert.ok(data.errors.some((e) => /code/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject name and code violating length limits (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "A", code: "A" }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /at least 2 characters/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject invalid durationYears and seats (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Civil Engineering",
          code: "CIVIL",
          durationYears: "3abc",
          seats: -50,
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /durationYears/i.test(e)));
      assert.ok(data.errors.some((e) => /seats/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject fractional durationYears and seats (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Civil Engineering",
          code: "CIVIL",
          durationYears: 3.5,
          seats: 60.5,
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /durationYears/i.test(e)));
      assert.ok(data.errors.some((e) => /seats/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should reject out-of-range durationYears and seats (400)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Civil Engineering",
          code: "CIVIL",
          durationYears: 0,
          seats: 1001,
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, "Validation failed");
      assert.ok(data.errors.some((e) => /durationYears/i.test(e)));
      assert.ok(data.errors.some((e) => /seats/i.test(e)));
    });

    it("POST /api/colleges/:id/branches should allow admin to create branch with defaults (201)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "  Computer Science & Engineering  ",
          code: "  cse  ",
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.branch.name, "Computer Science & Engineering");
      assert.strictEqual(data.branch.code, "CSE");
      assert.strictEqual(data.branch.durationYears, 3);
      assert.strictEqual(data.branch.seats, 60);
      assert.strictEqual(data.branch.collegeId, createdCollegeId);
    });

    it("POST /api/colleges/:id/branches should reject duplicate branch code for same college (409)", async () => {
      const res = await fetch(`${baseUrl}/api/colleges/${createdCollegeId}/branches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Computer Science & Engineering Duplicate",
          code: "CSE",
        }),
      });
      assert.strictEqual(res.status, 409);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /unique constraint violation/i);
    });
  });

  // ==========================================================================
  // 6. AI Proxy APIs Error Handling (FastAPI Integration)
  // ==========================================================================
  describe("AI Service Proxy Error Handling", () => {
    it("POST /api/ai/chat should require authentication (401)", async () => {
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Hello" }),
      });
      assert.strictEqual(res.status, 401);
    });

    it("POST /api/ai/chat should validate non-empty question (400)", async () => {
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ question: "   " }),
      });
      assert.strictEqual(res.status, 400);
    });

    it("POST /api/ai/chat should gracefully handle AI service unavailability with 503", async () => {
      // Points to unreachable port to test resilience
      const aiProxy = require("../services/aiProxy.service");
      const originalUrl = aiProxy.baseUrl;
      aiProxy.baseUrl = "http://127.0.0.1:59999"; // Non-existent service

      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ question: "What is the fee?" }),
      });

      aiProxy.baseUrl = originalUrl; // Restore
      assert.strictEqual(res.status, 503);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /AI service is currently unavailable/i);
    });

    it("POST /api/ai/recommend-colleges should validate rank and category (400)", async () => {
      const res = await fetch(`${baseUrl}/api/ai/recommend-colleges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ rank: -5 }),
      });
      assert.strictEqual(res.status, 400);
    });
  });
});
