const jwt = require("jsonwebtoken");

// Middleware function to verify JWT Bearer token
function authenticateToken(req, res, next) {
  // Step 1: Read Authorization header from the request
  const authHeader = req.headers["authorization"];

  // Step 2: Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header is missing",
    });
  }

  // Step 3: Check if header follows Bearer format ("Bearer <token>")
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid token format. Use Bearer <token>",
    });
  }

  // Step 4: Extract the actual token string after "Bearer "
  const token = authHeader.split(" ")[1];

  // If token string is empty after Bearer prefix
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token is missing",
    });
  }

  try {
    // Step 5: Verify token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 6: Attach user data (e.g. id, email) to the request object
    req.user = decoded;

    // Step 7: Pass control to the next handler
    next();
  } catch (error) {
    // Step 8: Return error if token is invalid or expired
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;

