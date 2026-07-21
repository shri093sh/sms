import { PrismaClient } from "@prisma/client";

// Singleton so dev's --watch restarts don't open a new pool every reload.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
