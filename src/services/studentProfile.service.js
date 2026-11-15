const prisma = require("../lib/prisma");

/**
 * Service for StudentProfile operations with strict database access rules:
 * - Students can only access and update their own profile.
 * - Administrators can access and update any profile.
 * - Students CANNOT assign themselves administrator privileges.
 */
class StudentProfileService {
  /**
   * Retrieves a student profile by user ID.
   * Enforces that requestingUser is either the owner or an ADMIN.
   */
  async getProfile(targetUserId, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const isSelf = requestingUser.id === targetUserId;
    const isAdmin = requestingUser.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      const error = new Error("Forbidden: You cannot view another student's profile");
      error.statusCode = 403;
      throw error;
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: targetUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return profile;
  }

  /**
   * Upserts a student profile.
   * Enforces that requestingUser is either the owner or an ADMIN.
   * Prevents any modification of role or userId.
   */
  async upsertProfile(targetUserId, requestingUser, profileData) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const isSelf = requestingUser.id === targetUserId;
    const isAdmin = requestingUser.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      const error = new Error("Forbidden: You cannot modify another student's profile");
      error.statusCode = 403;
      throw error;
    }

    // Explicitly verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Whitelist and sanitize profile fields
    const sanitizedData = {
      fullName: profileData.fullName,
      phoneNumber: profileData.phoneNumber,
      alternatePhone: profileData.alternatePhone,
      dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
      gender: profileData.gender,
      address: profileData.address,
      district: profileData.district,
      state: profileData.state || "Rajasthan",
      pincode: profileData.pincode,
      isRajasthanDomicile: profileData.isRajasthanDomicile !== undefined ? Boolean(profileData.isRajasthanDomicile) : true,
      qualifyingExam: profileData.qualifyingExam,
      tenthPercentage: profileData.tenthPercentage !== undefined ? parseFloat(profileData.tenthPercentage) : undefined,
      twelfthPercentage: profileData.twelfthPercentage !== undefined ? parseFloat(profileData.twelfthPercentage) : undefined,
      diplomaPercentage: profileData.diplomaPercentage !== undefined ? parseFloat(profileData.diplomaPercentage) : undefined,
      examRank: profileData.examRank !== undefined ? parseInt(profileData.examRank, 10) : undefined,
      examRollNumber: profileData.examRollNumber,
      category: profileData.category || "GEN",
      subCategory: profileData.subCategory,
      preferredCourse: profileData.preferredCourse,
      preferredLocation: profileData.preferredLocation,
      preferredCollegeType: profileData.preferredCollegeType,
    };

    // Remove undefined fields
    Object.keys(sanitizedData).forEach(
      (key) => sanitizedData[key] === undefined && delete sanitizedData[key]
    );

    const profile = await prisma.studentProfile.upsert({
      where: { userId: targetUserId },
      update: sanitizedData,
      create: {
        userId: targetUserId,
        ...sanitizedData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return profile;
  }

  /**
   * Updates user role. Strictly restricted to ADMINISTRATORS only.
   * Throws 403 if a student attempts to promote themselves or anyone else.
   */
  async updateUserRole(targetUserId, newRole, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    if (requestingUser.role !== "ADMIN") {
      const error = new Error("Forbidden: Only administrators can modify user roles");
      error.statusCode = 403;
      throw error;
    }

    if (!["STUDENT", "ADMIN"].includes(newRole)) {
      const error = new Error("Invalid role specified");
      error.statusCode = 400;
      throw error;
    }

    return await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });
  }
}

module.exports = new StudentProfileService();
