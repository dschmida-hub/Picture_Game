import { createClient } from "@supabase/supabase-js";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

// A dedicated client rather than importing supabaseAdmin from ./api -
// that module imports from this one (checkSameOrigin/checkRateLimit),
// so importing it back here would be a circular dependency.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return request.headers.get("x-real-ip") || "unknown";
}

export function checkSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  let requestHost: string;
  let originHost: string;

  try {
    requestHost = new URL(request.url).host;
    originHost = new URL(origin).host;
  } catch {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }

  if (originHost !== requestHost) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}

export function checkRateLimit(request: Request, key: string, options: RateLimitOptions) {
  return checkBucketedRateLimit(`${key}:${getClientIp(request)}`, options);
}

export function checkRoomRateLimit(key: string, roomCode: string, options: RateLimitOptions) {
  return checkBucketedRateLimit(`${key}:room:${roomCode}`, options, "Too many requests from this room. Please wait a moment and try again.");
}

async function checkBucketedRateLimit(
  bucketKey: string,
  options: RateLimitOptions,
  message = "Too many requests. Please wait a moment and try again."
) {
  const { data: allowed, error } = await supabaseAdmin.rpc("check_rate_limit", {
    bucket_key_input: bucketKey,
    window_ms_input: options.windowMs,
    max_requests_input: options.maxRequests,
  });

  // A rate-limit check that can't run shouldn't be the reason a real
  // request fails - fail open (same tradeoff the old in-memory version
  // had by default, just made explicit now that it's a real network call).
  if (error) {
    console.error("Rate limit check failed:", error);
    return null;
  }

  if (!allowed) {
    return Response.json({ error: message }, { status: 429 });
  }

  return null;
}

export async function readJsonWithLimit<T>(request: Request, maxBytes: number): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Request must be JSON");
  }

  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > maxBytes) {
    throw new Error("Request body is too large");
  }

  const body = await request.text();

  if (new TextEncoder().encode(body).length > maxBytes) {
    throw new Error("Request body is too large");
  }

  return JSON.parse(body) as T;
}

export function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\|\|\|/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validatePublicSupabaseUrl(url: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const inputUrl = new URL(url);
    const allowedHost = new URL(supabaseUrl).host;

    return inputUrl.protocol === "https:" && inputUrl.host === allowedHost;
  } catch {
    return false;
  }
}
