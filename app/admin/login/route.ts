import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_OPTIONS,
  createAdminSessionToken,
  isValidAdminKey,
} from "../auth";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/admin") || next.startsWith("//")) return "/admin";
  return next;
}

// Magic-link path: kept for anyone with an existing bookmarked
// /admin?key=... link. Puts the raw key in the URL (browser history,
// server logs) for one hop before the cookie takes over - the POST
// handler below is the preferred path going forward since it never does.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!isValidAdminKey(key)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), ADMIN_SESSION_COOKIE_OPTIONS);
  return response;
}

// Real login form path (see the form on /admin's signed-out state) - the
// key travels in a POST body instead of the URL, so it never touches
// browser history, the referer of any link, or a server access log.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const key = String(formData.get("key") || "");
  const next = safeNextPath(String(formData.get("next") || ""));

  if (!isValidAdminKey(key)) {
    return NextResponse.redirect(new URL("/admin?error=1", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), ADMIN_SESSION_COOKIE_OPTIONS);
  return response;
}
