import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// ---------------------------------------------------------------------------
// Prisma client singleton
//
// Prevents multiple PrismaClient instances during Next.js hot-reload in dev.
// Uses libsql adapter for SQLite support under Prisma 7.
// ---------------------------------------------------------------------------

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
  return new PrismaClient({ adapter });
}

// In production/test, always create a fresh client.
// In development, cache the client on the global object to survive hot reloads.
declare const globalThis: {
  _prismaGlobal?: PrismaClient;
} & typeof global;

export const prisma: PrismaClient =
  globalThis._prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis._prismaGlobal = prisma;
}
