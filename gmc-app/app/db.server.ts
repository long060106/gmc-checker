import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

// Two ways to reach the database:
// - TURSO_DATABASE_URL set (production on Render's free tier, whose disk is wiped on every restart):
//   a hosted libSQL (SQLite-compatible) database at Turso, through Prisma's driver adapter.
// - otherwise (local dev): the plain SQLite file in DATABASE_URL, e.g. file:dev.sqlite.
export function createPrismaClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return new PrismaClient();
  const adapter = new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  return new PrismaClient({ adapter });
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = createPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? createPrismaClient();

export default prisma;
