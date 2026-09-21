import crypto from "crypto";

/**
 * Generate a secure, cryptographically random listening token.
 * Format: MP-XXXXXXXX (e.g. MP-7K29X8QF)
 */
export function generateListeningToken(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(8);
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `MP-${result}`;
}

/**
 * Hash a password using SHA-256 with a salt
 */
export function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password.trim())
    .digest("hex");
}

/**
 * Verify a plain text password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(hash)
  );
}
