"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const profileSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire."),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("shop.own");
    const data = profileSchema.parse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
    });

    if (!user.customerId) {
      throw new UserError("Aucun profil client associe a ce compte.");
    }

    // On ne met a jour QUE le profil du client connecte : jamais un id fourni par le formulaire.
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: user.customerId },
        data: { name: data.name, phone: data.phone, address: data.address },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { name: data.name },
      }),
      prisma.auditLog.create({
        data: { userId: user.id, action: "UPDATE", entity: "Customer", entityId: user.customerId },
      }),
    ]);

    revalidatePath("/compte/profil");
    redirect("/compte/profil?enregistre=1");
  });
}
