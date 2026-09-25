"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";

const storeSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function createStore(formData: FormData) {
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
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  newQuantity: z.coerce.number().int().min(0),
  reason: z.string().min(2, "Le motif est obligatoire"),
});

export async function adjustStock(formData: FormData) {
  const user = await requirePermission("stock.adjust");
  const data = adjustSchema.parse({
    productId: formData.get("productId"),
    storeId: formData.get("storeId"),
    newQuantity: formData.get("newQuantity"),
    reason: formData.get("reason"),
  });

  await prisma.$transaction(async (tx) => {
    const existing = await tx.stock.findUnique({
      where: { productId_storeId: { productId: data.productId, storeId: data.storeId } },
    });
    const previousQuantity = existing?.quantity ?? 0;
    if (data.newQuantity < (existing?.reserved ?? 0)) {
      throw new Error(
        `Impossible : ${existing?.reserved} unite(s) sont reservees (debits / commandes en ligne) dans ce depot.`
      );
    }
    const delta = data.newQuantity - previousQuantity;

    await tx.stock.upsert({
      where: { productId_storeId: { productId: data.productId, storeId: data.storeId } },
      create: { productId: data.productId, storeId: data.storeId, quantity: data.newQuantity },
      update: { quantity: data.newQuantity },
    });

    if (delta !== 0) {
      const product = await tx.product.findUnique({ where: { id: data.productId }, select: { reference: true } });
      if (!product) throw new Error("Produit introuvable.");
      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          storeId: data.storeId,
          type: "CORRECTION",
          quantity: delta,
          reference: product.reference,
          reason: data.reason,
          userId: user.id,
        },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "ADJUST_STOCK", entity: "Stock", entityId: `${data.productId}:${data.storeId}` },
      });
    }
  });

  revalidatePath("/erp/stock");
  revalidatePath("/erp/produits");
}
