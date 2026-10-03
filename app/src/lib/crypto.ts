import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Encrypts secrets (like an LLM API key) before they are written to the database.
 * AES-256-GCM, a fresh random salt + IV per value, key derived with scrypt.
 *
 * The passphrase is SETTINGS_SECRET if set, otherwise ADMIN_PASSWORD. Changing it makes
 * previously stored secrets undecryptable — decrypt() then returns null and the admin
 * is simply asked to enter the key again.
 */
function passphrase() {
  const p = process.env.SETTINGS_SECRET || process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin");
  return p;
}

export const canEncrypt = () => passphrase().length > 0;

export function encryptSecret(plain: string): string {
  const pass = passphrase();
  if (!pass) throw new Error("Set SETTINGS_SECRET (or ADMIN_PASSWORD) before storing secrets.");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", scryptSync(pass, salt, 32), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", salt, iv, tag, ct].map((p) => (typeof p === "string" ? p : p.toString("base64"))).join(":");
}

export function decryptSecret(blob: string): string | null {
  try {
    const [v, salt, iv, tag, ct] = blob.split(":");
    if (v !== "v1" || !salt || !iv || !tag || !ct) return null;
    const key = scryptSync(passphrase(), Buffer.from(salt, "base64"), 32);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
