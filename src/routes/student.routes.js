const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/admin.middleware");

const router = express.Router();

// -------------------------------------------------------------
// 1. GET STUDENT PROFILE
// Endpoint: GET /api/students/profile
// Protected by authenticateToken middleware
// -------------------------------------------------------------
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find profile of the authenticated student
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: userId },
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

    // If profile does not exist yet
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student profile retrieved successfully",
      profile: profile,
    });
  } catch (error) {
    console.error("Get student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error retrieving student profile",
    });
  }
});

// -------------------------------------------------------------
// 2. CREATE STUDENT PROFILE
// Endpoint: POST /api/students/profile
// Protected by authenticateToken middleware
// -------------------------------------------------------------
router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if profile already exists for this student
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: userId },
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: "Student profile already exists for this user",
      });
    }

    const {
      dateOfBirth,
      gender,
      phoneNumber,
      state,
      district,
      city,
      currentEducationLevel,
      instituteName,
      courseOrStream,
      passingYear,
      percentageOrCgpa,
    } = req.body;

    // Validate dateOfBirth format if provided
    let parsedDob = null;
    if (dateOfBirth) {
      parsedDob = new Date(dateOfBirth);
      if (isNaN(parsedDob.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date of birth format. Use YYYY-MM-DD",
        });
      }
    }

    // Validate passingYear if provided
    let parsedPassingYear = null;
    if (passingYear !== undefined && passingYear !== null && passingYear !== "") {
      parsedPassingYear = parseInt(passingYear, 10);
      if (isNaN(parsedPassingYear) || parsedPassingYear < 1980 || parsedPassingYear > 2050) {
        return res.status(400).json({
          success: false,
          message: "Passing year must be a valid 4-digit year between 1980 and 2050",
        });
      }
    }

    // Validate percentageOrCgpa if provided
    let parsedScore = null;
    if (percentageOrCgpa !== undefined && percentageOrCgpa !== null && percentageOrCgpa !== "") {
      parsedScore = parseFloat(percentageOrCgpa);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage or CGPA must be a valid number between 0 and 100",
        });
      }
    }

    // Create the student profile in database
    const newProfile = await prisma.studentProfile.create({
      data: {
        userId: userId,
        dateOfBirth: parsedDob,
        gender: gender || null,
        phoneNumber: phoneNumber || null,
        state: state || "Rajasthan",
        district: district || null,
        city: city || null,
        currentEducationLevel: currentEducationLevel || null,
        instituteName: instituteName || null,
        courseOrStream: courseOrStream || null,
        passingYear: parsedPassingYear,
        percentageOrCgpa: parsedScore,
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

    return res.status(201).json({
      success: true,
      message: "Student profile created successfully",
      profile: newProfile,
    });
  } catch (error) {
    console.error("Create student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error creating student profile",
    });
  }
});

// -------------------------------------------------------------
// 3. UPDATE STUDENT PROFILE
// Endpoint: PUT /api/students/profile
// Protected by authenticateToken middleware
// -------------------------------------------------------------
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if profile exists for this student
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: userId },
    });

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found. Please create a profile first.",
      });
    }

    const {
      dateOfBirth,
      gender,
      phoneNumber,
      state,
      district,
      city,
      currentEducationLevel,
      instituteName,
      courseOrStream,
      passingYear,
      percentageOrCgpa,
    } = req.body;

    // Validate dateOfBirth format if provided
    let parsedDob;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        parsedDob = null;
      } else {
        parsedDob = new Date(dateOfBirth);
        if (isNaN(parsedDob.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth format. Use YYYY-MM-DD",
          });
        }
      }
    }

    // Validate passingYear if provided
    let parsedPassingYear;
    if (passingYear !== undefined) {
      if (passingYear === null || passingYear === "") {
        parsedPassingYear = null;
      } else {
        parsedPassingYear = parseInt(passingYear, 10);
        if (isNaN(parsedPassingYear) || parsedPassingYear < 1980 || parsedPassingYear > 2050) {
          return res.status(400).json({
            success: false,
            message: "Passing year must be a valid 4-digit year between 1980 and 2050",
          });
        }
      }
    }

    // Validate percentageOrCgpa if provided
    let parsedScore;
    if (percentageOrCgpa !== undefined) {
      if (percentageOrCgpa === null || percentageOrCgpa === "") {
        parsedScore = null;
      } else {
        parsedScore = parseFloat(percentageOrCgpa);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
          return res.status(400).json({
            success: false,
            message: "Percentage or CGPA must be a valid number between 0 and 100",
          });
        }
      }
    }

    // Build update data object
    const updateData = {};
    if (dateOfBirth !== undefined) updateData.dateOfBirth = parsedDob;
    if (gender !== undefined) updateData.gender = gender;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (state !== undefined) updateData.state = state;
    if (district !== undefined) updateData.district = district;
    if (city !== undefined) updateData.city = city;
    if (currentEducationLevel !== undefined) updateData.currentEducationLevel = currentEducationLevel;
    if (instituteName !== undefined) updateData.instituteName = instituteName;
    if (courseOrStream !== undefined) updateData.courseOrStream = courseOrStream;
    if (passingYear !== undefined) updateData.passingYear = parsedPassingYear;
    if (percentageOrCgpa !== undefined) updateData.percentageOrCgpa = parsedScore;

    // Update the profile in database
    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: userId },
      data: updateData,
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

    return res.status(200).json({
      success: true,
      message: "Student profile updated successfully",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Update student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating student profile",
    });
  }
});

// -------------------------------------------------------------
// 4. DELETE STUDENT PROFILE
// Endpoint: DELETE /api/students/profile
// Protected by authenticateToken middleware
// -------------------------------------------------------------
router.delete("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if profile exists for this student
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: userId },
    });

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found to delete",
      });
    }

    // Delete the student profile (User account remains untouched)
    await prisma.studentProfile.delete({
      where: { userId: userId },
    });

    return res.status(200).json({
      success: true,
      message: "Student profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error deleting student profile",
    });
  }
});

// =============================================================
// STUDENT DIRECTORY MANAGEMENT ENDPOINTS (Admin Only)
// =============================================================

// -------------------------------------------------------------
// 5. GET ALL STUDENTS (Directory listing with search/filter)
// Endpoint: GET /api/students
// Protected: authenticateToken, requireAdmin
// -------------------------------------------------------------
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, district, courseOrStream } = req.query;

    // Build filter conditions dynamically
    const userFilter = {
      role: "STUDENT",
    };

    if (search) {
      const searchTrimmed = search.trim();
      const parsedId = parseInt(searchTrimmed, 10);
      const orConditions = [
        { name: { contains: searchTrimmed, mode: "insensitive" } },
        { email: { contains: searchTrimmed, mode: "insensitive" } },
      ];
      // If the search query is numeric, also search by student user ID
      if (!isNaN(parsedId)) {
        orConditions.push({ id: parsedId });
      }
      userFilter.OR = orConditions;
    }

    if (district || courseOrStream) {
      userFilter.profile = {
        ...(district ? { district: { equals: district.trim(), mode: "insensitive" } } : {}),
        ...(courseOrStream ? { courseOrStream: { contains: courseOrStream.trim(), mode: "insensitive" } } : {}),
      };
    }

    const students = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
      },
      orderBy: { id: "asc" },
    });

    return res.status(200).json({
      success: true,
      count: students.length,
      students: students,
    });
  } catch (error) {
    console.error("Get all students error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching students",
    });
  }
});

// -------------------------------------------------------------
// 6. CREATE NEW STUDENT (User + StudentProfile in Transaction)
// Endpoint: POST /api/students
// Protected: authenticateToken, requireAdmin
// -------------------------------------------------------------
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      dateOfBirth,
      gender,
      phoneNumber,
      state,
      district,
      city,
      currentEducationLevel,
      instituteName,
      courseOrStream,
      passingYear,
      percentageOrCgpa,
    } = req.body;

    // Validate required user fields
    if (!name || !name.trim() || !email || !email.trim() || !password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required to create a student",
      });
    }

    // Validate password length
    if (password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Hash password using bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Validate dateOfBirth format if provided
    let parsedDob = null;
    if (dateOfBirth) {
      parsedDob = new Date(dateOfBirth);
      if (isNaN(parsedDob.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date of birth format. Use YYYY-MM-DD",
        });
      }
    }

    // Validate passingYear if provided
    let parsedPassingYear = null;
    if (passingYear !== undefined && passingYear !== null && passingYear !== "") {
      parsedPassingYear = parseInt(passingYear, 10);
      if (isNaN(parsedPassingYear) || parsedPassingYear < 1980 || parsedPassingYear > 2050) {
        return res.status(400).json({
          success: false,
          message: "Passing year must be between 1980 and 2050",
        });
      }
    }

    // Validate percentageOrCgpa if provided
    let parsedScore = null;
    if (percentageOrCgpa !== undefined && percentageOrCgpa !== null && percentageOrCgpa !== "") {
      parsedScore = parseFloat(percentageOrCgpa);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage or CGPA must be a number between 0 and 100",
        });
      }
    }

    // Create User and StudentProfile together inside a Prisma Transaction
    const newStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          dateOfBirth: parsedDob,
          gender: gender ? gender.trim() : null,
          phoneNumber: phoneNumber ? phoneNumber.trim() : null,
          state: state ? state.trim() : "Rajasthan",
          district: district ? district.trim() : null,
          city: city ? city.trim() : null,
          currentEducationLevel: currentEducationLevel ? currentEducationLevel.trim() : null,
          instituteName: instituteName ? instituteName.trim() : null,
          courseOrStream: courseOrStream ? courseOrStream.trim() : null,
          passingYear: parsedPassingYear,
          percentageOrCgpa: parsedScore,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: profile,
      };
    });

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: newStudent,
    });
  } catch (error) {
    console.error("Create student error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error creating student",
    });
  }
});

// -------------------------------------------------------------
// 7. UPDATE STUDENT (User + StudentProfile in Transaction)
// Endpoint: PUT /api/students/:id
// Protected: authenticateToken, requireAdmin
// -------------------------------------------------------------
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    // Verify student exists and has role 'STUDENT'
    const existingStudent = await prisma.user.findUnique({
      where: { id: studentId },
      include: { profile: true },
    });

    if (!existingStudent || existingStudent.role !== "STUDENT") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const {
      name,
      email,
      password,
      dateOfBirth,
      gender,
      phoneNumber,
      state,
      district,
      city,
      currentEducationLevel,
      instituteName,
      courseOrStream,
      passingYear,
      percentageOrCgpa,
    } = req.body;

    // If email is changing, verify it is not already used
    if (email && email.trim().toLowerCase() !== existingStudent.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another account",
        });
      }
    }

    // Prepare User update data
    const userUpdateData = {};
    if (name !== undefined) userUpdateData.name = name.trim();
    if (email !== undefined) userUpdateData.email = email.trim().toLowerCase();
    if (password !== undefined && password.trim()) {
      userUpdateData.password = await bcrypt.hash(password.trim(), 10);
    }

    // Validate dateOfBirth if provided
    let parsedDob;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        parsedDob = null;
      } else {
        parsedDob = new Date(dateOfBirth);
        if (isNaN(parsedDob.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth format. Use YYYY-MM-DD",
          });
        }
      }
    }

    // Validate passingYear if provided
    let parsedPassingYear;
    if (passingYear !== undefined) {
      if (passingYear === null || passingYear === "") {
        parsedPassingYear = null;
      } else {
        parsedPassingYear = parseInt(passingYear, 10);
        if (isNaN(parsedPassingYear) || parsedPassingYear < 1980 || parsedPassingYear > 2050) {
          return res.status(400).json({
            success: false,
            message: "Passing year must be between 1980 and 2050",
          });
        }
      }
    }

    // Validate percentageOrCgpa if provided
    let parsedScore;
    if (percentageOrCgpa !== undefined) {
      if (percentageOrCgpa === null || percentageOrCgpa === "") {
        parsedScore = null;
      } else {
        parsedScore = parseFloat(percentageOrCgpa);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
          return res.status(400).json({
            success: false,
            message: "Percentage or CGPA must be between 0 and 100",
          });
        }
      }
    }

    // Prepare Profile update data
    const profileUpdateData = {};
    if (dateOfBirth !== undefined) profileUpdateData.dateOfBirth = parsedDob;
    if (gender !== undefined) profileUpdateData.gender = gender ? gender.trim() : null;
    if (phoneNumber !== undefined) profileUpdateData.phoneNumber = phoneNumber ? phoneNumber.trim() : null;
    if (state !== undefined) profileUpdateData.state = state ? state.trim() : "Rajasthan";
    if (district !== undefined) profileUpdateData.district = district ? district.trim() : null;
    if (city !== undefined) profileUpdateData.city = city ? city.trim() : null;
    if (currentEducationLevel !== undefined) profileUpdateData.currentEducationLevel = currentEducationLevel ? currentEducationLevel.trim() : null;
    if (instituteName !== undefined) profileUpdateData.instituteName = instituteName ? instituteName.trim() : null;
    if (courseOrStream !== undefined) profileUpdateData.courseOrStream = courseOrStream ? courseOrStream.trim() : null;
    if (passingYear !== undefined) profileUpdateData.passingYear = parsedPassingYear;
    if (percentageOrCgpa !== undefined) profileUpdateData.percentageOrCgpa = parsedScore;

    // Update User and StudentProfile together in a Transaction
    const updatedStudent = await prisma.$transaction(async (tx) => {
      let user = existingStudent;
      if (Object.keys(userUpdateData).length > 0) {
        user = await tx.user.update({
          where: { id: studentId },
          data: userUpdateData,
        });
      }

      // Upsert profile (handles case where user existed without a profile)
      const profile = await tx.studentProfile.upsert({
        where: { userId: studentId },
        create: {
          userId: studentId,
          ...profileUpdateData,
        },
        update: profileUpdateData,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: profile,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Update student error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating student",
    });
  }
});

// -------------------------------------------------------------
// 8. DELETE STUDENT (Cascades to StudentProfile)
// Endpoint: DELETE /api/students/:id
// Protected: authenticateToken, requireAdmin
// -------------------------------------------------------------
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    // Verify student exists and has role 'STUDENT'
    const existingStudent = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent || existingStudent.role !== "STUDENT") {
      return res.status(404).json({
        success: false,
        message: "Student not found to delete",
      });
    }

    // Delete user in a transaction (StudentProfile is automatically cascade-deleted)
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({
        where: { id: studentId },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Student and associated profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error deleting student",
    });
  }
});

module.exports = router;

