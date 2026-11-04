const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

// -------------------------------------------------------------
// 1. SIGNUP API - Register a new user
// Endpoint: POST /api/auth/signup
// -------------------------------------------------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate that all required fields are present
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Hash the password with bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save the new user in database
    // Normal signup always gets the role "STUDENT"
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    // Return success response without the password
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during signup",
    });
  }
});

// -------------------------------------------------------------
// 2. LOGIN API - Authenticate user and issue JWT
// Endpoint: POST /api/auth/login
// -------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find the user by email in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    // If user does not exist
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare submitted password with hashed password in database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token with user id and email
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return token and user information (excluding password)
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
});

// -------------------------------------------------------------
// 3. GET PROFILE API - Fetch logged-in user profile
// Endpoint: GET /api/auth/me
// Protected by authenticateToken middleware
// -------------------------------------------------------------
router.get("/me", authenticateToken, async (req, res) => {
  try {
    // The user ID was attached to req.user by authenticateToken middleware
    const userId = req.user.id;

    // Fetch user details from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If user record no longer exists in database
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return basic user information without password
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching profile",
    });
  }
});

// -------------------------------------------------------------
// 4. LOGOUT API - Client-side logout guidance
// Endpoint: POST /api/auth/logout
// -------------------------------------------------------------
router.post("/logout", (req, res) => {
  // Stateless JWT tokens are stored by the client (e.g. in localStorage or cookies).
  // Logout is performed by having the client delete the stored token.
  return res.status(200).json({
    success: true,
    message: "Logout successful. Please remove your stored token on the client side.",
  });
});

module.exports = router;

