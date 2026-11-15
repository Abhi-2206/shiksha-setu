// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/auth.routes");
const studentRoutes = require("./routes/student.routes");
const collegeRoutes = require("./routes/college.routes");
const cutoffRoutes = require("./routes/cutoff.routes");

const app = express();

// ---------------------------------------------------------------------------
// CORS — allow requests from the Vite dev server and the Electron renderer.
// In production Electron the renderer origin is 'null' (file:// protocol) or
// 'http://localhost:5173'. We only permit localhost origins; never wildcard.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173', // Vite dev server
  'http://localhost:5174', // Vite fallback port
  'http://localhost:5001', // Self (health check / same-origin)
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Electron production sends origin: 'null' (file:// protocol).
  // Requests without an Origin header are same-origin or server-to-server — allow them.
  if (!origin || origin === 'null') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Health-check route to verify backend is up and running
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running successfully",
  });
});

// Register authentication routes under /api/auth prefix
app.use("/api/auth", authRoutes);

// Register student profile routes under /api/students prefix
app.use("/api/students", studentRoutes);

// Register college & branch routes under /api/colleges prefix
app.use("/api/colleges", collegeRoutes);

// Register admission cutoff routes under /api/cutoffs prefix
app.use("/api/cutoffs", cutoffRoutes);

// Define server port from environment variables or default to 5001
const PORT = process.env.PORT || 5001;

// Start Express server only when running this file directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
