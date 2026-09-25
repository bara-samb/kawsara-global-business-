"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, matchTotpCounter } from "@/lib/totp";
import { encryptSecret, decryptSecret } from "@/lib/secret-box";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UserError("Non authentifie.");
  return session.user;
}

export async function generateTwoFactorSecret(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSession();
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true } });
    if (record?.twoFactorEnabled) {
      throw new UserError("La double authentification est deja active : desactivez-la d'abord.");
    }
    const secret = generateSecret();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false, twoFactorLastCounter: null },
      }),
      prisma.auditLog.create({
        data: { userId: user.id, action: "2FA_SECRET_GENERATED", entity: "User", entityId: user.id },
      }),
    ]);
    revalidatePath("/erp/securite/2fa");
  });
}

const confirmSchema = z.object({ code: z.string().min(6, "Code invalide.") });

export async function confirmTwoFactor(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSession();
    const data = confirmSchema.parse({ code: formData.get("code") });

    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.twoFactorSecret) {
      throw new UserError("Generez d'abord un secret avant de confirmer.");
    }
    const counter = matchTotpCounter(decryptSecret(record.twoFactorSecret), data.code, record.twoFactorLastCounter);
    if (counter === null) {
      throw new UserError("Code invalide. Verifiez l'heure de votre telephone et reessayez.");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true, twoFactorLastCounter: counter } }),
      prisma.auditLog.create({
        data: { userId: user.id, action: "2FA_ENABLED", entity: "User", entityId: user.id },
      }),
    ]);

    revalidatePath("/erp/securite/2fa");
  });
}

export async function disableTwoFactor(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireSession();
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorLastCounter: null } }),
      prisma.auditLog.create({
        data: { userId: user.id, action: "2FA_DISABLED", entity: "User", entityId: user.id },
      }),
    ]);
    revalidatePath("/erp/securite/2fa");
  });
}
