import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hitRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

// Rate limiting anti-brute-force (cahier des charges section 38/47) sur la connexion du personnel.
// Le formulaire de /gestion est une Server Action : elle est envoyee en POST sur /gestion.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 15;

// Les clients commandent sans compte : l'ancien espace client et l'inscription sont fermes.
// Le blocage se fait ici (avant les Server Actions de ces pages), pas seulement en masquant les liens.
const CLOSED_CUSTOMER_PATHS = ["/inscription", "/compte", "/connexion"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (CLOSED_CUSTOMER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/catalogue", req.url));
  }

  const isSensitivePost =
    req.method === "POST" &&
    (pathname.startsWith("/api/auth/callback/credentials") || pathname === "/gestion");

  if (isSensitivePost) {
    const key = `${pathname}:${clientIpFromHeaders(req.headers)}`;
    if (hitRateLimit(key, MAX_ATTEMPTS, WINDOW_MS)) {
      return new NextResponse("Trop de tentatives. Reessayez dans une minute.", { status: 429 });
    }
  }

  // @ts-expect-error next-auth v5 `auth` acts as middleware when called with a NextRequest.
  return auth(req);
}

export const config = {
  // Pas de `runtime` ici : depuis Next.js 16, le proxy tourne toujours sur Node.js (compatible
  // avec bcrypt et Prisma utilises par @/lib/auth), et l'option est refusee.
  matcher: [
    "/erp/:path*",
    "/gestion",
    "/api/auth/callback/credentials",
    "/inscription",
    "/compte/:path*",
    "/connexion",
  ],
};
