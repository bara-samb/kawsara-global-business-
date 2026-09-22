"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";

const baseProductSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  purchasePrice: z.coerce.number().int().min(0),
  sellingPrice: z.coerce.number().int().min(0),
  minThreshold: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
  onlineEnabled: z.coerce.boolean().default(false),
});

const createProductSchema = baseProductSchema.extend({
  storeId: z.string().min(1, "Boutique obligatoire"),
  initialStock: z.coerce.number().int().min(0).default(0),
});

function parseBaseForm(formData: FormData) {
  return baseProductSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    purchasePrice: formData.get("purchasePrice"),
    sellingPrice: formData.get("sellingPrice"),
    minThreshold: formData.get("minThreshold") || 0,
    active: formData.get("active") === "on",
    onlineEnabled: formData.get("onlineEnabled") === "on",
  });
}

function parseCreateForm(formData: FormData) {
  return createProductSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    purchasePrice: formData.get("purchasePrice"),
    sellingPrice: formData.get("sellingPrice"),
    minThreshold: formData.get("minThreshold") || 0,
    active: formData.get("active") === "on",
    onlineEnabled: formData.get("onlineEnabled") === "on",
    storeId: formData.get("storeId"),
    initialStock: formData.get("initialStock") || 0,
  });
}

export async function createProduct(formData: FormData) {
  const user = await requirePermission("product.create");
  const data = parseCreateForm(formData);

  const product = await prisma.$transaction(async (tx) => {
    const reference = await generateReference("product", tx);
    const created = await tx.product.create({
      data: {
        reference,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        minThreshold: data.minThreshold,
        active: data.active,
        onlineEnabled: data.onlineEnabled,
      },
    });
    await tx.stock.create({
      data: { productId: created.id, storeId: data.storeId, quantity: data.initialStock },
    });
    if (data.initialStock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: created.id,
          storeId: data.storeId,
          type: "ENTREE",
          quantity: data.initialStock,
          reference,
          reason: "Stock initial a la creation du produit",
          userId: user.id,
        },
      });
    }
    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entity: "Product", entityId: created.id },
    });
    return created;
  });

  revalidatePath("/erp/produits");
  redirect(`/erp/produits/${product.id}`);
}

export async function updateProduct(productId: string, formData: FormData) {
  const user = await requirePermission("product.update");
  const data = parseBaseForm(formData);

  await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      minThreshold: data.minThreshold,
      active: data.active,
      onlineEnabled: data.onlineEnabled,
    },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "UPDATE", entity: "Product", entityId: productId },
  });

  revalidatePath("/erp/produits");
  revalidatePath(`/erp/produits/${productId}`);
  redirect(`/erp/produits/${productId}`);
}

export async function toggleProductActive(productId: string, active: boolean) {
  const user = await requirePermission("product.update");
  await prisma.product.update({ where: { id: productId }, data: { active } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: active ? "ACTIVATE" : "DEACTIVATE",
      entity: "Product",
      entityId: productId,
    },
  });
  revalidatePath("/erp/produits");
}
