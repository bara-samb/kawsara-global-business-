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
  loyal: z.coerce.boolean().default(false),
});

function parseForm(formData: FormData) {
  return schema.parse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    loyal: formData.get("loyal") === "on",
  });
}

export async function createCustomer(formData: FormData) {
  const user = await requirePermission("customer.create");
  const data = parseForm(formData);

  const customer = await prisma.$transaction(async (tx) => {
    const reference = await generateReference("customer", tx);
    const created = await tx.customer.create({
      data: {
        reference,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        loyal: data.loyal,
      },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entity: "Customer", entityId: created.id },
    });
    return created;
  });

  revalidatePath("/erp/clients");
  redirect(`/erp/clients/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const user = await requirePermission("customer.update");
  const data = parseForm(formData);

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address,
      loyal: data.loyal,
    },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "UPDATE", entity: "Customer", entityId: customerId },
  });

  revalidatePath("/erp/clients");
  revalidatePath(`/erp/clients/${customerId}`);
  redirect(`/erp/clients/${customerId}`);
}
