// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const studentRoutes = require("./routes/student.routes");
const chatRoutes = require("./routes/chat.routes");
const aiRoutes = require("./routes/ai.routes");
const collegeRoutes = require("./routes/college.routes");
const cutoffRoutes = require("./routes/cutoff.routes");
const errorHandler = require("./middleware/errorHandler.middleware");

const app = express();

// ============================================================================
// CORS Configuration
// Supports Vite dev server, Electron desktop renderer, and production URL.
// ============================================================================
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://localhost:5001",
  process.env.FRONTEND_URL,
].filter(Boolean));

app.use(
  cors({
    origin: function (origin, callback) {
      // Electron production sends origin: 'null' (file:// protocol) or undefined for same-origin
      if (!origin || origin === "null" || ALLOWED_ORIGINS.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Health-check route to verify backend is up and running
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running successfully",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Route Registrations
// ============================================================================
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/students", studentRoutes); // Supports both singular and plural conventions
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/cutoffs", cutoffRoutes);

// Centralized error handler
app.use(errorHandler);

// Define server port from environment variables or default to 5001
const PORT = process.env.PORT || 5001;

/**
 * Validates critical environment variables before launching the server.
 * Ensures the process fails fast with clear logs if required configurations are missing.
 */
function validateEnvironment() {
  const missing = [];

  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    missing.push("DATABASE_URL");
  }

  if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    missing.push("JWT_SECRET");
  }

  if (missing.length > 0) {
    console.error(`\n[FATAL STARTUP ERROR] Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("Please configure these variables in your hosting provider's environment settings or local .env file before starting the server.\n");
    process.exit(1);
  }

  // Non-blocking production environment checks
  if (process.env.NODE_ENV === "production") {
    if (!process.env.FRONTEND_URL || !process.env.FRONTEND_URL.trim()) {
      console.warn("[Production Warning] FRONTEND_URL is not set. Cross-origin web clients may be blocked by CORS.");
    }
    if (!process.env.AI_SERVICE_URL || !process.env.AI_SERVICE_URL.trim()) {
      console.warn("[Production Warning] AI_SERVICE_URL is not set and will default to http://localhost:8000.");
    }
  }
}

// Start Express server only when running this file directly
if (require.main === module) {
  validateEnvironment();

  const server = app.listen(PORT, () => {
    console.log(`Shiksha Setu Backend Server is running on port ${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n[Server Error] Port ${PORT} is already in use.`);
      console.error(`To free port ${PORT}, run: lsof -ti:${PORT} | xargs kill -9\n`);
      process.exit(1);
    } else {
      console.error("\n[Server Error] Failed to start server:", err.message);
      process.exit(1);
    }
  });
}

module.exports = app;
