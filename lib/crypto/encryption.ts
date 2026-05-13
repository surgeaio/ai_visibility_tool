import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function resolveKeyMaterial(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (raw && /^[a-fA-F0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (raw && raw.length >= 8) {
    return createHash("sha256").update(raw, "utf8").digest();
  }
  return createHash("sha256").update("demo-only-encryption-key-do-not-use-in-prod", "utf8").digest();
}

export function isEncryptionConfigured(): boolean {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  return Boolean(raw && (/^[a-fA-F0-9]{64}$/i.test(raw) || raw.length >= 8));
}

export function encryptApiKey(plaintext: string): string {
  const key = resolveKeyMaterial();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptApiKey(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }
  const [ivHex, authTagHex, dataHex] = parts;
  const key = resolveKeyMaterial();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function getKeyPreview(secret: string): string {
  const tail = secret.length >= 4 ? secret.slice(-4) : "****";
  return `••••${tail}`;
}
