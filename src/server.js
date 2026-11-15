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
// Restricts origin to Vite dev server and configurable production origin.
// Wildcards are strictly prevented when credentials are enabled.
// ============================================================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        const corsError = new Error(`CORS policy violation: Origin '${origin}' is not authorized.`);
        corsError.statusCode = 403;
        return callback(corsError);
      }
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
app.use("/api/students", studentRoutes); // Alias for plural convention
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/cutoffs", cutoffRoutes);

// Centralized error handler
app.use(errorHandler);

// Define server port from environment variables or default to 5001
const PORT = process.env.PORT || 5001;

// Start Express server only when running this file directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Shiksha Setu Backend Server is running on port ${PORT}`);
  });
}

module.exports = app;
