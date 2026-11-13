const prisma = require("../lib/prisma");

// Middleware to check if the authenticated user has the ADMIN role.
// This middleware MUST be used AFTER authenticateToken middleware,
// because it relies on req.user being set by authenticateToken first.
//
// Usage in a route:
//   router.post("/", authenticateToken, requireAdmin, handlerFunction)

async function requireAdmin(req, res, next) {
  try {
    // req.user is set by authenticateToken middleware (contains id and email)
    const userId = req.user.id;

    // Look up the full user record in the database to get the role
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If the user no longer exists in the database
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please log in again.",
      });
    }

    // Check if the user's role is ADMIN
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    // User is an ADMIN — allow the request to continue
    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authorization",
    });
  }
}

module.exports = requireAdmin;

