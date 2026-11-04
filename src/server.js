// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const authRoutes = require("./routes/auth.routes");

const app = express();

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

// Define server port from environment variables or default to 5001
const PORT = process.env.PORT || 5001;

// Start Express server only when running this file directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
