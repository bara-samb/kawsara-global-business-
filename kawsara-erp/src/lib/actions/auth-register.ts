"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { signIn } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom est obligatoire."),
  email: z.string().email("Email invalide."),
  phone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres."),
});

export async function registerCustomer(formData: FormData) {
  const captchaOk = verifyCaptcha(
    String(formData.get("captchaA") ?? ""),
    String(formData.get("captchaB") ?? ""),
    String(formData.get("captchaExpires") ?? ""),
    String(formData.get("captchaToken") ?? ""),
    String(formData.get("captchaAnswer") ?? "")
  );
  if (!captchaOk) {
    redirect("/inscription?erreur=captcha");
  }

  const data = registerSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    password: formData.get("password"),
  });

  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/inscription?erreur=email");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.$transaction(async (tx) => {
    const userReference = await generateReference("user", tx);
    const user = await tx.user.create({
      data: {
        reference: userReference,
        name: data.name,
        email,
        passwordHash,
        role: "CLIENT",
      },
    });
    const customerReference = await generateReference("customer", tx);
    await tx.customer.create({
      data: {
        reference: customerReference,
        name: data.name,
        email,
        phone: data.phone,
        address: data.address,
        userId: user.id,
      },
    });
  });

  try {
    await signIn("credentials", { email, password: data.password, redirectTo: "/compte/commandes" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/connexion");
    }
    throw error;
  }
}
