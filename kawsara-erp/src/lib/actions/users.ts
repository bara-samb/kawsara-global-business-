"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { requirePermission } from "@/lib/require-permission";

const ROLES = ["ADMIN", "GERANT", "CAISSIER", "MAGASINIER", "COMPTABLE", "VENDEUR"] as const;

const createUserSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire."),
  email: z.string().email("Email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres."),
  role: z.enum(ROLES),
  storeId: z.string().optional(),
});

export async function createStaffUser(formData: FormData) {
  const admin = await requirePermission("user.create");
  const data = createUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    storeId: formData.get("storeId") || undefined,
  });

  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Un compte existe deja avec cet email.");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const reference = await generateReference("user", tx);
    const created = await tx.user.create({
      data: {
        reference,
        name: data.name,
        email,
        passwordHash,
        role: data.role,
        storeId: data.storeId || null,
      },
    });
    await tx.auditLog.create({
      data: { userId: admin.id, action: "CREATE", entity: "User", entityId: created.id },
    });
    return created;
  });

  revalidatePath("/erp/utilisateurs");
  redirect(`/erp/utilisateurs?cree=${user.reference}`);
}

export async function toggleUserActive(userId: string, active: boolean) {
  const admin = await requirePermission("user.update");
  await prisma.user.update({ where: { id: userId }, data: { active, lockedUntil: null, failedLogins: 0 } });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: active ? "ACTIVATE" : "DEACTIVATE", entity: "User", entityId: userId },
  });
  revalidatePath("/erp/utilisateurs");
}
