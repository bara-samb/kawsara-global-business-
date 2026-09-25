"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import { resolvePaymentOption } from "@/lib/payment-options";
import { notifyRoles } from "@/lib/notify";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const paySchema = z.object({
  amount: z.coerce.number().int().min(1),
  paymentOption: z.string().min(1, "Mode de paiement obligatoire."),
});

export async function settleDebt(debtId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("debt.settle");
    const data = paySchema.parse({
      amount: formData.get("amount"),
      paymentOption: formData.get("paymentOption"),
    });

    await prisma.$transaction(async (tx) => {
      const debt = await tx.customerDebt.findUnique({ where: { id: debtId }, include: { invoice: true } });
      if (!debt) throw new UserError("Dette introuvable.");
      if (debt.status === "ANNULEE" || debt.invoice.status === "ANNULEE") {
        throw new UserError("Impossible d'encaisser une dette annulee.");
      }
      assertStoreAccess(user, debt.invoice.storeId);
      if (debt.remainingAmount <= 0) throw new UserError("Cette dette est deja soldee.");

      const amount = Math.min(data.amount, debt.remainingAmount);
      const { method, cashSessionId } = await resolvePaymentOption(tx, data.paymentOption, user);

      const debtPaymentReference = await generateReference("debtPayment", tx);
      await tx.debtPayment.create({
        data: {
          reference: debtPaymentReference,
          debtId: debt.id,
          amount,
          method,
          cashSessionId,
          userId: user.id,
        },
      });

      const newPaid = debt.paidAmount + amount;
      const newRemaining = Math.max(0, debt.totalAmount - newPaid);
      await tx.customerDebt.update({
        where: { id: debt.id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? "PAYEE" : "PARTIELLEMENT_PAYEE",
        },
      });

      const invoicePaid = debt.invoice.paidAmount + amount;
      const invoiceRemaining = Math.max(0, debt.invoice.total - invoicePaid);
      await tx.invoice.update({
        where: { id: debt.invoiceId },
        data: {
          paidAmount: invoicePaid,
          remainingAmount: invoiceRemaining,
          status: invoiceRemaining <= 0 ? "PAYEE" : "PARTIELLEMENT_PAYEE",
        },
      });

      const invoicePaymentReference = await generateReference("payment", tx);
      await tx.payment.create({
        data: {
          reference: invoicePaymentReference,
          invoiceId: debt.invoiceId,
          amount,
          method,
          cashSessionId,
          userId: user.id,
        },
      });

      await tx.auditLog.create({
        data: { userId: user.id, action: "SETTLE", entity: "CustomerDebt", entityId: debt.id },
      });

      if (newRemaining <= 0) {
        const customer = await tx.customer.findUnique({ where: { id: debt.customerId } });
        await notifyRoles(
          ["ADMIN", "GERANT", "COMPTABLE"],
          "DETTE_SOLDEE",
          "Dette soldee",
          `${customer?.name ?? "Client"} a solde sa dette ${debt.reference}.`,
          tx,
          debt.id
        );
      }
    });

    revalidatePath("/erp/dettes");
    revalidatePath("/erp/factures");
  });
}
