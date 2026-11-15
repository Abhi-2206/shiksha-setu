const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const { requireSelfOrAdmin } = require("../middleware/rbac.middleware");
const profileService = require("../services/studentProfile.service");

const router = express.Router();

/**
 * Valid reservation categories matching the database schema enum
 */
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

/**
 * Validates and sanitizes incoming student profile payload
 */
function validateProfileInput(body) {
  const errors = [];

  if (body.category && !VALID_CATEGORIES.has(body.category.toUpperCase())) {
    errors.push(`Invalid category '${body.category}'. Allowed categories: ${Array.from(VALID_CATEGORIES).join(", ")}`);
  }

  if (body.tenthPercentage !== undefined && body.tenthPercentage !== null) {
    const p = parseFloat(body.tenthPercentage);
    if (isNaN(p) || p < 0 || p > 100) {
      errors.push("tenthPercentage must be a float between 0 and 100");
    }
  }

  if (body.twelfthPercentage !== undefined && body.twelfthPercentage !== null) {
    const p = parseFloat(body.twelfthPercentage);
    if (isNaN(p) || p < 0 || p > 100) {
      errors.push("twelfthPercentage must be a float between 0 and 100");
    }
  }

  if (body.diplomaPercentage !== undefined && body.diplomaPercentage !== null) {
    const p = parseFloat(body.diplomaPercentage);
    if (isNaN(p) || p < 0 || p > 100) {
      errors.push("diplomaPercentage must be a float between 0 and 100");
    }
  }

  if (body.examRank !== undefined && body.examRank !== null) {
    const r = parseInt(body.examRank, 10);
    if (isNaN(r) || r <= 0) {
      errors.push("examRank must be a positive integer");
    }
  }

  return errors;
}

// -------------------------------------------------------------
// 1. GET LOGGED-IN STUDENT PROFILE
// Endpoint: GET /api/student/profile
// -------------------------------------------------------------
router.get("/profile", authenticateToken, async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user.id, req.user);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found. Please create your profile first.",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. CREATE OR UPDATE LOGGED-IN STUDENT PROFILE
// Endpoint: POST /api/student/profile
// -------------------------------------------------------------
router.post("/profile", authenticateToken, async (req, res, next) => {
  try {
    const validationErrors = validateProfileInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Never trust role supplied in profile payload
    const profile = await profileService.upsertProfile(req.user.id, req.user, req.body);

    return res.status(200).json({
      success: true,
      message: "Student profile saved successfully",
      profile,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. UPDATE LOGGED-IN STUDENT PROFILE
// Endpoint: PUT /api/student/profile
// -------------------------------------------------------------
router.put("/profile", authenticateToken, async (req, res, next) => {
  try {
    const validationErrors = validateProfileInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const profile = await profileService.upsertProfile(req.user.id, req.user, req.body);

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully",
      profile,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 4. GET STUDENT PROFILE BY USER ID (Self or Admin)
// Endpoint: GET /api/student/profile/:userId
// -------------------------------------------------------------
router.get("/profile/:userId", authenticateToken, requireSelfOrAdmin("userId"), async (req, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const profile = await profileService.getProfile(targetUserId, req.user);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
