import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// AES-256-GCM field-level encryption for the most sensitive free-text
// fields (symptom descriptions, lab explanations, outcomes) — this is
// IN ADDITION to Supabase's encryption-at-rest for the whole
// database, not a replacement for it. The idea: even if the database
// itself were ever exposed, these specific fields stay unreadable
// without ENCRYPTION_KEY, which lives only in your backend's env.
@Injectable()
export class EncryptionService {
  private key: Buffer;

  constructor() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
      throw new Error(
        "ENCRYPTION_KEY is not set — required for field-level encryption. Generate one with: openssl rand -hex 32",
      );
    }
    this.key = scryptSync(secret, "remi-field-encryption", 32);
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Store iv + authTag + ciphertext together, base64-encoded, so a
    // single text column can hold everything needed to decrypt.
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  decrypt(payload: string): string {
    if (!payload) return payload;
    try {
      const buf = Buffer.from(payload, "base64");
      const iv = buf.subarray(0, 12);
      const authTag = buf.subarray(12, 28);
      const ciphertext = buf.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch {
      // Field wasn't encrypted (e.g. older row from before this was
      // added) — return as-is rather than crashing the request.
      return payload;
    }
  }
}
