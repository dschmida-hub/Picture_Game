import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, checkSameOrigin, sanitizeText } from "./security";

export const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function isBadRequestError(error: unknown) {
  if (error instanceof SyntaxError) return true;
  if (!(error instanceof Error)) return false;

  return error.message === "Request must be JSON" || error.message === "Request body is too large";
}

export function parsePositiveInteger(value: unknown) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function normalizeRoomCode(value: unknown) {
  const roomCode = sanitizeText(value, 12).toUpperCase();
  return ROOM_CODE_PATTERN.test(roomCode) ? roomCode : "";
}

export function normalizePlayerName(value: unknown) {
  return sanitizeText(value, 40).replace(/\s+/g, " ").trim();
}

export function arePlayerNamesEqual(firstName: string, secondName: string) {
  return firstName.trim().toLowerCase() === secondName.trim().toLowerCase();
}

export function guardRequest(
  request: Request,
  key: string,
  maxRequests: number,
  windowMs = 60_000
) {
  return checkSameOrigin(request) || checkRateLimit(request, key, { maxRequests, windowMs });
}

export function routeError(error: unknown, logMessage: string, userMessage: string) {
  console.error(logMessage, error);

  if (isBadRequestError(error)) {
    return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
  }

  return jsonError(userMessage, 500);
}
