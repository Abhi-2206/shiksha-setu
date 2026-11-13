const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

const router = express.Router();

// Valid categories for Rajasthan DTE admissions
const VALID_CATEGORIES = ["GENERAL", "OBC", "SC", "ST", "EWS", "MBC", "SBC"];

// -------------------------------------------------------------
// 1. GET ALL CUTOFFS (Public) — with optional filters
// Endpoint: GET /api/cutoffs
// Query params: ?collegeId=1&branchId=2&year=2024&category=GENERAL&round=1
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { collegeId, branchId, year, category, round } = req.query;

    // Build a dynamic filter — only apply filters that are actually provided
    const filter = {};

    if (collegeId) {
      const parsed = parseInt(collegeId, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ success: false, message: "Invalid collegeId" });
      }
      filter.collegeId = parsed;
    }

    if (branchId) {
      const parsed = parseInt(branchId, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ success: false, message: "Invalid branchId" });
      }
      filter.branchId = parsed;
    }

    if (year) {
      const parsed = parseInt(year, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ success: false, message: "Invalid year" });
      }
      filter.year = parsed;
    }

    if (category) {
      filter.category = { equals: category.toUpperCase(), mode: "insensitive" };
    }

    if (round) {
      const parsed = parseInt(round, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ success: false, message: "Invalid round" });
      }
      filter.round = parsed;
    }

    const cutoffs = await prisma.admissionCutoff.findMany({
      where: filter,
      include: {
        college: {
          select: { id: true, name: true, code: true, district: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ year: "desc" }, { round: "asc" }, { category: "asc" }],
    });

    return res.status(200).json({
      success: true,
      count: cutoffs.length,
      cutoffs: cutoffs,
    });
  } catch (error) {
    console.error("Get cutoffs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching cutoffs",
    });
  }
});

// -------------------------------------------------------------
// 2. GET SINGLE CUTOFF BY ID (Public)
// Endpoint: GET /api/cutoffs/:id
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const cutoffId = parseInt(req.params.id, 10);

    if (isNaN(cutoffId)) {
      return res.status(400).json({ success: false, message: "Invalid cutoff ID" });
    }

    const cutoff = await prisma.admissionCutoff.findUnique({
      where: { id: cutoffId },
      include: {
        college: {
          select: { id: true, name: true, code: true, district: true, city: true },
        },
        branch: {
          select: { id: true, name: true, code: true, seats: true },
        },
      },
    });

    if (!cutoff) {
      return res.status(404).json({ success: false, message: "Cutoff record not found" });
    }

    return res.status(200).json({ success: true, cutoff: cutoff });
  } catch (error) {
    console.error("Get cutoff by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching cutoff",
    });
  }
});

// -------------------------------------------------------------
// 3. CREATE CUTOFF RECORD (Admin only)
// Endpoint: POST /api/cutoffs
// -------------------------------------------------------------
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { collegeId, branchId, year, category, cutoffMarks, cutoffRank, round } = req.body;

    // Validate required fields
    if (!collegeId || !branchId || !year || !category) {
      return res.status(400).json({
        success: false,
        message: "collegeId, branchId, year, and category are required",
      });
    }

    // Parse and validate collegeId
    const parsedCollegeId = parseInt(collegeId, 10);
    if (isNaN(parsedCollegeId)) {
      return res.status(400).json({ success: false, message: "Invalid collegeId" });
    }

    // Parse and validate branchId
    const parsedBranchId = parseInt(branchId, 10);
    if (isNaN(parsedBranchId)) {
      return res.status(400).json({ success: false, message: "Invalid branchId" });
    }

    // Validate year
    const parsedYear = parseInt(year, 10);
    if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      return res.status(400).json({
        success: false,
        message: "Year must be a valid number between 2000 and 2100",
      });
    }

    // Validate category
    const upperCategory = category.toUpperCase();
    if (!VALID_CATEGORIES.includes(upperCategory)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    // Validate round
    let parsedRound = 1;
    if (round !== undefined && round !== null && round !== "") {
      parsedRound = parseInt(round, 10);
      if (isNaN(parsedRound) || parsedRound < 1) {
        return res.status(400).json({
          success: false,
          message: "Round must be a positive integer (e.g. 1, 2, 3)",
        });
      }
    }

    // Validate cutoffMarks if provided
    let parsedMarks = null;
    if (cutoffMarks !== undefined && cutoffMarks !== null && cutoffMarks !== "") {
      parsedMarks = parseFloat(cutoffMarks);
      if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 100) {
        return res.status(400).json({
          success: false,
          message: "Cutoff marks must be a number between 0 and 100",
        });
      }
    }

    // Validate cutoffRank if provided
    let parsedRank = null;
    if (cutoffRank !== undefined && cutoffRank !== null && cutoffRank !== "") {
      parsedRank = parseInt(cutoffRank, 10);
      if (isNaN(parsedRank) || parsedRank < 1) {
        return res.status(400).json({
          success: false,
          message: "Cutoff rank must be a positive integer",
        });
      }
    }

    // Check that at least one of marks or rank is provided
    if (parsedMarks === null && parsedRank === null) {
      return res.status(400).json({
        success: false,
        message: "At least one of cutoffMarks or cutoffRank must be provided",
      });
    }

    // Verify college exists
    const college = await prisma.college.findUnique({ where: { id: parsedCollegeId } });
    if (!college) {
      return res.status(404).json({ success: false, message: "College not found" });
    }

    // Verify branch exists and belongs to this college
    const branch = await prisma.branch.findFirst({
      where: { id: parsedBranchId, collegeId: parsedCollegeId },
    });
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or does not belong to this college",
      });
    }

    // Check for duplicate: same college+branch+year+category+round
    const existing = await prisma.admissionCutoff.findUnique({
      where: {
        collegeId_branchId_year_category_round: {
          collegeId: parsedCollegeId,
          branchId: parsedBranchId,
          year: parsedYear,
          category: upperCategory,
          round: parsedRound,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Cutoff already exists for this college, branch, year (${parsedYear}), category (${upperCategory}), and round (${parsedRound})`,
      });
    }

    // Create the cutoff record
    const newCutoff = await prisma.admissionCutoff.create({
      data: {
        collegeId: parsedCollegeId,
        branchId: parsedBranchId,
        year: parsedYear,
        category: upperCategory,
        cutoffMarks: parsedMarks,
        cutoffRank: parsedRank,
        round: parsedRound,
      },
      include: {
        college: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Cutoff record created successfully",
      cutoff: newCutoff,
    });
  } catch (error) {
    console.error("Create cutoff error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error creating cutoff",
    });
  }
});

// -------------------------------------------------------------
// 4. UPDATE CUTOFF RECORD (Admin only)
// Endpoint: PUT /api/cutoffs/:id
// -------------------------------------------------------------
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cutoffId = parseInt(req.params.id, 10);

    if (isNaN(cutoffId)) {
      return res.status(400).json({ success: false, message: "Invalid cutoff ID" });
    }

    // Check if cutoff record exists
    const existing = await prisma.admissionCutoff.findUnique({ where: { id: cutoffId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Cutoff record not found" });
    }

    const { cutoffMarks, cutoffRank, year, category, round } = req.body;

    const updateData = {};

    if (year !== undefined) {
      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
        return res.status(400).json({ success: false, message: "Year must be between 2000 and 2100" });
      }
      updateData.year = parsedYear;
    }

    if (category !== undefined) {
      const upperCategory = category.toUpperCase();
      if (!VALID_CATEGORIES.includes(upperCategory)) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
        });
      }
      updateData.category = upperCategory;
    }

    if (round !== undefined) {
      const parsedRound = parseInt(round, 10);
      if (isNaN(parsedRound) || parsedRound < 1) {
        return res.status(400).json({ success: false, message: "Round must be a positive integer" });
      }
      updateData.round = parsedRound;
    }

    if (cutoffMarks !== undefined) {
      if (cutoffMarks === null || cutoffMarks === "") {
        updateData.cutoffMarks = null;
      } else {
        const parsedMarks = parseFloat(cutoffMarks);
        if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 100) {
          return res.status(400).json({ success: false, message: "Cutoff marks must be between 0 and 100" });
        }
        updateData.cutoffMarks = parsedMarks;
      }
    }

    if (cutoffRank !== undefined) {
      if (cutoffRank === null || cutoffRank === "") {
        updateData.cutoffRank = null;
      } else {
        const parsedRank = parseInt(cutoffRank, 10);
        if (isNaN(parsedRank) || parsedRank < 1) {
          return res.status(400).json({ success: false, message: "Cutoff rank must be a positive integer" });
        }
        updateData.cutoffRank = parsedRank;
      }
    }

    const updatedCutoff = await prisma.admissionCutoff.update({
      where: { id: cutoffId },
      data: updateData,
      include: {
        college: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cutoff record updated successfully",
      cutoff: updatedCutoff,
    });
  } catch (error) {
    console.error("Update cutoff error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating cutoff",
    });
  }
});

// -------------------------------------------------------------
// 5. DELETE CUTOFF RECORD (Admin only)
// Endpoint: DELETE /api/cutoffs/:id
// -------------------------------------------------------------
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cutoffId = parseInt(req.params.id, 10);

    if (isNaN(cutoffId)) {
      return res.status(400).json({ success: false, message: "Invalid cutoff ID" });
    }

    const existing = await prisma.admissionCutoff.findUnique({ where: { id: cutoffId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Cutoff record not found" });
    }

    await prisma.admissionCutoff.delete({ where: { id: cutoffId } });

    return res.status(200).json({
      success: true,
      message: "Cutoff record deleted successfully",
    });
  } catch (error) {
    console.error("Delete cutoff error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error deleting cutoff",
    });
  }
});

module.exports = router;

