import "server-only";
import crypto from "node:crypto";

/**
 * CAPTCHA maison, sans service tiers (pas de cle API disponible) : un defi mathematique
 * dont la reponse attendue est signee par HMAC (avec AUTH_SECRET) et transmise dans des champs
 * caches. Aucun etat serveur necessaire (stateless), donc pas de nettoyage a prevoir.
 * Protection anti-bot basique (cahier des charges section 47).
 */
const TTL_MS = 5 * 60 * 1000;

function secretKey(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant : impossible de generer le CAPTCHA.");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secretKey()).update(payload).digest("hex");
}

// Jetons deja utilises (jusqu'a leur expiration) : un robot ne peut pas resoudre un defi une
// fois puis rejouer la meme reponse en boucle pendant 5 minutes.
const usedTokens = new Map<string, number>();

function consumeToken(token: string, expires: number): boolean {
  const now = Date.now();
  if (usedTokens.size > 5_000) {
    for (const [t, exp] of usedTokens) if (exp < now) usedTokens.delete(t);
  }
  if (usedTokens.has(token)) return false;
  usedTokens.set(token, expires);
  return true;
}

export type CaptchaChallenge = { a: number; b: number; expires: number; token: string };

export function createCaptcha(): CaptchaChallenge {
  const a = crypto.randomInt(2, 10);
  const b = crypto.randomInt(2, 10);
  const expires = Date.now() + TTL_MS;
  const token = sign(`${a}:${b}:${expires}`);
  return { a, b, expires, token };
}

export function verifyCaptcha(a: string, b: string, expires: string, token: string, answer: string): boolean {
  const expiresNum = Number(expires);
  if (!Number.isFinite(expiresNum) || Date.now() > expiresNum) return false;
  const expectedToken = sign(`${a}:${b}:${expires}`);
  const tokenBuf = Buffer.from(token || "");
  const expectedBuf = Buffer.from(expectedToken);
  if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) return false;
  if (Number(answer) !== Number(a) + Number(b)) return false;
  return consumeToken(token, expiresNum);
}
