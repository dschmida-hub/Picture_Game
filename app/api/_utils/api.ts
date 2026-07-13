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

export const MAX_PLAYER_NAME_LENGTH = 24;

export function normalizePlayerName(value: unknown) {
  return sanitizeText(value, MAX_PLAYER_NAME_LENGTH).replace(/\s+/g, " ").trim();
}

export function arePlayerNamesEqual(firstName: string, secondName: string) {
  return firstName.trim().toLowerCase() === secondName.trim().toLowerCase();
}

// Confirms the browser calling this route actually holds the session for
// the player id it's acting as, instead of just trusting whatever id is
// in the request body (every player's id is visible to every other room
// member via the normal roster query, so a bare id check lets any player
// act as any other). Mirrors the same tradeoff as is_player_session in
// host_rpc_identity_hardening.sql: a player row with no verified identity
// on record (anonymous-auth token failed at join, or a pre-migration row)
// can't be proven to mismatch the caller, so it's treated as unverifiable
// rather than blocked - this must never be the reason a real player can't
// play.
export async function verifyRequestPlayer({
  accessToken,
  authUserId,
}: {
  accessToken: unknown;
  authUserId: string | null;
}): Promise<boolean> {
  if (!authUserId) return true;

  if (typeof accessToken !== "string" || !accessToken) return false;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) return false;

  return data.user.id === authUserId;
}

export async function guardRequest(
  request: Request,
  key: string,
  maxRequests: number,
  windowMs = 60_000
) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  return checkRateLimit(request, key, { maxRequests, windowMs });
}

// Reports an error to Sentry without touching the caller's response -
// for routes whose failure response shape doesn't match routeError's
// generic { error } JSON (e.g. generate-image/regenerate-image, which
// return extra fields like `rejected` and `provider` on failure).
export function captureServerException(error: unknown, logMessage: string) {
  if (!process.env.SENTRY_DSN) return;

  import("@sentry/node")
    .then((Sentry) => Sentry.captureException(error, { extra: { logMessage } }))
    .catch(() => {});
}

export function routeError(error: unknown, logMessage: string, userMessage: string) {
  console.error(logMessage, error);

  if (isBadRequestError(error)) {
    return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
  }

  captureServerException(error, logMessage);

  return jsonError(userMessage, 500);
}

export type GameEventName =
  | "game_created"
  | "player_joined"
  | "round_started"
  | "answer_submitted"
  | "image_generated"
  | "image_generation_failed"
  | "vote_submitted"
  | "game_completed"
  | "room_returned_to_lobby"
  | "rematch_started";

type GameEventInput = {
  eventName: GameEventName;
  gameId?: number | null;
  metadata?: Record<string, unknown>;
  playerId?: number | null;
  playerName?: string | null;
  roomCode?: string | null;
  stage?: string | null;
};

function headerText(request: Request, headerName: string, maxLength = 200) {
  return sanitizeText(request.headers.get(headerName), maxLength) || null;
}

export async function logGameEvent(request: Request, event: GameEventInput) {
  try {
    const { error } = await supabaseAdmin.from("game_events").insert([
      {
        city: headerText(request, "x-vercel-ip-city", 120),
        country: headerText(request, "x-vercel-ip-country", 20),
        event_name: event.eventName,
        game_id: event.gameId || null,
        metadata: event.metadata || {},
        player_id: event.playerId || null,
        player_name: event.playerName ? sanitizeText(event.playerName, 80) : null,
        referrer: headerText(request, "referer", 500),
        region: headerText(request, "x-vercel-ip-country-region", 80),
        room_code: event.roomCode ? normalizeRoomCode(event.roomCode) : null,
        stage: event.stage ? sanitizeText(event.stage, 40) : null,
        timezone: headerText(request, "x-vercel-ip-timezone", 80),
        user_agent: headerText(request, "user-agent", 500),
      },
    ]);

    if (error) console.error("Failed to log game event:", error);
  } catch (error) {
    console.error("Failed to log game event:", error);
  }
}
