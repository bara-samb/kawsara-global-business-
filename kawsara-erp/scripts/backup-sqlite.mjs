// Sauvegarde locale de la base SQLite de developpement (voir docs/RESTAURATION.md).
// Usage : node scripts/backup-sqlite.mjs
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve("prisma/dev.db");
if (!fs.existsSync(dbPath)) {
  console.error(`Base introuvable : ${dbPath}`);
  process.exit(1);
}

const backupDir = path.resolve("backups");
fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = path.join(backupDir, `dev-${timestamp}.db`);
fs.copyFileSync(dbPath, destination);

console.log(`Sauvegarde creee : ${destination}`);
