/**
 * Unit Test Suite for Admission Cutoff API Contracts
 * Tests request payload validation, college resolution, response mapping,
 * authentication enforcement, and query parameter aliases using isolated mocks.
 * 
 * Safe and non-destructive: does not modify databases or require live services.
 */
require("dotenv").config();
const { describe, it } = require("node:test");
const assert = require("node:assert");
const express = require("express");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "shiksha_setu_jwt_secret_dev_key_2026_super_secure";
const testUser = { id: 101, email: "student@example.com", role: "STUDENT" };
const validToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: "1h" });

describe("Contribution 2 — Admission Cutoff API Contract Tests", () => {
  // Helper to build test app
  function createTestApp() {
    const app = express();
    app.use(express.json());

    // Mount routers
    const aiRouter = require("../routes/ai.routes");
    const cutoffRouter = require("../routes/cutoff.routes");

    app.use("/api/ai", aiRouter);
    app.use("/api/cutoffs", cutoffRouter);

    return app;
  }

  it("POST /api/ai/predict-cutoff should require authentication (401)", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college_id: "GPC_JAIPUR",
          course_name: "Civil Engineering",
          category: "GEN",
        }),
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Authorization header is missing|Access denied|token missing/i);
    } finally {
      server.close();
    }
  });

  it("POST /api/ai/predict-cutoff should map 'GENERAL' category alias to 'GEN' for AI service", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    const prisma = require("../lib/prisma");
    const aiProxy = require("../services/aiProxy.service");

    const origFindFirst = prisma.college.findFirst;
    const origPredict = aiProxy.predictCutoff;

    let receivedCategory = null;

    prisma.college.findFirst = async () => ({
      id: 1,
      code: "GPC_JAIPUR",
      name: "Government Polytechnic College, Jaipur",
    });

    aiProxy.predictCutoff = async (payload) => {
      receivedCategory = payload.category;
      return {
        college_id: "GPC_JAIPUR",
        course_name: "Civil Engineering",
        category: payload.category,
        estimated_closing_rank: 2950,
      };
    };

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          college_id: "GPC_JAIPUR",
          course_name: "Civil Engineering",
          category: "GENERAL",
        }),
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(receivedCategory, "GEN", "Category 'GENERAL' must be normalized to 'GEN'");
    } finally {
      prisma.college.findFirst = origFindFirst;
      aiProxy.predictCutoff = origPredict;
      server.close();
    }
  });

  it("POST /api/ai/predict-cutoff should reject unsupported categories with 400", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          college_id: "GPC_JAIPUR",
          course_name: "Civil Engineering",
          category: "UNSUPPORTED_XYZ",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Invalid category 'UNSUPPORTED_XYZ'/i);
    } finally {
      server.close();
    }
  });

  it("POST /api/ai/predict-cutoff should return 400 when college cannot be resolved", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    const prisma = require("../lib/prisma");
    const origFindFirst = prisma.college.findFirst;

    // Simulate DB lookup returning null (unregistered institution)
    prisma.college.findFirst = async () => null;

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          college_name: "Non-Existent University of Nowhere 999",
          course_name: "Civil Engineering",
          category: "GEN",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Unable to resolve college/i);
    } finally {
      prisma.college.findFirst = origFindFirst;
      server.close();
    }
  });

  it("CutoffPredictorPage should not contain fabricated historical cutoff percentage rows", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const pagePath = path.resolve(__dirname, "../../client/src/pages/CutoffPredictorPage.jsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    // Verify all hardcoded percentage values and fake records are eradicated
    assert.strictEqual(pageContent.includes("82.4%"), false, "Must not contain hardcoded 82.4%");
    assert.strictEqual(pageContent.includes("73.8%"), false, "Must not contain hardcoded 73.8%");
    assert.strictEqual(pageContent.includes("80.1%"), false, "Must not contain hardcoded 80.1%");
    assert.strictEqual(pageContent.includes("71.5%"), false, "Must not contain hardcoded 71.5%");
    assert.strictEqual(pageContent.includes("79.0%"), false, "Must not contain hardcoded 79.0%");
    assert.strictEqual(pageContent.includes("69.8%"), false, "Must not contain hardcoded 69.8%");

    // Verify clear empty state message is rendered
    assert.ok(
      pageContent.includes("No verified historical cutoff records are available for this selection."),
      "Must render official empty-state message when historical_records is empty"
    );
  });

  it("POST /api/ai/predict-cutoff should reject missing course_name (400)", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          college_id: "GPC_JAIPUR",
          category: "GEN",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /course_name is required/i);
    } finally {
      server.close();
    }
  });

  it("POST /api/ai/predict-cutoff should reject missing category (400)", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          college_id: "GPC_JAIPUR",
          course_name: "Civil Engineering",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /category is required/i);
    } finally {
      server.close();
    }
  });

  it("POST /api/ai/predict-cutoff should resolve college_name to college_id and return aligned response (200)", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    const prisma = require("../lib/prisma");
    const aiProxy = require("../services/aiProxy.service");

    const origFindFirst = prisma.college.findFirst;
    const origPredict = aiProxy.predictCutoff;

    // Mock DB college lookup
    prisma.college.findFirst = async () => ({
      id: 1,
      code: "GPC_JAIPUR",
      name: "Government Polytechnic College, Jaipur",
    });

    // Mock AI service response
    aiProxy.predictCutoff = async (payload) => {
      assert.strictEqual(payload.college_id, "GPC_JAIPUR");
      assert.strictEqual(payload.course_name, "Civil Engineering");
      assert.strictEqual(payload.category, "GEN");
      return {
        college_id: "GPC_JAIPUR",
        college_name: "Government Polytechnic College, Jaipur",
        course_name: "Civil Engineering",
        category: "GEN",
        estimated_closing_rank: 2950,
        confidence: "High",
        trend: "increasing",
        target_year: 2026,
        historical_records: [
          { admission_year: 2024, opening_rank: 850, closing_rank: 2800, source: "DTE 2024", source_year: 2024 },
        ],
        explanation: "Trend projection.",
        methodology: "Linear regression.",
        disclaimer: "Indicative only.",
      };
    };

    try {
      const res = await fetch(`http://localhost:${port}/api/ai/predict-cutoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          college_name: "Government Polytechnic College, Jaipur",
          branch: "Civil Engineering",
          category: "GEN",
          year: 2026,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      // Verify both root-level fields and nested prediction wrapper exist
      assert.strictEqual(data.college_id, "GPC_JAIPUR");
      assert.strictEqual(data.estimated_closing_rank, 2950);
      assert.ok(data.prediction, "data.prediction should exist for client contract alignment");
      assert.strictEqual(data.prediction.estimated_closing_rank, 2950);
      assert.strictEqual(data.prediction.confidence, "High");
    } finally {
      prisma.college.findFirst = origFindFirst;
      aiProxy.predictCutoff = origPredict;
      server.close();
    }
  });

  it("GET /api/cutoffs should handle both courseName and course query parameter aliases", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const port = server.address().port;

    const collegeService = require("../services/college.service");
    const origGetCutoffs = collegeService.getCutoffs;

    let capturedCourse = null;
    collegeService.getCutoffs = async (filters) => {
      capturedCourse = filters.courseName;
      return [];
    };

    try {
      // 1. Query with courseName
      await fetch(`http://localhost:${port}/api/cutoffs?courseName=Civil`);
      assert.strictEqual(capturedCourse, "Civil");

      // 2. Query with course alias
      await fetch(`http://localhost:${port}/api/cutoffs?course=Mechanical`);
      assert.strictEqual(capturedCourse, "Mechanical");
    } finally {
      collegeService.getCutoffs = origGetCutoffs;
      server.close();
    }
  });
});
