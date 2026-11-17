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
const isProduction = process.env.NODE_ENV === "production";

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://localhost:5001",
];

/**
 * Normalizes a URL string to its origin using the standard URL API.
 * Accepts only http: and https: protocols.
 * Returns null if the URL is invalid, malformed, or uses another protocol.
 */
function normalizeOrigin(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  const trimmed = urlStr.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (parsed.origin && parsed.origin !== "null") {
      return parsed.origin;
    }
  } catch {
    // Malformed URL entry
    return null;
  }
  return null;
}

/**
 * Parses and normalizes FRONTEND_URL as a comma-separated list of origins.
 * Ignores empty entries and warns about malformed values.
 */
function getConfiguredOrigins() {
  const raw = process.env.FRONTEND_URL || "";
  const entries = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  const origins = [];

  for (const entry of entries) {
    const origin = normalizeOrigin(entry);
    if (origin) {
      origins.push(origin);
    } else {
      console.warn(`[CORS] Invalid origin in FRONTEND_URL ignored: "${entry}"`);
    }
  }

  return origins;
}

const configuredOrigins = getConfiguredOrigins();

const ALLOWED_ORIGINS = new Set(
  isProduction ? configuredOrigins : [...DEV_ORIGINS, ...configuredOrigins]
);

app.use(
  cors({
    origin: function (origin, callback) {
      // Electron production sends origin: 'null' (file:// protocol) or undefined for same-origin / non-browser requests
      if (!origin || origin === "null") {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (normalizedOrigin && ALLOWED_ORIGINS.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse incoming JSON request bodies.
// `strict: false` allows primitive JSON values (e.g. `null`, `true`, numbers)
// to be parsed so route-level validation can reject them with the app's own
// structured "Validation failed" response instead of a raw body-parser error.
app.use(express.json({ strict: false }));

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
      console.warn("[Production Warning] AI_SERVICE_URL is not set. AI features (chat, recommendations, predictions) will return 503 until the deployed AI service URL is configured.");
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
