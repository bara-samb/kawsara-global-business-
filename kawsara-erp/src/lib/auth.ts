import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notify";
import { verifyTotp } from "@/lib/totp";
import type { Role } from "@prisma/client";

class TwoFactorRequiredError extends CredentialsSignin {
  code = "2fa_required";
}

class TwoFactorInvalidError extends CredentialsSignin {
  code = "2fa_invalid";
}

declare module "next-auth" {
  interface User {
    role: Role;
    reference: string;
    storeId: string | null;
    customerId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      reference: string;
      storeId: string | null;
      customerId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    reference: string;
    storeId: string | null;
    customerId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        code: { label: "Code 2FA", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const code = typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { customer: true },
        });
        if (!user || !user.active) {
          await prisma.securityEvent.create({
            data: { type: "LOGIN_FAILED", email, detail: "Compte introuvable ou inactif" },
          });
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await prisma.securityEvent.create({
            data: { type: "LOGIN_BLOCKED", email, userId: user.id, detail: "Compte verrouille (trop de tentatives)" },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const failedLogins = user.failedLogins + 1;
          const lockedUntil = failedLogins >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins, lockedUntil },
          });
          await prisma.securityEvent.create({
            data: { type: "LOGIN_FAILED", email, userId: user.id, detail: "Mot de passe invalide" },
          });
          if (lockedUntil) {
            await notifyRoles(
              ["ADMIN"],
              "COMPTE_VERROUILLE",
              "Compte verrouille",
              `Le compte ${email} a ete verrouille apres ${failedLogins} echecs de connexion.`
            );
          }
          return null;
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!code) {
            throw new TwoFactorRequiredError();
          }
          if (!verifyTotp(user.twoFactorSecret, code)) {
            await prisma.securityEvent.create({
              data: { type: "LOGIN_FAILED", email, userId: user.id, detail: "Code 2FA invalide" },
            });
            throw new TwoFactorInvalidError();
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null },
        });
        await prisma.auditLog.create({
          data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          reference: user.reference,
          storeId: user.storeId,
          customerId: user.customer?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.reference = user.reference;
        token.storeId = user.storeId;
        token.customerId = user.customerId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.reference = token.reference;
      session.user.storeId = token.storeId;
      session.user.customerId = token.customerId;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isErp = path.startsWith("/erp");
      const isCompte = path.startsWith("/compte");

      if (isErp) {
        if (!isLoggedIn) return false;
        return auth.user.role !== "CLIENT";
      }
      if (isCompte) {
        return isLoggedIn;
      }
      return true;
    },
  },
});
