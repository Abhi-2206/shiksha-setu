const prisma = require("../lib/prisma");

/**
 * Service for College and CollegeCutoff operations.
 * Enforces role access rules:
 * - Read operations (list colleges, get cutoffs) are open to all authenticated students and public.
 * - Create, update, and delete operations on official college or cutoff data are
 *   strictly restricted to ADMINISTRATORS (role === 'ADMIN').
 * - Students attempting to create/modify colleges or cutoffs receive 403 Forbidden.
 */
class CollegeService {
  /**
   * Lists colleges with optional filters (location, type, district, active).
   * Open to students and public.
   */
  async listColleges(filters = {}) {
    const where = {};
    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }
    if (filters.district) {
      where.district = { contains: filters.district, mode: "insensitive" };
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.isActive !== undefined) {
      where.isActive = Boolean(filters.isActive);
    }

    return await prisma.college.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { cutoffs: true },
        },
      },
    });
  }

  /**
   * Retrieves a single college with its cutoffs.
   */
  async getCollege(collegeId) {
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        cutoffs: {
          orderBy: [{ admissionYear: "desc" }, { closingRank: "asc" }],
        },
      },
    });

    if (!college) {
      const error = new Error("College not found");
      error.statusCode = 404;
      throw error;
    }

    return college;
  }

  /**
   * Creates a college record.
   * Strictly restricted to ADMINISTRATORS only.
   */
  async createCollege(collegeData, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    if (requestingUser.role !== "ADMIN") {
      const error = new Error("Forbidden: Only administrators can create or manage official college records");
      error.statusCode = 403;
      throw error;
    }

    if (!collegeData.code || !collegeData.name || !collegeData.location) {
      const error = new Error("code, name, and location are required fields");
      error.statusCode = 400;
      throw error;
    }

    return await prisma.college.create({
      data: {
        code: collegeData.code.trim().toUpperCase(),
        name: collegeData.name.trim(),
        location: collegeData.location.trim(),
        district: collegeData.district ? collegeData.district.trim() : null,
        state: collegeData.state || "Rajasthan",
        type: collegeData.type || "Government",
        establishedYear: collegeData.establishedYear ? parseInt(collegeData.establishedYear, 10) : null,
        website: collegeData.website,
        contactEmail: collegeData.contactEmail,
        contactPhone: collegeData.contactPhone,
        address: collegeData.address,
        isActive: collegeData.isActive !== undefined ? Boolean(collegeData.isActive) : true,
      },
    });
  }

  /**
   * Updates an existing college record.
   * Strictly restricted to ADMINISTRATORS only.
   */
  async updateCollege(collegeId, collegeData, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    if (requestingUser.role !== "ADMIN") {
      const error = new Error("Forbidden: Only administrators can update official college records");
      error.statusCode = 403;
      throw error;
    }

    return await prisma.college.update({
      where: { id: collegeId },
      data: collegeData,
    });
  }

  /**
   * Deletes a college record.
   * Strictly restricted to ADMINISTRATORS only.
   */
  async deleteCollege(collegeId, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    if (requestingUser.role !== "ADMIN") {
      const error = new Error("Forbidden: Only administrators can delete official college records");
      error.statusCode = 403;
      throw error;
    }

    return await prisma.college.delete({
      where: { id: collegeId },
    });
  }

  /**
   * Adds an official cutoff record for a college.
   * Strictly restricted to ADMINISTRATORS only.
   */
  async createCutoff(cutoffData, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    if (requestingUser.role !== "ADMIN") {
      const error = new Error("Forbidden: Only administrators can add official cutoff records");
      error.statusCode = 403;
      throw error;
    }

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
    } = cutoffData;

    if (!collegeId || !courseName || !category || !admissionYear || !openingRank || !closingRank || !source) {
      const error = new Error("Missing required cutoff fields");
      error.statusCode = 400;
      throw error;
    }

    return await prisma.collegeCutoff.create({
      data: {
        collegeId: parseInt(collegeId, 10),
        courseName: courseName.trim(),
        category,
        admissionYear: parseInt(admissionYear, 10),
        openingRank: parseInt(openingRank, 10),
        closingRank: parseInt(closingRank, 10),
        round: parseInt(round, 10) || 1,
        source: source.trim(),
        sourceYear: parseInt(sourceYear || admissionYear, 10),
      },
    });
  }

  /**
   * Queries cutoff records matching student criteria (course, category, max rank).
   */
  async getCutoffs(filters = {}) {
    const where = {};
    if (filters.collegeId) where.collegeId = parseInt(filters.collegeId, 10);
    if (filters.courseName) where.courseName = { contains: filters.courseName, mode: "insensitive" };
    if (filters.category) where.category = filters.category;
    if (filters.admissionYear) where.admissionYear = parseInt(filters.admissionYear, 10);
    if (filters.maxClosingRank) where.closingRank = { gte: parseInt(filters.maxClosingRank, 10) };

    return await prisma.collegeCutoff.findMany({
      where,
      orderBy: [{ admissionYear: "desc" }, { closingRank: "asc" }],
      include: {
        college: {
          select: {
            code: true,
            name: true,
            location: true,
            type: true,
          },
        },
      },
    });
  }
}

module.exports = new CollegeService();
