const { PrismaClient } = require("@prisma/client");

// Prisma setup
const prisma = new PrismaClient();

module.exports = prisma;
