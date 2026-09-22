"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const openSchema = z.object({
  cashRegisterId: z.string().min(1, "Caisse obligatoire"),
  openingBalance: z.coerce.number().int().min(0),
});

export async function openCashSession(formData: FormData) {
  const user = await requirePermission("cash.open");
  const data = openSchema.parse({
    cashRegisterId: formData.get("cashRegisterId"),
    openingBalance: formData.get("openingBalance"),
  });

  const existing = await prisma.cashSession.findFirst({
    where: { cashRegisterId: data.cashRegisterId, status: "OUVERTE" },
  });
  if (existing) {
    throw new Error("Cette caisse a deja une session ouverte.");
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
}

const closeSchema = z.object({
  closingBalanceDeclared: z.coerce.number().int().min(0),
});

export async function closeCashSession(sessionId: string, formData: FormData) {
  const user = await requirePermission("cash.close");
  const data = closeSchema.parse({
    closingBalanceDeclared: formData.get("closingBalanceDeclared"),
  });

  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { payments: true, debtPayments: true, movements: true },
  });
  if (!session || session.status !== "OUVERTE") {
    throw new Error("Session de caisse introuvable ou deja fermee.");
  }

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
}
