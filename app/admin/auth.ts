import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_REPORTS_KEY;
}

// Every admin page accepts a raw ?key= as a bookmarkable auto-login link,
// each checking it independently before handing off to /admin/login to
// actually set the session cookie. A plain === here leaks timing info
// about how many leading characters of the real key a guess got right.
// timingSafeEqual requires equal-length buffers, so pad both to the same
// length before comparing - the trailing length check is a cheap integer
// comparison, not a byte-by-byte one, so it doesn't reintroduce a
// content-timing leak.
export function isValidAdminKey(candidate: string | null | undefined) {
  const adminKey = getAdminKey();
  if (!adminKey || !candidate) return false;

  const expected = Buffer.from(adminKey);
  const actual = Buffer.from(candidate);
  const length = Math.max(expected.length, actual.length, 1);

  const paddedExpected = Buffer.alloc(length);
  const paddedActual = Buffer.alloc(length);
  expected.copy(paddedExpected);
  actual.copy(paddedActual);

  return (
    expected.length === actual.length &&
    timingSafeEqual(paddedExpected, paddedActual)
  );
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
