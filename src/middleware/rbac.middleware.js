/**
 * Role-Based Access Control (RBAC) and Ownership Authorization Middleware.
 * 
 * Rules enforced:
 * - Students:
 *   - Can access and update only their own profile.
 *   - Can view and manage only their own chat sessions and messages.
 *   - Cannot assign themselves administrator privileges.
 *   - Cannot modify official college or cutoff records.
 * - Administrators:
 *   - Can manage official college and cutoff records.
 *   - Can access administrative functionality only after server-side role verification.
 * - All users:
 *   - Must be authenticated for protected operations.
 *   - Must not access another user's private records by changing an ID in an API request.
 */

/**
 * Checks whether the authenticated user has one of the required roles.
 * @param {...string} allowedRoles - Roles permitted to access the route (e.g., 'ADMIN', 'STUDENT')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(", ")}] roles`,
      });
    }

    next();
  };
}

/**
 * Middleware ensuring that the authenticated user is either accessing their own
 * resource or is an administrator.
 * 
 * Extracts target user ID from req.params.userId, req.params.id, or req.body.userId.
 */
function requireSelfOrAdmin(paramKey = "userId") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const targetUserId = parseInt(
      req.params[paramKey] || req.body[paramKey] || req.query[paramKey],
      10
    );

    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing user ID in parameter '${paramKey}'`,
      });
    }

    const isSelf = req.user.id === targetUserId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to access or modify records of another user",
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requireAdmin: requireRole("ADMIN"),
  requireStudent: requireRole("STUDENT"),
  requireSelfOrAdmin,
};
