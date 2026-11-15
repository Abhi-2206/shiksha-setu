const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
const collegeService = require("../services/college.service");

const router = express.Router();

const VALID_CATEGORIES = new Set([
  "GEN",
  "OBC",
  "SC",
  "ST",
  "EWS",
  "MBC",
  "TFWS",
  "PWD",
]);

// -------------------------------------------------------------
// 1. QUERY HISTORICAL CUTOFFS (Public / Authenticated Students)
// Endpoint: GET /api/cutoffs
// Supports filters: collegeId, courseName, category, admissionYear, maxClosingRank
// -------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { collegeId, courseName, category, admissionYear, maxClosingRank } = req.query;

    if (category && !VALID_CATEGORIES.has(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category '${category}'. Allowed categories: ${Array.from(VALID_CATEGORIES).join(", ")}`,
      });
    }

    const cutoffs = await collegeService.getCutoffs({
      collegeId,
      courseName,
      category: category ? category.toUpperCase() : undefined,
      admissionYear,
      maxClosingRank,
    });

    return res.status(200).json({
      success: true,
      count: cutoffs.length,
      cutoffs,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. CREATE OFFICIAL CUTOFF RECORD (Admin Only)
// Endpoint: POST /api/cutoffs
// -------------------------------------------------------------
router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      collegeId,
      courseName,
      category,
      admissionYear,
      openingRank,
      closingRank,
      round = 1,
      source,
      sourceYear,
    } = req.body;

    if (!collegeId || !courseName || !category || !admissionYear || !openingRank || !closingRank || !source) {
      return res.status(400).json({
        success: false,
        message: "Missing required cutoff fields: collegeId, courseName, category, admissionYear, openingRank, closingRank, and source are mandatory",
      });
    }

    if (!VALID_CATEGORIES.has(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category '${category}'`,
      });
    }

    if (parseInt(openingRank, 10) <= 0 || parseInt(closingRank, 10) <= 0) {
      return res.status(400).json({
        success: false,
        message: "openingRank and closingRank must be positive integers",
      });
    }

    const cutoff = await collegeService.createCutoff(
      {
        collegeId,
        courseName,
        category: category.toUpperCase(),
        admissionYear,
        openingRank,
        closingRank,
        round,
        source,
        sourceYear: sourceYear || admissionYear,
      },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Official cutoff record added successfully",
      cutoff,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A cutoff record already exists for this college, course, category, admission year, and counseling round",
      });
    }
    next(error);
  }
});

module.exports = router;
