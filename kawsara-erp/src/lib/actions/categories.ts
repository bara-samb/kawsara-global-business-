"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

const schema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  parentId: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  const user = await requirePermission("category.create");
  const data = schema.parse({
    name: formData.get("name"),
    parentId: formData.get("parentId") || undefined,
  });

  const category = await prisma.category.create({
    data: { name: data.name, parentId: data.parentId || null },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "CREATE", entity: "Category", entityId: category.id },
  });

  revalidatePath("/erp/categories");
}

export async function deleteCategory(categoryId: string) {
  const user = await requirePermission("category.delete");
  const inUse = await prisma.product.count({ where: { categoryId } });
  if (inUse > 0) {
    throw new Error("Impossible de supprimer : des produits utilisent cette categorie.");
  }
  const children = await prisma.category.count({ where: { parentId: categoryId } });
  if (children > 0) {
    throw new Error("Impossible de supprimer : cette categorie contient des sous-categories.");
  }
  await prisma.category.delete({ where: { id: categoryId } });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "DELETE", entity: "Category", entityId: categoryId },
  });
  revalidatePath("/erp/categories");
}
