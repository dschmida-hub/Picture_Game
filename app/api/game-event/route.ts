import {
  guardRequest,
  jsonError,
  logGameEvent,
  normalizeRoomCode,
  parsePositiveInteger,
  routeError,
  supabaseAdmin,
  verifyRequestPlayer,
  type GameEventName,
} from "../_utils/api";
import { readJsonWithLimit, sanitizeText } from "../_utils/security";

type GameEventRequest = {
  accessToken?: unknown;
  eventName?: unknown;
  gameId?: unknown;
  metadata?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  stage?: unknown;
};

const ALLOWED_CLIENT_EVENTS = new Set<GameEventName>([
  "round_started",
  "game_completed",
  "room_returned_to_lobby",
  "rematch_started",
]);

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, item]) => [sanitizeText(key, 60), sanitizeText(item, 300)])
      .filter(([key]) => Boolean(key))
  );
}

export async function POST(request: Request) {
  try {
    const requestError = await guardRequest(request, "game-event", 60);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<GameEventRequest>(request, 3_000);
    const eventName = sanitizeText(body.eventName, 60) as GameEventName;
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const roomCode = normalizeRoomCode(body.roomCode);
    const stage = sanitizeText(body.stage, 40);

    if (!eventName || !ALLOWED_CLIENT_EVENTS.has(eventName)) {
      return jsonError("Invalid event name", 400);
    }

    if (!roomCode || !gameId || !playerId) {
      return jsonError("Valid room, game, and player are required", 400);
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("id, name, auth_user_id")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) return jsonError("Player not found in this room", 403);

    if (!(await verifyRequestPlayer({ accessToken: body.accessToken, authUserId: player.auth_user_id }))) {
      return jsonError("Not authorized to act as this player", 403);
    }

    await logGameEvent(request, {
      eventName,
      gameId,
      metadata: safeMetadata(body.metadata),
      playerId,
      playerName: player.name,
      roomCode,
      stage,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error, "Failed to log game event:", "Failed to log game event");
  }
}
