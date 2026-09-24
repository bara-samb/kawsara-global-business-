import { headers } from "next/headers";

/**
 * Limitation de frequence en memoire (anti-brute-force / anti-spam, cahier des charges 38/47).
 * Adapte a une instance unique (le cas de ce projet) ; pour plusieurs instances en production,
 * remplacer par un compteur partage (Redis, etc.).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Enregistre une tentative et indique si la limite est depassee pour cette cle. */
export function hitRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(now);
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

/** Indique si la cle est bloquee, sans compter de nouvelle tentative. */
export function isRateLimited(key: string, max: number): boolean {
  const entry = buckets.get(key);
  return !!entry && Date.now() <= entry.resetAt && entry.count >= max;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

// Evite que la Map grossisse indefiniment sous une attaque (une cle par IP / email).
function pruneExpired(now: number) {
  if (buckets.size < 10_000) return;
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}

/** IP du client de la requete en cours ("unknown" hors requete HTTP, ex. tests). */
export async function currentRequestIp(): Promise<string> {
  try {
    return clientIpFromHeaders(await headers());
  } catch {
    return "unknown";
  }
}

/**
 * IP du client. On prend la DERNIERE valeur de X-Forwarded-For : c'est celle ajoutee par le
 * reverse proxy (Docker/Nginx/Vercel) devant l'application. Les premieres valeurs sont fournies
 * par le client lui-meme et peuvent etre falsifiees pour contourner la limitation.
 */
export function clientIpFromHeaders(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for");
  const last = forwarded?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  return requestHeaders.get("x-real-ip") || last || "unknown";
}
