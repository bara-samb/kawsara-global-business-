import "server-only";
import crypto from "node:crypto";

/**
 * TOTP (RFC 6238) implemente sans dependance externe, pour la 2FA des comptes sensibles
 * (cahier des charges section 37/48). Compatible Google Authenticator / Authy / etc.
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

export function generateTotp(secret: string, at: number = Date.now()): string {
  const counter = Math.floor(at / 1000 / STEP_SECONDS);
  return hotp(secret, counter);
}

/**
 * Verifie un code en tolerant +/- 1 pas de temps (30s) pour l'horloge du telephone.
 * Renvoie le pas de temps reconnu (a memoriser pour refuser toute reutilisation du meme code),
 * ou null si le code est invalide ou deja utilise (pas <= lastCounter).
 */
export function matchTotpCounter(
  secret: string,
  code: string,
  lastCounter: number | null = null,
  at: number = Date.now()
): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const counter = Math.floor(at / 1000 / STEP_SECONDS);
  for (const drift of [0, -1, 1]) {
    const candidate = counter + drift;
    if (lastCounter !== null && candidate <= lastCounter) continue;
    if (hotp(secret, candidate) === clean) return candidate;
  }
  return null;
}

export function verifyTotp(secret: string, code: string, at: number = Date.now()): boolean {
  return matchTotpCounter(secret, code, null, at) !== null;
}

export function otpAuthUri(secret: string, email: string): string {
  const label = encodeURIComponent(`Kawsara ERP:${email}`);
  const issuer = encodeURIComponent("Kawsara Global Business");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
