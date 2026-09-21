import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "mp_admin_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "mp-dev-secret-change-in-production";

export function createSessionToken(email: string): string {
  const payload = JSON.stringify({ email, exp: Date.now() + 24 * 3600 * 1000 });
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + hmac;
}

export function verifySessionToken(token: string): { valid: boolean; email?: string } {
  try {
    const [payloadB64, hmac] = token.split(".");
    if (!payloadB64 || !hmac) return { valid: false };

    const payload = Buffer.from(payloadB64, "base64").toString("utf-8");
    const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { valid: false };
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.exp) {
      return { valid: false };
    }

    return { valid: true, email: data.email };
  } catch {
    return { valid: false };
  }
}

export async function setAdminSession(email: string): Promise<void> {
  const token = createSessionToken(email);
  const cookieStore = cookies();
  const isSecure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 86400, // 24 hours
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) return false;
  return verifySessionToken(sessionCookie.value).valid;
}
