"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";

const schema = z.object({
  name: z.string().min(2, "Le nom est obligatoire"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

function parseForm(formData: FormData) {
  return schema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
  });
}

export async function createSupplier(formData: FormData) {
  const user = await requirePermission("supplier.create");
  const data = parseForm(formData);

  const supplier = await prisma.$transaction(async (tx) => {
    const reference = await generateReference("supplier", tx);
    const created = await tx.supplier.create({
      data: { reference, name: data.name, phone: data.phone, email: data.email || null, address: data.address },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entity: "Supplier", entityId: created.id },
    });
    return created;
  });

  revalidatePath("/erp/fournisseurs");
  redirect(`/erp/fournisseurs/${supplier.id}`);
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const user = await requirePermission("supplier.update");
  const data = parseForm(formData);

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { name: data.name, phone: data.phone, email: data.email || null, address: data.address },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "UPDATE", entity: "Supplier", entityId: supplierId },
  });

  revalidatePath("/erp/fournisseurs");
  revalidatePath(`/erp/fournisseurs/${supplierId}`);
  redirect(`/erp/fournisseurs/${supplierId}`);
}
