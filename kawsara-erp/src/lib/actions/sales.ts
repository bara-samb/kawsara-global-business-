"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import { resolvePaymentOption } from "@/lib/payment-options";
import { checkLowStockAndNotify } from "@/lib/notify";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";
import { assertPricesAllowed } from "@/lib/pricing";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
});

const createSaleSchema = z.object({
  storeId: z.string().min(1, "Depot obligatoire"),
  customerId: z.string().optional(),
  customerName: z.string().trim().max(200).optional(),
  customerPhone: z.string().trim().max(40).optional(),
  discount: z.coerce.number().int().min(0).default(0),
  paymentOption: z.string().min(1, "Mode de paiement obligatoire"),
  items: z.string().transform((s) => z.array(itemSchema).min(1, "Au moins un article").parse(JSON.parse(s))),
});

export async function createSale(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("sale.create");
    const data = createSaleSchema.parse({
      storeId: formData.get("storeId"),
      customerId: formData.get("customerId") || undefined,
      customerName: formData.get("customerName") || undefined,
      customerPhone: formData.get("customerPhone") || undefined,
      discount: formData.get("discount") || 0,
      paymentOption: formData.get("paymentOption"),
      items: formData.get("items"),
    });
    assertStoreAccess(user, data.storeId);
    const belowCost = await assertPricesAllowed(data.items, data.discount);

    const sale = await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        const stock = await tx.stock.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId: data.storeId } },
        });
        const available = (stock?.quantity ?? 0) - (stock?.reserved ?? 0);
        if (available < item.quantity) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          throw new UserError(`Stock insuffisant pour "${product?.name ?? item.productId}" (disponible : ${available}).`);
        }
      }

      const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const total = Math.max(0, subtotal - data.discount);
      const saleReference = await generateReference("sale", tx);

      const createdSale = await tx.sale.create({
        data: {
          reference: saleReference,
          storeId: data.storeId,
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          customerPhone: data.customerPhone || null,
          sellerId: user.id,
          discount: data.discount,
          subtotal,
          total,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.quantity * i.unitPrice,
            })),
          },
        },
      });

      for (const item of data.items) {
        await tx.stock.update({
          where: { productId_storeId: { productId: item.productId, storeId: data.storeId } },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId: data.storeId,
            type: "VENTE",
            quantity: -item.quantity,
            reference: saleReference,
            userId: user.id,
          },
        });
        await checkLowStockAndNotify(tx, item.productId, data.storeId);
      }

      const { method, cashSessionId } = await resolvePaymentOption(tx, data.paymentOption, user);
      const invoiceReference = await generateReference("invoice", tx);
      const invoice = await tx.invoice.create({
        data: {
          reference: invoiceReference,
          storeId: data.storeId,
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          customerPhone: data.customerPhone || null,
          origin: "VENTE",
          saleId: createdSale.id,
          sellerId: user.id,
          subtotal,
          discount: data.discount,
          total,
          paidAmount: total,
          remainingAmount: 0,
          status: "PAYEE",
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.quantity * i.unitPrice,
            })),
          },
        },
      });

      const paymentReference = await generateReference("payment", tx);
      await tx.payment.create({
        data: {
          reference: paymentReference,
          invoiceId: invoice.id,
          amount: total,
          method,
          cashSessionId,
          userId: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: belowCost.length > 0 ? "CREATE_BELOW_COST" : "CREATE",
          entity: "Sale",
          entityId: createdSale.id,
          metadata: belowCost.length > 0 ? `Vente a perte autorisee : ${belowCost.join(" ; ")}` : null,
        },
      });

      return createdSale;
    });

    revalidatePath("/erp/ventes");
    revalidatePath("/erp/stock");
    revalidatePath("/erp/produits");
    redirect(`/erp/ventes/${sale.id}`);
  });
}
