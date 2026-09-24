"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertStoreAccess } from "@/lib/require-permission";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const baseProductSchema = z.object({
  name: z.string().trim().min(2, "Le nom est obligatoire"),
  description: z.string().optional(),
  categoryId: z.string().trim().min(1, "La categorie est obligatoire"),
  supplierId: z.string().optional(),
  purchasePrice: z.coerce.number().int().positive("Le prix d'achat est obligatoire"),
  sellingPrice: z.coerce.number().int().positive("Le prix de vente est obligatoire"),
  minThreshold: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
  onlineEnabled: z.coerce.boolean().default(false),
});

const createProductSchema = baseProductSchema.extend({
  reference: z.string().trim().min(1, "La reference est obligatoire").max(50, "La reference est trop longue"),
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
    reference: formData.get("reference"),
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

async function saveProductImage(fileValue: FormDataEntryValue | null) {
  if (!(fileValue instanceof File) || fileValue.size === 0) return null;
  if (fileValue.size > 5 * 1024 * 1024) {
    throw new UserError("L'image ne doit pas depasser 5 Mo.");
  }

  const extensions: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const extension = extensions[fileValue.type];
  if (!extension) {
    throw new UserError("Format d'image non pris en charge. Utilisez JPG, PNG ou WebP.");
  }

  const directory = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(directory, filename);
  await writeFile(filePath, Buffer.from(await fileValue.arrayBuffer()));
  return { filePath, url: `/uploads/products/${filename}` };
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("product.create");
    const data = parseCreateForm(formData);
    assertStoreAccess(user, data.storeId);
    const image = await saveProductImage(formData.get("image"));
    const existingProduct = await prisma.product.findUnique({ where: { reference: data.reference } });
    if (existingProduct) {
      throw new UserError("Cette reference produit existe deja.");
    }

    let product;
    try {
      product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            reference: data.reference,
            name: data.name,
            description: data.description,
            categoryId: data.categoryId || null,
            supplierId: data.supplierId || null,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice,
            minThreshold: data.minThreshold,
            active: data.active,
            onlineEnabled: data.onlineEnabled,
            ...(image ? { images: { create: { url: image.url, position: 0 } } } : {}),
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
              reference: data.reference,
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
      revalidatePath("/catalogue");
      return product;
    } catch (error) {
      if (image) await unlink(image.filePath).catch(() => undefined);
      throw error;
    }
    redirect(`/erp/produits/${product.id}`);
  });
}

export async function updateProduct(productId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
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
  });
}

export async function toggleProductActive(productId: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
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
  });
}
