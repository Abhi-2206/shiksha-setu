// Import PrismaClient from the @prisma/client package
const { PrismaClient } = require("@prisma/client");

// Initialize a single PrismaClient instance for database queries
const prisma = new PrismaClient();

// Export the prisma instance for use in other files
module.exports = prisma;

