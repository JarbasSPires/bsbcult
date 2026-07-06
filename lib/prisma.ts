import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Works for both a local SQLite file (dev: DATABASE_URL="file:./prisma/dev.db",
// no auth token needed) and a remote Turso database (prod: DATABASE_URL="libsql://...",
// TURSO_AUTH_TOKEN set) — libSQL is wire-compatible with SQLite either way.
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
