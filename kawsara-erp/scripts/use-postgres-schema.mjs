// Utilise uniquement PENDANT le build Docker (voir Dockerfile). Le developpement local continue
// a utiliser SQLite (prisma/schema.prisma inchange sur la machine du developpeur) : ce script ne
// modifie le schema qu'a l'INTERIEUR de l'image Docker, jamais sur la machine hote.
import fs from "node:fs";

const schemaPath = "prisma/schema.prisma";
const schema = fs.readFileSync(schemaPath, "utf8");
const updated = schema.replace('provider = "sqlite"', 'provider = "postgresql"');

if (updated === schema) {
  throw new Error('Impossible de trouver provider = "sqlite" dans prisma/schema.prisma.');
}

fs.writeFileSync(schemaPath, updated);
console.log("prisma/schema.prisma bascule sur PostgreSQL pour le build Docker.");
