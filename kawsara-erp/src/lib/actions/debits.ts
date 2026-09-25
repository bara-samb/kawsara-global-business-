"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";
import { resolvePaymentOption } from "@/lib/payment-options";
import { checkLowStockAndNotify } from "@/lib/notify";
import { sumQuantitiesByProduct } from "@/lib/line-items";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
});

const createDebitSchema = z.object({
  storeId: z.string().min(1, "Depot obligatoire"),
  customerId: z.string().min(1, "Client obligatoire"),
  items: z.string().transform((s) => z.array(itemSchema).min(1, "Au moins un article").parse(JSON.parse(s))),
});

/**
 * Un debit est une reservation, pas une vente definitive (cahier des charges section 16/19,
 * critere d'acceptation 58.3) : il ne diminue jamais le stock physique, seulement le stock
 * reserve. La sortie de stock reelle n'a lieu qu'a la transformation en facture.
 */
export async function createDebit(formData: FormData) {
  const user = await requirePermission("debit.create");
  const data = createDebitSchema.parse({
    storeId: formData.get("storeId"),
    customerId: formData.get("customerId"),
    items: formData.get("items"),
  });

  const debit = await prisma.$transaction(async (tx) => {
    for (const [productId, quantity] of sumQuantitiesByProduct(data.items)) {
      const stock = await tx.stock.findUnique({
        where: { productId_storeId: { productId, storeId: data.storeId } },
      });
      const available = (stock?.quantity ?? 0) - (stock?.reserved ?? 0);
      if (available < quantity) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        throw new Error(`Stock insuffisant pour "${product?.name ?? productId}" (disponible : ${available}).`);
      }
    }

    const reference = await generateReference("debit", tx);
    const createdDebit = await tx.debit.create({
      data: {
        reference,
        storeId: data.storeId,
        customerId: data.customerId,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    });

    for (const item of data.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: data.storeId } },
        data: { reserved: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          storeId: data.storeId,
          type: "RESERVATION",
          quantity: item.quantity,
          reference,
          reason: "Reservation debit (vente a credit)",
          userId: user.id,
        },
      });
    }

    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entity: "Debit", entityId: createdDebit.id },
    });

    return createdDebit;
  });

  revalidatePath("/erp/debits");
  revalidatePath("/erp/stock");
  redirect(`/erp/debits/${debit.id}`);
}

const transformSchema = z.object({
  paymentOption: z.string().optional(),
  amountPaid: z.coerce.number().int().min(0).default(0),
});

export async function transformDebitToInvoice(debitId: string, formData: FormData) {
  const user = await requirePermission("debit.transform");
  const data = transformSchema.parse({
    paymentOption: formData.get("paymentOption") || undefined,
    amountPaid: formData.get("amountPaid") || 0,
  });
  if (data.amountPaid > 0 && !data.paymentOption) {
    throw new Error("Choisissez le mode de paiement de l'acompte.");
  }

  const invoiceId = await prisma.$transaction(async (tx) => {
    const debit = await tx.debit.findUnique({ where: { id: debitId }, include: { items: true } });
    if (!debit || debit.status !== "EN_ATTENTE") {
      throw new Error("Ce debit ne peut pas etre transforme (deja transforme ou annule).");
    }

    // Nouvelle verification du stock au moment de la transformation (section 18) : le stock
    // physique peut avoir change depuis la reservation (correction d'inventaire, par exemple).
    for (const [productId, quantity] of sumQuantitiesByProduct(debit.items)) {
      const stock = await tx.stock.findUnique({
        where: { productId_storeId: { productId, storeId: debit.storeId } },
      });
      if (!stock || stock.quantity < quantity) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        throw new Error(
          `Stock insuffisant pour "${product?.name ?? productId}" (disponible : ${stock?.quantity ?? 0}).`
        );
      }
    }

    const subtotal = debit.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const total = subtotal;
    const paidAmount = Math.min(data.amountPaid, total);
    const remainingAmount = total - paidAmount;
    const status = remainingAmount <= 0 ? "PAYEE" : paidAmount > 0 ? "PARTIELLEMENT_PAYEE" : "IMPAYEE";

    const invoiceReference = await generateReference("invoice", tx);
    const invoice = await tx.invoice.create({
      data: {
        reference: invoiceReference,
        storeId: debit.storeId,
        customerId: debit.customerId,
        origin: "DEBIT",
        debitId: debit.id,
        sellerId: user.id,
        subtotal,
        discount: 0,
        total,
        paidAmount,
        remainingAmount,
        status,
        items: {
          create: debit.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.quantity * i.unitPrice,
          })),
        },
      },
    });

    // Sortie de stock reelle : la reservation devient une vente definitive.
    for (const item of debit.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: debit.storeId } },
        data: { quantity: { decrement: item.quantity }, reserved: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          storeId: debit.storeId,
          type: "VENTE",
          quantity: -item.quantity,
          reference: invoiceReference,
          reason: "Transformation debit en facture",
          userId: user.id,
        },
      });
      await checkLowStockAndNotify(tx, item.productId, debit.storeId);
    }

    if (paidAmount > 0 && data.paymentOption) {
      const { method, cashSessionId } = await resolvePaymentOption(tx, data.paymentOption);
      const paymentReference = await generateReference("payment", tx);
      await tx.payment.create({
        data: {
          reference: paymentReference,
          invoiceId: invoice.id,
          amount: paidAmount,
          method,
          cashSessionId,
          userId: user.id,
        },
      });
    }

    if (remainingAmount > 0) {
      const debtReference = await generateReference("debt", tx);
      await tx.customerDebt.create({
        data: {
          reference: debtReference,
          customerId: debit.customerId,
          invoiceId: invoice.id,
          totalAmount: total,
          paidAmount,
          remainingAmount,
          status: paidAmount > 0 ? "PARTIELLEMENT_PAYEE" : "NON_PAYEE",
        },
      });
    }

    await tx.debit.update({ where: { id: debit.id }, data: { status: "TRANSFORME" } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "TRANSFORM", entity: "Debit", entityId: debit.id },
    });

    return invoice.id;
  });

  revalidatePath("/erp/debits");
  revalidatePath("/erp/factures");
  revalidatePath("/erp/stock");
  redirect(`/erp/factures/${invoiceId}`);
}

export async function cancelDebit(debitId: string) {
  const user = await requirePermission("debit.cancel");

  await prisma.$transaction(async (tx) => {
    const debit = await tx.debit.findUnique({ where: { id: debitId }, include: { items: true } });
    if (!debit || debit.status !== "EN_ATTENTE") {
      throw new Error("Ce debit ne peut pas etre annule (deja transforme ou annule).");
    }

    for (const item of debit.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: debit.storeId } },
        data: { reserved: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          storeId: debit.storeId,
          type: "LIBERATION",
          quantity: item.quantity,
          reference: debit.reference,
          reason: "Annulation debit",
          userId: user.id,
        },
      });
    }

    await tx.debit.update({ where: { id: debitId }, data: { status: "ANNULE" } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "CANCEL", entity: "Debit", entityId: debitId },
    });
  });

  revalidatePath("/erp/debits");
  revalidatePath("/erp/stock");
}
