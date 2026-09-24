"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().int().min(0),
});

const createOrderSchema = z.object({
  storeId: z.string().min(1, "Depot obligatoire"),
  supplierId: z.string().min(1, "Fournisseur obligatoire"),
  items: z.string().transform((s) => z.array(itemSchema).min(1, "Au moins un article").parse(JSON.parse(s))),
});

export async function createSupplierOrder(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("supplierOrder.create");
    const data = createOrderSchema.parse({
      storeId: formData.get("storeId"),
      supplierId: formData.get("supplierId"),
      items: formData.get("items"),
    });
    assertStoreAccess(user, data.storeId);

    const order = await prisma.$transaction(async (tx) => {
      const reference = await generateReference("supplierOrder", tx);
      const created = await tx.supplierOrder.create({
        data: {
          reference,
          supplierId: data.supplierId,
          storeId: data.storeId,
          status: "ENVOYEE",
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitCost: i.unitPrice,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", entity: "SupplierOrder", entityId: created.id },
      });
      return created;
    });

    revalidatePath("/erp/commandes-fournisseurs");
    redirect(`/erp/commandes-fournisseurs/${order.id}`);
  });
}

const receiveSchema = z.object({
  receipts: z.string().transform((s) =>
    z.array(z.object({ orderItemId: z.string().min(1), receivedNow: z.coerce.number().int().min(0) })).parse(JSON.parse(s))
  ),
});

export async function receiveSupplierOrder(orderId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("supplierOrder.receive");
    const data = receiveSchema.parse({ receipts: formData.get("receipts") });
    const linesToReceive = data.receipts.filter((r) => r.receivedNow > 0);
    if (linesToReceive.length === 0) {
      throw new UserError("Aucune quantite a receptionner.");
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.supplierOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.status === "RECUE" || order.status === "ANNULEE") {
        throw new UserError("Cette commande ne peut pas etre receptionnee.");
      }
      assertStoreAccess(user, order.storeId);

      const receiptReference = await generateReference("supplierReceipt", tx);
      const receipt = await tx.supplierReceipt.create({
        data: { reference: receiptReference, orderId: order.id, userId: user.id },
      });

      for (const line of linesToReceive) {
        const orderItem = order.items.find((i) => i.id === line.orderItemId);
        if (!orderItem) continue;
        const remaining = orderItem.quantity - orderItem.receivedQuantity;
        const toReceive = Math.min(line.receivedNow, remaining);
        if (toReceive <= 0) continue;

        await tx.supplierReceiptItem.create({
          data: { receiptId: receipt.id, productId: orderItem.productId, quantity: toReceive },
        });
        await tx.supplierOrderItem.update({
          where: { id: orderItem.id },
          data: { receivedQuantity: { increment: toReceive } },
        });
        await tx.stock.upsert({
          where: { productId_storeId: { productId: orderItem.productId, storeId: order.storeId } },
          create: { productId: orderItem.productId, storeId: order.storeId, quantity: toReceive },
          update: { quantity: { increment: toReceive } },
        });
        await tx.stockMovement.create({
          data: {
            productId: orderItem.productId,
            storeId: order.storeId,
            type: "RECEPTION",
            quantity: toReceive,
            reference: receiptReference,
            reason: `Reception commande ${order.reference}`,
            userId: user.id,
          },
        });
      }

      const updatedItems = await tx.supplierOrderItem.findMany({ where: { orderId: order.id } });
      const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
      const someReceived = updatedItems.some((i) => i.receivedQuantity > 0);
      await tx.supplierOrder.update({
        where: { id: order.id },
        data: { status: allReceived ? "RECUE" : someReceived ? "PARTIELLEMENT_RECUE" : order.status },
      });

      await tx.auditLog.create({
        data: { userId: user.id, action: "RECEIVE", entity: "SupplierOrder", entityId: order.id },
      });
    });

    revalidatePath(`/erp/commandes-fournisseurs/${orderId}`);
    revalidatePath("/erp/commandes-fournisseurs");
    revalidatePath("/erp/stock");
    revalidatePath("/erp/produits");
  });
}
