"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";
import { parsePaymentOption } from "@/lib/payment-options";
import { notifyRoles } from "@/lib/notify";

const paySchema = z.object({
  amount: z.coerce.number().int().min(1),
  paymentOption: z.string().min(1, "Mode de paiement obligatoire"),
});

export async function addInvoicePayment(invoiceId: string, formData: FormData) {
  const user = await requirePermission("payment.create");
  const data = paySchema.parse({
    amount: formData.get("amount"),
    paymentOption: formData.get("paymentOption"),
  });

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { debt: true } });
    if (!invoice) throw new Error("Facture introuvable.");
    if (invoice.remainingAmount <= 0) throw new Error("Cette facture est deja soldee.");

    const amount = Math.min(data.amount, invoice.remainingAmount);
    const { method, cashSessionId } = parsePaymentOption(data.paymentOption);

    const paymentReference = await generateReference("payment", tx);
    await tx.payment.create({
      data: {
        reference: paymentReference,
        invoiceId: invoice.id,
        amount,
        method,
        cashSessionId,
        userId: user.id,
      },
    });

    const newPaid = invoice.paidAmount + amount;
    const newRemaining = invoice.total - newPaid;
    const newStatus = newRemaining <= 0 ? "PAYEE" : "PARTIELLEMENT_PAYEE";

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { paidAmount: newPaid, remainingAmount: Math.max(0, newRemaining), status: newStatus },
    });

    if (invoice.debt) {
      await tx.customerDebt.update({
        where: { id: invoice.debt.id },
        data: {
          paidAmount: newPaid,
          remainingAmount: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? "PAYEE" : "PARTIELLEMENT_PAYEE",
        },
      });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "PAYMENT", entity: "Invoice", entityId: invoice.id },
    });

    if (newRemaining <= 0) {
      await notifyRoles(
        ["ADMIN", "GERANT", "COMPTABLE"],
        "PAIEMENT_RECU",
        "Facture soldee",
        `Facture ${invoice.reference} entierement payee (${invoice.total.toLocaleString("fr-FR")} FCFA).`,
        tx,
        invoice.id
      );
    }
  });

  revalidatePath(`/erp/factures/${invoiceId}`);
  revalidatePath("/erp/factures");
  revalidatePath("/erp/dettes");
}
