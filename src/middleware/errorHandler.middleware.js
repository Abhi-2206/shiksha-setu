/**
 * Centralized Error Handling Middleware for Express Application.
 * Standardizes error responses and logs details without leaking credentials or stack traces.
 */

function errorHandler(err, req, res, next) {
  // Determine HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Log error details server-side
  if (statusCode >= 500) {
    console.error(`[InternalServerError] ${req.method} ${req.url}:`, err);
  } else {
    console.warn(`[ClientError ${statusCode}] ${req.method} ${req.url}: ${err.message}`);
  }

  // Handle specific Prisma database errors
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A unique constraint violation occurred in the database.",
      fields: err.meta?.target || null,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "The requested record was not found.",
    });
  }

  // Standard JSON response
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? "An internal server error occurred. Please try again later."
      : (err.message || "An error occurred processing your request."),
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = errorHandler;
