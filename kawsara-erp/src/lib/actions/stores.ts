"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import type { ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const storeSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function createStore(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("store.create");
    const data = storeSchema.parse({
      name: formData.get("name"),
      address: formData.get("address") || undefined,
      phone: formData.get("phone") || undefined,
    });

    await prisma.$transaction(async (tx) => {
      const reference = await generateReference("store", tx);
      const created = await tx.store.create({
        data: { reference, name: data.name, address: data.address, phone: data.phone },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", entity: "Store", entityId: created.id },
      });
    });

    revalidatePath("/erp/stock");
  });
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  newQuantity: z.coerce.number().int().min(0),
  reason: z.string().min(2, "Le motif est obligatoire"),
});

export async function adjustStock(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("stock.adjust");
    const data = adjustSchema.parse({
      productId: formData.get("productId"),
      storeId: formData.get("storeId"),
      newQuantity: formData.get("newQuantity"),
      reason: formData.get("reason"),
    });
    assertStoreAccess(user, data.storeId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.stock.findUnique({
        where: { productId_storeId: { productId: data.productId, storeId: data.storeId } },
      });
      const previousQuantity = existing?.quantity ?? 0;
      const delta = data.newQuantity - previousQuantity;

      await tx.stock.upsert({
        where: { productId_storeId: { productId: data.productId, storeId: data.storeId } },
        create: { productId: data.productId, storeId: data.storeId, quantity: data.newQuantity },
        update: { quantity: data.newQuantity },
      });

      const reference = await generateReference("product", tx);
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "STOCK_ADJUST",
          entity: "Stock",
          entityId: existing?.id ?? null,
          metadata: JSON.stringify({
            productId: data.productId,
            storeId: data.storeId,
            previousQuantity,
            newQuantity: data.newQuantity,
            reason: data.reason,
          }),
        },
      });
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: data.productId,
            storeId: data.storeId,
            type: "CORRECTION",
            quantity: delta,
            reference,
            reason: data.reason,
            userId: user.id,
          },
        });
      }
    });

    revalidatePath("/erp/stock");
    revalidatePath("/erp/produits");
  });
}
