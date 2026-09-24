import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notify";
import { matchTotpCounter } from "@/lib/totp";
import { decryptSecret } from "@/lib/secret-box";
import { hitRateLimit, isRateLimited, resetRateLimit, currentRequestIp } from "@/lib/rate-limit";
import type { Role } from "@prisma/client";

const MAX_FAILURES_PER_IP = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LOCK_THRESHOLD = 20;

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
    isPrincipalAdmin?: boolean;
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
      isPrincipalAdmin: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    reference: string;
    storeId: string | null;
    customerId: string | null;
    isPrincipalAdmin?: boolean;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/gestion" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        code: { label: "Code 2FA", type: "text" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.toLowerCase() : null;
        const password = credentials?.password;
        const code = typeof credentials?.code === "string" ? credentials.code.trim() : "";
        if (!email || typeof password !== "string") return null;

        // Limite par couple email + IP : un attaquant qui se trompe de mot de passe bloque
        // uniquement SA propre IP, pas le vrai titulaire du compte (anti verrouillage a distance).
        const ipAddress = await currentRequestIp();
        const attemptKey = `login:${email}:${ipAddress}`;
        if (isRateLimited(attemptKey, MAX_FAILURES_PER_IP)) {
          await prisma.securityEvent.create({
            data: { type: "LOGIN_BLOCKED", email, ipAddress, detail: "Trop d'echecs depuis cette adresse IP" },
          });
          return null;
        }
        const recordFailure = () => hitRateLimit(attemptKey, MAX_FAILURES_PER_IP, FAILURE_WINDOW_MS);

        const user = await prisma.user.findUnique({
          where: { email },
          include: { customer: true },
        });
        // Connexion reservee au personnel : les clients commandent sans compte.
        if (!user || !user.active || user.role === "CLIENT") {
          recordFailure();
          await prisma.securityEvent.create({
            data: { type: "LOGIN_FAILED", email, ipAddress, detail: "Compte introuvable ou inactif" },
          });
          return null;
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await prisma.securityEvent.create({
            data: { type: "LOGIN_BLOCKED", email, userId: user.id, ipAddress, detail: "Compte verrouille (trop de tentatives)" },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          recordFailure();
          // Verrouillage global du compte : seulement en cas d'attaque massive (plusieurs IP),
          // le blocage par IP ci-dessus suffit contre une attaque classique.
          const failedLogins = user.failedLogins + 1;
          const lockedUntil = failedLogins >= ACCOUNT_LOCK_THRESHOLD ? new Date(Date.now() + FAILURE_WINDOW_MS) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins, lockedUntil },
          });
          await prisma.securityEvent.create({
            data: { type: "LOGIN_FAILED", email, userId: user.id, ipAddress, detail: "Mot de passe invalide" },
          });
          if (lockedUntil) {
            await notifyRoles(
              ["ADMIN"],
              "COMPTE_VERROUILLE",
              "Compte verrouille",
              `Le compte ${email} a ete verrouille apres ${failedLogins} echecs de connexion (attaque probable depuis plusieurs adresses).`,
              undefined,
              user.id
            );
          }
          return null;
        }

        let twoFactorCounter: number | null = null;
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!code) {
            throw new TwoFactorRequiredError();
          }
          twoFactorCounter = matchTotpCounter(decryptSecret(user.twoFactorSecret), code, user.twoFactorLastCounter);
          if (twoFactorCounter === null) {
            recordFailure();
            await prisma.securityEvent.create({
              data: { type: "LOGIN_FAILED", email, userId: user.id, ipAddress, detail: "Code 2FA invalide ou deja utilise" },
            });
            throw new TwoFactorInvalidError();
          }
        }

        resetRateLimit(attemptKey);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLogins: 0,
            lockedUntil: null,
            ...(twoFactorCounter !== null && { twoFactorLastCounter: twoFactorCounter }),
          },
        });
        await prisma.auditLog.create({
          data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ipAddress },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          reference: user.reference,
          storeId: user.storeId,
          customerId: user.customer?.id ?? null,
          isPrincipalAdmin: user.isPrincipalAdmin,
        };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const userId = "token" in message ? message.token?.sub : undefined;
      if (userId) {
        await prisma.auditLog.create({
          data: { userId, action: "LOGOUT", entity: "User", entityId: userId },
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.reference = user.reference;
        token.storeId = user.storeId;
        token.customerId = user.customerId ?? null;
        token.isPrincipalAdmin = user.isPrincipalAdmin ?? false;
        return token;
      }

      // A chaque requete, les droits sont relus en base : un compte desactive est deconnecte
      // immediatement, et un changement de role ou de boutique s'applique sans reconnexion.
      const record = token.sub
        ? await prisma.user.findUnique({
            where: { id: token.sub },
            select: { active: true, role: true, reference: true, storeId: true, isPrincipalAdmin: true, customer: { select: { id: true } } },
          })
        : null;
      if (!record || !record.active) return null;
      token.role = record.role;
      token.reference = record.reference;
      token.storeId = record.storeId;
      token.customerId = record.customer?.id ?? null;
      token.isPrincipalAdmin = record.isPrincipalAdmin;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.reference = token.reference;
      session.user.storeId = token.storeId;
      session.user.customerId = token.customerId;
      session.user.isPrincipalAdmin = token.isPrincipalAdmin === true;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      if (path.startsWith("/erp")) {
        if (!isLoggedIn) return false;
        return auth.user.role !== "CLIENT";
      }
      return true;
    },
  },
});
