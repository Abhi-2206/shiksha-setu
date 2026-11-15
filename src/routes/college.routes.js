const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/rbac.middleware");
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
    const colleges = await collegeService.listColleges({
      location,
      district,
      type,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
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
// 2. GET COLLEGE DETAILS (Public / Authenticated Students)
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

    const college = await collegeService.getCollege(collegeId);

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
    const { code, name, location, district, type, establishedYear, website, contactEmail, contactPhone, address } = req.body;

    if (!code || !name || !location) {
      return res.status(400).json({
        success: false,
        message: "code, name, and location are required fields",
      });
    }

    const college = await collegeService.createCollege(
      {
        code,
        name,
        location,
        district,
        type,
        establishedYear,
        website,
        contactEmail,
        contactPhone,
        address,
      },
      req.user
    );

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
      return res.status(400).json({
        success: false,
        message: "Invalid college ID",
      });
    }

    const updated = await collegeService.updateCollege(collegeId, req.body, req.user);

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
      return res.status(400).json({
        success: false,
        message: "Invalid college ID",
      });
    }

    await collegeService.deleteCollege(collegeId, req.user);

    return res.status(200).json({
      success: true,
      message: "College deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
