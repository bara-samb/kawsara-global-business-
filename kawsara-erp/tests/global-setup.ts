import path from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });

  // Mode WAL + busy_timeout genereux : les fichiers de test s'enchainent sur la meme base
  // SQLite, et le verrouillage exclusif par defaut de SQLite (surtout sous Windows) provoque
  // sinon des timeouts intermittents entre deux fichiers de test consecutifs.
  process.env.DATABASE_URL = "file:./test.db";
  const prisma = new PrismaClient();
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 15000;");
  await prisma.$disconnect();
}
