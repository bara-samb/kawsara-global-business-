import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Rate limiting anti-brute-force / anti-spam (cahier des charges section 38/47) sur les
 * points d'entree sensibles : connexion et inscription. En memoire, adapte a une instance
 * unique (le cas de ce projet) ; pour plusieurs instances en production, remplacer par un
 * compteur partage (Redis, etc.).
 */
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 15;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isSensitivePost =
    req.method === "POST" &&
    (pathname.startsWith("/api/auth/callback/credentials") || pathname === "/inscription");

  if (isSensitivePost) {
    const key = `${pathname}:${clientIp(req)}`;
    if (isRateLimited(key)) {
      return new NextResponse("Trop de tentatives. Reessayez dans une minute.", { status: 429 });
    }
  }

  // @ts-expect-error next-auth v5 `auth` acts as middleware when called with a NextRequest.
  return auth(req);
}

export const config = {
  matcher: ["/erp/:path*", "/compte/:path*", "/api/auth/callback/credentials", "/inscription"],
  // Le middleware par defaut tourne sur l'Edge Runtime, incompatible avec bcrypt et le moteur
  // natif de Prisma utilises par la configuration NextAuth complete (@/lib/auth). On force donc
  // le runtime Node.js ici (necessaire notamment pour un deploiement Vercel).
  runtime: "nodejs",
};
