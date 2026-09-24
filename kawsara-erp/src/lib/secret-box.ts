import "server-only";
import crypto from "node:crypto";

/**
 * Chiffrement AES-256-GCM des secrets stockes en base (secret 2FA) : une fuite de la base ou
 * d'une sauvegarde ne suffit plus a generer les codes 2FA des utilisateurs.
 * La cle derive de AUTH_SECRET : changer AUTH_SECRET oblige a reconfigurer la 2FA.
 * Les anciennes valeurs en clair (sans prefixe) restent lisibles, pour la migration.
 */
const PREFIX = "v1:";

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant : impossible de chiffrer les secrets.");
  return crypto.createHash("sha256").update(`${secret}:secret-box:2fa`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // ancienne valeur en clair
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
