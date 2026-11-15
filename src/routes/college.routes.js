const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");
const collegeService = require("../services/college.service");

const router = express.Router();

// -------------------------------------------------------------
// 1. LIST COLLEGES (Public / Authenticated Students)
// Endpoint: GET /api/colleges
// Supports filters: location, district, type, isActive
// -------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { location, district, type, isActive } = req.query;
    const filter = {};

    if (district) {
      filter.district = { equals: district, mode: "insensitive" };
    }
    if (location) {
      filter.location = { contains: location, mode: "insensitive" };
    }
    if (type) {
      filter.type = { equals: type, mode: "insensitive" };
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const colleges = await prisma.college.findMany({
      where: filter,
      include: {
        branches: true,
        _count: { select: { cutoffs: true } },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({
      success: true,
      count: colleges.length,
      colleges,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. GET SINGLE COLLEGE BY ID
// Endpoint: GET /api/colleges/:id
// -------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const collegeId = parseInt(req.params.id, 10);

    if (isNaN(collegeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid college ID",
      });
    }

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        branches: true,
        cutoffs: {
          orderBy: [{ admissionYear: "desc" }, { closingRank: "asc" }],
        },
      },
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    return res.status(200).json({
      success: true,
      college,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. CREATE COLLEGE (Admin Only)
// Endpoint: POST /api/colleges
// -------------------------------------------------------------
router.post("/", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const {
      code,
      name,
      location,
      district,
      city,
      type = "GOVERNMENT",
      establishedYear,
      website,
      contactEmail,
      contactPhone,
      address,
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "code and name are required fields",
      });
    }

    const college = await prisma.college.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        location: (location || district || city || "Rajasthan").trim(),
        district: district ? district.trim() : null,
        city: city ? city.trim() : null,
        type: type ? type.toUpperCase() : "GOVERNMENT",
        establishedYear: establishedYear ? parseInt(establishedYear, 10) : null,
        website: website || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "College created successfully",
      college,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 4. UPDATE COLLEGE (Admin Only)
// Endpoint: PUT /api/colleges/:id
// -------------------------------------------------------------
router.put("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const collegeId = parseInt(req.params.id, 10);
    if (isNaN(collegeId)) {
      return res.status(400).json({ success: false, message: "Invalid college ID" });
    }

    const updated = await prisma.college.update({
      where: { id: collegeId },
      data: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "College updated successfully",
      college: updated,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 5. DELETE COLLEGE (Admin Only)
// Endpoint: DELETE /api/colleges/:id
// -------------------------------------------------------------
router.delete("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const collegeId = parseInt(req.params.id, 10);
    if (isNaN(collegeId)) {
      return res.status(400).json({ success: false, message: "Invalid college ID" });
    }

    await prisma.college.delete({
      where: { id: collegeId },
    });

    return res.status(200).json({
      success: true,
      message: "College deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 6. BRANCH ENDPOINTS (Admin Only creation/deletion)
// -------------------------------------------------------------
router.post("/:id/branches", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const collegeId = parseInt(req.params.id, 10);
    const { name, code, durationYears = 3, seats = 60 } = req.body;

    const branch = await prisma.branch.create({
      data: {
        collegeId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        durationYears: parseInt(durationYears, 10) || 3,
        seats: parseInt(seats, 10) || 60,
      },
    });

    return res.status(201).json({ success: true, branch });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/branches", async (req, res, next) => {
  try {
    const collegeId = parseInt(req.params.id, 10);
    const branches = await prisma.branch.findMany({
      where: { collegeId },
    });
    return res.status(200).json({ success: true, branches });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
