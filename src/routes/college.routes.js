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

const RESTRICTED_COLLEGE_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "branches",
  "cutoffs",
  "admissionCutoffs",
]);

const ALLOWED_COLLEGE_UPDATE_FIELDS = new Set([
  "name",
  "code",
  "type",
  "district",
  "city",
  "location",
  "state",
  "address",
  "website",
  "contactEmail",
  "contactPhone",
  "establishedYear",
  "isActive",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCollegeUpdateInput(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object"];
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return ["Request body cannot be empty; at least one editable field must be provided"];
  }

  for (const key of keys) {
    if (RESTRICTED_COLLEGE_FIELDS.has(key)) {
      errors.push(`Field '${key}' is system-managed and cannot be modified`);
    } else if (!ALLOWED_COLLEGE_UPDATE_FIELDS.has(key)) {
      errors.push(`Unknown field '${key}'`);
    }
  }

  // 1. name validation
  if (body.name !== undefined) {
    if (body.name === null || typeof body.name !== "string") {
      errors.push("name must be a string");
    } else if (!body.name.trim()) {
      errors.push("name cannot be empty or whitespace-only");
    } else if (body.name.trim().length < 2) {
      errors.push("name must be at least 2 characters long");
    } else if (body.name.trim().length > 200) {
      errors.push("name cannot exceed 200 characters");
    }
  }

  // 2. code validation
  if (body.code !== undefined) {
    if (body.code === null || typeof body.code !== "string") {
      errors.push("code must be a string");
    } else if (!body.code.trim()) {
      errors.push("code cannot be empty or whitespace-only");
    } else if (body.code.trim().length < 2) {
      errors.push("code must be at least 2 characters long");
    } else if (body.code.trim().length > 50) {
      errors.push("code cannot exceed 50 characters");
    }
  }

  // 3. type validation
  if (body.type !== undefined) {
    if (body.type === null || typeof body.type !== "string") {
      errors.push("type must be a string");
    } else if (!body.type.trim()) {
      errors.push("type cannot be empty or whitespace-only");
    } else if (body.type.trim().length > 50) {
      errors.push("type cannot exceed 50 characters");
    }
  }

  // 4. location validation
  if (body.location !== undefined) {
    if (body.location === null || typeof body.location !== "string") {
      errors.push("location must be a string");
    } else if (!body.location.trim()) {
      errors.push("location cannot be empty or whitespace-only");
    } else if (body.location.trim().length > 100) {
      errors.push("location cannot exceed 100 characters");
    }
  }

  // 5. state validation
  if (body.state !== undefined) {
    if (body.state === null || typeof body.state !== "string") {
      errors.push("state must be a string");
    } else if (!body.state.trim()) {
      errors.push("state cannot be empty or whitespace-only");
    } else if (body.state.trim().length > 100) {
      errors.push("state cannot exceed 100 characters");
    }
  }

  // 6. district validation (nullable)
  if (body.district !== undefined && body.district !== null) {
    if (typeof body.district !== "string") {
      errors.push("district must be a string or null");
    } else if (!body.district.trim()) {
      errors.push("district cannot be empty or whitespace-only");
    } else if (body.district.trim().length > 100) {
      errors.push("district cannot exceed 100 characters");
    }
  }

  // 7. city validation (nullable)
  if (body.city !== undefined && body.city !== null) {
    if (typeof body.city !== "string") {
      errors.push("city must be a string or null");
    } else if (!body.city.trim()) {
      errors.push("city cannot be empty or whitespace-only");
    } else if (body.city.trim().length > 100) {
      errors.push("city cannot exceed 100 characters");
    }
  }

  // 8. address validation (nullable)
  if (body.address !== undefined && body.address !== null) {
    if (typeof body.address !== "string") {
      errors.push("address must be a string or null");
    } else if (!body.address.trim()) {
      errors.push("address cannot be empty or whitespace-only");
    } else if (body.address.trim().length > 255) {
      errors.push("address cannot exceed 255 characters");
    }
  }

  // 9. website validation (nullable)
  if (body.website !== undefined && body.website !== null) {
    if (typeof body.website !== "string") {
      errors.push("website must be a string or null");
    } else if (!body.website.trim()) {
      errors.push("website cannot be empty or whitespace-only");
    } else if (body.website.trim().length > 255) {
      errors.push("website cannot exceed 255 characters");
    }
  }

  // 10. contactPhone validation (nullable)
  if (body.contactPhone !== undefined && body.contactPhone !== null) {
    if (typeof body.contactPhone !== "string") {
      errors.push("contactPhone must be a string or null");
    } else if (!body.contactPhone.trim()) {
      errors.push("contactPhone cannot be empty or whitespace-only");
    } else if (body.contactPhone.trim().length > 25) {
      errors.push("contactPhone cannot exceed 25 characters");
    }
  }

  // 11. contactEmail validation (nullable)
  if (body.contactEmail !== undefined && body.contactEmail !== null) {
    if (typeof body.contactEmail !== "string") {
      errors.push("contactEmail must be a string or null");
    } else if (!body.contactEmail.trim()) {
      errors.push("contactEmail cannot be empty or whitespace-only");
    } else if (!EMAIL_REGEX.test(body.contactEmail.trim())) {
      errors.push("Invalid contactEmail format");
    } else if (body.contactEmail.trim().length > 100) {
      errors.push("contactEmail cannot exceed 100 characters");
    }
  }

  // 12. establishedYear validation (nullable integer)
  if (body.establishedYear !== undefined && body.establishedYear !== null) {
    if (!isStrictInteger(body.establishedYear)) {
      errors.push("establishedYear must be an integer between 1800 and next year");
    } else {
      const year = typeof body.establishedYear === "number"
        ? body.establishedYear
        : parseInt(body.establishedYear.trim(), 10);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear + 1) {
        errors.push(`establishedYear must be an integer between 1800 and ${currentYear + 1}`);
      }
    }
  }

  // 13. isActive validation (boolean strictly)
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      errors.push("isActive must be a boolean");
    }
  }

  return errors;
}

// -------------------------------------------------------------
// 4. UPDATE COLLEGE (Admin Only)
// Endpoint: PUT /api/colleges/:id
// -------------------------------------------------------------
router.put("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const collegeId = Number(rawId);
    if (!Number.isSafeInteger(collegeId) || collegeId <= 0 || !/^\d+$/.test(String(rawId || "").trim())) {
      return res.status(400).json({ success: false, message: "Invalid college ID" });
    }

    const existingCollege = await prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (!existingCollege) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    const validationErrors = validateCollegeUpdateInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const body = req.body;
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code.trim().toUpperCase();
    if (body.type !== undefined) updateData.type = body.type.trim().toUpperCase();
    if (body.location !== undefined) updateData.location = body.location.trim();
    if (body.district !== undefined) updateData.district = body.district === null ? null : body.district.trim();
    if (body.city !== undefined) updateData.city = body.city === null ? null : body.city.trim();
    if (body.state !== undefined) updateData.state = body.state.trim();
    if (body.address !== undefined) updateData.address = body.address === null ? null : body.address.trim();
    if (body.website !== undefined) updateData.website = body.website === null ? null : body.website.trim();
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail === null ? null : body.contactEmail.trim();
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone === null ? null : body.contactPhone.trim();
    if (body.establishedYear !== undefined) {
      updateData.establishedYear = body.establishedYear === null
        ? null
        : (typeof body.establishedYear === "number" ? body.establishedYear : parseInt(body.establishedYear.trim(), 10));
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await prisma.college.update({
      where: { id: collegeId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "College updated successfully",
      college: updated,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A unique constraint violation occurred in the database.",
        fields: error.meta?.target || null,
      });
    }
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

function isStrictInteger(val) {
  if (typeof val === "number") {
    return Number.isInteger(val);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return false;
    return /^\d+$/.test(trimmed);
  }
  return false;
}

function validateBranchInput(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object"];
  }

  // 1. Name validation
  if (body.name === undefined || body.name === null) {
    errors.push("Branch name is required");
  } else if (typeof body.name !== "string") {
    errors.push("Branch name must be a string");
  } else if (!body.name.trim()) {
    errors.push("Branch name cannot be empty or whitespace-only");
  } else if (body.name.trim().length < 2) {
    errors.push("Branch name must be at least 2 characters long");
  } else if (body.name.trim().length > 100) {
    errors.push("Branch name cannot exceed 100 characters");
  }

  // 2. Code validation
  if (body.code === undefined || body.code === null) {
    errors.push("Branch code is required");
  } else if (typeof body.code !== "string") {
    errors.push("Branch code must be a string");
  } else if (!body.code.trim()) {
    errors.push("Branch code cannot be empty or whitespace-only");
  } else if (body.code.trim().length < 2) {
    errors.push("Branch code must be at least 2 characters long");
  } else if (body.code.trim().length > 20) {
    errors.push("Branch code cannot exceed 20 characters");
  }

  // 3. Optional durationYears validation
  if (body.durationYears !== undefined && body.durationYears !== null) {
    if (!isStrictInteger(body.durationYears)) {
      errors.push("durationYears must be an integer between 1 and 6");
    } else {
      const val = typeof body.durationYears === "number" ? body.durationYears : parseInt(body.durationYears.trim(), 10);
      if (val < 1 || val > 6) {
        errors.push("durationYears must be an integer between 1 and 6");
      }
    }
  }

  // 4. Optional seats validation
  if (body.seats !== undefined && body.seats !== null) {
    if (!isStrictInteger(body.seats)) {
      errors.push("seats must be a positive integer between 1 and 1000");
    } else {
      const val = typeof body.seats === "number" ? body.seats : parseInt(body.seats.trim(), 10);
      if (val < 1 || val > 1000) {
        errors.push("seats must be a positive integer between 1 and 1000");
      }
    }
  }

  return errors;
}

// -------------------------------------------------------------
// 6. BRANCH ENDPOINTS (Admin Only creation/deletion)
// -------------------------------------------------------------
router.post("/:id/branches", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const collegeId = Number(rawId);
    if (!Number.isSafeInteger(collegeId) || collegeId <= 0 || !/^\d+$/.test(String(rawId || "").trim())) {
      return res.status(400).json({ success: false, message: "Invalid college ID" });
    }

    // Verify parent college exists
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    // Validate request body
    const validationErrors = validateBranchInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    const { name, code, durationYears, seats } = req.body;
    const finalDurationYears = durationYears !== undefined && durationYears !== null
      ? (typeof durationYears === "number" ? durationYears : parseInt(durationYears.trim(), 10))
      : 3;
    const finalSeats = seats !== undefined && seats !== null
      ? (typeof seats === "number" ? seats : parseInt(seats.trim(), 10))
      : 60;

    const branch = await prisma.branch.create({
      data: {
        collegeId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        durationYears: finalDurationYears,
        seats: finalSeats,
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
