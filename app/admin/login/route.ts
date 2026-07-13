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
