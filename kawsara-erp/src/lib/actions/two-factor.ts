"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, verifyTotp } from "@/lib/totp";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifie.");
  return session.user;
}

export async function generateTwoFactorSecret() {
  const user = await requireSession();
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true } });
  if (record?.twoFactorEnabled) {
    throw new Error("La double authentification est deja active : desactivez-la d'abord.");
  }
  const secret = generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });
  revalidatePath("/erp/securite/2fa");
}

const confirmSchema = z.object({ code: z.string().min(6, "Code invalide.") });

export async function confirmTwoFactor(formData: FormData) {
  const user = await requireSession();
  const data = confirmSchema.parse({ code: formData.get("code") });

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record?.twoFactorSecret) {
    throw new Error("Generez d'abord un secret avant de confirmer.");
  }
  if (!verifyTotp(record.twoFactorSecret, data.code)) {
    throw new Error("Code invalide. Verifiez l'heure de votre telephone et reessayez.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } }),
    prisma.auditLog.create({
      data: { userId: user.id, action: "2FA_ENABLED", entity: "User", entityId: user.id },
    }),
  ]);

  revalidatePath("/erp/securite/2fa");
}

export async function disableTwoFactor() {
  const user = await requireSession();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } }),
    prisma.auditLog.create({
      data: { userId: user.id, action: "2FA_DISABLED", entity: "User", entityId: user.id },
    }),
  ]);
  revalidatePath("/erp/securite/2fa");
}
