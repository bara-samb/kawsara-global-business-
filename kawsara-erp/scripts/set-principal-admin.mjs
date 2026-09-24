// Designe l'admin principal (seul compte autorise a executer les actions dangereuses).
// Usage : npm run admin:principal -- admin@kawsara.com
// Retire le statut a tout autre compte : il n'y a jamais qu'un seul admin principal.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.toLowerCase();

if (!email) {
  console.error("Usage : npm run admin:principal -- <email>");
  process.exit(1);
}

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Aucun compte avec l'email ${email}.`);
  if (user.role !== "ADMIN") throw new Error(`${email} n'a pas le role ADMIN (role actuel : ${user.role}).`);

  await prisma.$transaction([
    prisma.user.updateMany({ where: { isPrincipalAdmin: true }, data: { isPrincipalAdmin: false } }),
    prisma.user.update({ where: { id: user.id }, data: { isPrincipalAdmin: true, active: true } }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SET_PRINCIPAL_ADMIN",
        entity: "User",
        entityId: user.id,
        metadata: "Designe via scripts/set-principal-admin.mjs",
      },
    }),
  ]);
  console.log(`${email} est maintenant l'admin principal. Il doit se reconnecter pour voir les actions reservees.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
