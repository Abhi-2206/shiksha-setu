const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");
const { requireSelfOrAdmin } = require("../middleware/rbac.middleware");
const profileService = require("../services/studentProfile.service");

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
// Endpoint: GET /api/student/profile or GET /api/students/profile
// -------------------------------------------------------------
router.get("/profile", authenticateToken, async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user.id, req.user);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student profile retrieved successfully",
      profile,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. CREATE OR UPSERT LOGGED-IN STUDENT PROFILE
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

// -------------------------------------------------------------
// 5. ADMIN STUDENT MANAGEMENT (Called by React StudentPage)
// -------------------------------------------------------------
router.get("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 10, district, state } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        include: { profile: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        createdAt: s.createdAt,
        profile: s.profile,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: { id: newUser.id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.status(200).json({ success: true, student: user });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: { name, email },
    });

    return res.status(200).json({ success: true, student: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Student deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
