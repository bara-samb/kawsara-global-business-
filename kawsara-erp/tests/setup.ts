// Le schema est applique une seule fois par tests/global-setup.ts (globalSetup vitest).
// Ce fichier ne fait que garantir que les variables d'environnement sont definies avant
// que les modules applicatifs (prisma, captcha, auth...) ne soient importes.
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-not-for-production-0123456789";
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./test.db";

import { beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

// busy_timeout est une option par connexion (contrairement a journal_mode=WAL, deja applique
// une fois par tests/global-setup.ts) : chaque fichier de test doit la redefinir.
beforeAll(async () => {
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 15000;");
});
