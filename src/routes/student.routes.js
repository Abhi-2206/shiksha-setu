const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");

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

module.exports = router;

