// Initialisation d'une base de PRODUCTION vide (PostgreSQL, Vercel) : cree uniquement le compte
// administrateur, la boutique principale et sa caisse. Aucune donnee de demonstration.
// Idempotent : ne fait rien si un administrateur existe deja.
//
// Usage (PowerShell) :
//   $env:DATABASE_URL="postgresql://..."; $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."
//   npm run db:init-prod
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const REF_PREFIXES = { store: "BTQ", user: "USR", cashRegister: "CSE" };

async function ref(tx, kind) {
  const year = new Date().getFullYear();
  const key = `${kind}-${year}`;
  const counter = await tx.referenceCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${REF_PREFIXES[kind]}-${year}-${String(counter.value).padStart(6, "0")}`;
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Administrateur Kawsara";
  const storeName = process.env.STORE_NAME?.trim() || "Boutique principale - Touba";

  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL manquant ou invalide.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD doit contenir au moins 12 caracteres.");
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(`Un administrateur existe deja (${existingAdmin.email}) : rien a faire.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const store =
      (await tx.store.findFirst({ orderBy: { createdAt: "asc" } })) ??
      (await tx.store.create({
        data: { reference: await ref(tx, "store"), name: storeName, address: "Touba, Senegal" },
      }));

    const registers = await tx.cashRegister.count({ where: { storeId: store.id } });
    if (registers === 0) {
      await tx.cashRegister.create({
        data: { reference: await ref(tx, "cashRegister"), storeId: store.id, name: "Caisse 1", number: "C1" },
      });
    }

    await tx.user.create({
      // Premier administrateur = admin principal (seul autorise aux actions dangereuses).
      data: { reference: await ref(tx, "user"), name, email, passwordHash, role: "ADMIN", isPrincipalAdmin: true },
    });
  });

  console.log(`Administrateur principal ${email} cree, boutique "${storeName}" et "Caisse 1" prets.`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
