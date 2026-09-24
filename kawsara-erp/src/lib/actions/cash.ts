"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const openSchema = z.object({
  cashRegisterId: z.string().min(1, "Caisse obligatoire"),
  openingBalance: z.coerce.number().int().min(0),
});

export async function openCashSession(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("cash.open");
    const data = openSchema.parse({
      cashRegisterId: formData.get("cashRegisterId"),
      openingBalance: formData.get("openingBalance"),
    });

    const register = await prisma.cashRegister.findUnique({ where: { id: data.cashRegisterId } });
    if (!register) throw new UserError("Caisse introuvable.");
    assertStoreAccess(user, register.storeId);

    const existing = await prisma.cashSession.findFirst({
      where: { cashRegisterId: data.cashRegisterId, status: "OUVERTE" },
    });
    if (existing) {
      throw new UserError("Cette caisse a deja une session ouverte.");
    }

    await prisma.cashSession.create({
      data: {
        cashRegisterId: data.cashRegisterId,
        userId: user.id,
        openingBalance: data.openingBalance,
      },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "OPEN", entity: "CashSession" },
    });

    revalidatePath("/erp/caisses");
  });
}

const closeSchema = z.object({
  closingBalanceDeclared: z.coerce.number().int().min(0),
});

export async function closeCashSession(sessionId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("cash.close");
    const data = closeSchema.parse({
      closingBalanceDeclared: formData.get("closingBalanceDeclared"),
    });

    const session = await prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: { payments: true, debtPayments: true, movements: true, cashRegister: true },
    });
    if (!session || session.status !== "OUVERTE") {
      throw new UserError("Session de caisse introuvable ou deja fermee.");
    }
    assertStoreAccess(user, session.cashRegister.storeId);

    const cashIn =
      session.payments.reduce((s, p) => s + p.amount, 0) +
      session.debtPayments.reduce((s, p) => s + p.amount, 0) +
      session.movements.filter((m) => m.type === "ENTREE").reduce((s, m) => s + m.amount, 0);
    const cashOut = session.movements.filter((m) => m.type === "SORTIE").reduce((s, m) => s + m.amount, 0);
    const theoretical = session.openingBalance + cashIn - cashOut;

    await prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        closingBalanceDeclared: data.closingBalanceDeclared,
        closingBalanceTheoretical: theoretical,
        status: "FERMEE",
        closedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "CLOSE", entity: "CashSession", entityId: sessionId },
    });

    revalidatePath("/erp/caisses");
  });
}
