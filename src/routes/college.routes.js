
const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

const router = express.Router();

// -------------------------------------------------------------
// 1. GET ALL COLLEGES
// Endpoint: GET /api/colleges
// Query: ?district=Jaipur&type=GOVERNMENT
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { district, type } = req.query;

    const filter = {};

    if (district) {
      filter.district = {
        equals: district,
        mode: "insensitive",
      };
    }

    if (type) {
      filter.type = {
        equals: type,
        mode: "insensitive",
      };
    }

    const colleges = await prisma.college.findMany({
      where: filter,
      include: {
        branches: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      count: colleges.length,
      colleges,
    });
  } catch (error) {
    console.error("Get colleges error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error fetching colleges",
    });
  }
});

// -------------------------------------------------------------
// 2. GET SINGLE COLLEGE BY ID
// Endpoint: GET /api/colleges/:id
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
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
    console.error("Get college by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error fetching college",
    });
  }
});

// -------------------------------------------------------------
// 3. CREATE COLLEGE
// Endpoint: POST /api/colleges
// Protected: ADMIN only
// -------------------------------------------------------------
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      district,
      city,
      address,
      website,
      contactEmail,
      contactPhone,
    } = req.body;

    if (!name || !code || !district || !city) {
      return res.status(400).json({
        success: false,
        message: "College name, code, district, and city are required",
      });
    }

    const existingCollege = await prisma.college.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existingCollege) {
      return res.status(400).json({
        success: false,
        message: `College with code '${code}' already exists`,
      });
    }

    const newCollege = await prisma.college.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: type ? type.trim().toUpperCase() : "GOVERNMENT",
        district: district.trim(),
        city: city.trim(),
        address: address ? address.trim() : null,
        website: website ? website.trim() : null,
        contactEmail: contactEmail ? contactEmail.trim() : null,
        contactPhone: contactPhone ? contactPhone.trim() : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "College created successfully",
      college: newCollege,
    });
  } catch (error) {
    console.error("Create college error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error creating college",
    });
  }
});

// -------------------------------------------------------------
// 4. UPDATE COLLEGE
// Endpoint: PUT /api/colleges/:id
// Protected: ADMIN only
// -------------------------------------------------------------
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
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
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found to update",
      });
    }

    const {
      name,
      code,
      type,
      district,
      city,
      address,
      website,
      contactEmail,
      contactPhone,
    } = req.body;

    if (code && code.trim().toUpperCase() !== college.code) {
      const codeTaken = await prisma.college.findUnique({
        where: { code: code.trim().toUpperCase() },
      });

      if (codeTaken) {
        return res.status(400).json({
          success: false,
          message: `College with code '${code}' already exists`,
        });
      }
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (type !== undefined) updateData.type = type.trim().toUpperCase();
    if (district !== undefined) updateData.district = district.trim();
    if (city !== undefined) updateData.city = city.trim();

    if (address !== undefined) {
      updateData.address = address ? address.trim() : null;
    }

    if (website !== undefined) {
      updateData.website = website ? website.trim() : null;
    }

    if (contactEmail !== undefined) {
      updateData.contactEmail = contactEmail ? contactEmail.trim() : null;
    }

    if (contactPhone !== undefined) {
      updateData.contactPhone = contactPhone ? contactPhone.trim() : null;
    }

    const updatedCollege = await prisma.college.update({
      where: { id: collegeId },
      data: updateData,
      include: {
        branches: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "College updated successfully",
      college: updatedCollege,
    });
  } catch (error) {
    console.error("Update college error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error updating college",
    });
  }
});

// -------------------------------------------------------------
// 5. DELETE COLLEGE
// Endpoint: DELETE /api/colleges/:id
// Protected: ADMIN only
// -------------------------------------------------------------
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
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
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found to delete",
      });
    }

    await prisma.college.delete({
      where: { id: collegeId },
    });

    return res.status(200).json({
      success: true,
      message: "College and all associated branches deleted successfully",
    });
  } catch (error) {
    console.error("Delete college error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error deleting college",
    });
  }
});

// -------------------------------------------------------------
// 6. ADD BRANCH TO COLLEGE
// Endpoint: POST /api/colleges/:id/branches
// Protected: ADMIN only
// -------------------------------------------------------------
router.post("/:id/branches", authenticateToken, requireAdmin, async (req, res) => {
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
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found to add branch to",
      });
    }

    const { name, code, durationYears, seats } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Branch name and branch code are required",
      });
    }

    const normalizedCode = code.trim().toUpperCase();

    const existingBranch = await prisma.branch.findUnique({
      where: {
        collegeId_code: {
          collegeId,
          code: normalizedCode,
        },
      },
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: `Branch '${normalizedCode}' already exists for this college`,
      });
    }

    let parsedDuration = 3;

    if (durationYears !== undefined && durationYears !== null && durationYears !== "") {
      parsedDuration = parseInt(durationYears, 10);

      if (isNaN(parsedDuration) || parsedDuration < 1 || parsedDuration > 6) {
        return res.status(400).json({
          success: false,
          message: "Duration must be between 1 and 6 years",
        });
      }
    }

    let parsedSeats = 60;

    if (seats !== undefined && seats !== null && seats !== "") {
      parsedSeats = parseInt(seats, 10);

      if (isNaN(parsedSeats) || parsedSeats <= 0) {
        return res.status(400).json({
          success: false,
          message: "Seats intake must be a positive integer",
        });
      }
    }

    const newBranch = await prisma.branch.create({
      data: {
        name: name.trim(),
        code: normalizedCode,
        durationYears: parsedDuration,
        seats: parsedSeats,
        collegeId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Branch added to college successfully",
      branch: newBranch,
    });
  } catch (error) {
    console.error("Add branch to college error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error adding branch to college",
    });
  }
});

// -------------------------------------------------------------
// 7. GET ALL BRANCHES OF A COLLEGE
// Endpoint: GET /api/colleges/:id/branches
// -------------------------------------------------------------
router.get("/:id/branches", async (req, res) => {
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
    });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found",
      });
    }

    const branches = await prisma.branch.findMany({
      where: { collegeId },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({
      success: true,
      college: {
        id: college.id,
        name: college.name,
        code: college.code,
      },
      count: branches.length,
      branches,
    });
  } catch (error) {
    console.error("Get college branches error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error fetching branches",
    });
  }
});

// -------------------------------------------------------------
// 8. DELETE A BRANCH FROM A COLLEGE
// Endpoint: DELETE /api/colleges/:collegeId/branches/:branchId
// Protected: ADMIN only
// -------------------------------------------------------------
router.delete(
  "/:collegeId/branches/:branchId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const collegeId = parseInt(req.params.collegeId, 10);
      const branchId = parseInt(req.params.branchId, 10);

      if (isNaN(collegeId) || isNaN(branchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid college ID or branch ID",
        });
      }

      const branch = await prisma.branch.findFirst({
        where: {
          id: branchId,
          collegeId,
        },
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found for this college",
        });
      }

      await prisma.branch.delete({
        where: { id: branchId },
      });

      return res.status(200).json({
        success: true,
        message: "Branch deleted successfully",
      });
    } catch (error) {
      console.error("Delete branch error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error deleting branch",
      });
    }
  }
);

module.exports = router;
