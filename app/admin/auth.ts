import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_REPORTS_KEY;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// The admin key doubles as the HMAC secret: only someone who already knows
// it can mint a token, so the cookie just proves "verified within the last
// SESSION_DURATION_MS" without putting the raw key in every request.
export function createAdminSessionToken() {
  const adminKey = getAdminKey();
  if (!adminKey) throw new Error("Admin key is not configured");

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  return `${expiresAt}.${sign(String(expiresAt), adminKey)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  const adminKey = getAdminKey();
  if (!adminKey || !token) return false;

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = Buffer.from(sign(expiresAtRaw, adminKey), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}

export const ADMIN_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/admin",
  maxAge: SESSION_DURATION_MS / 1000,
};

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function adminLoginUrl(key: string, next: string) {
  return `/admin/login?key=${encodeURIComponent(key)}&next=${encodeURIComponent(next)}`;
}
