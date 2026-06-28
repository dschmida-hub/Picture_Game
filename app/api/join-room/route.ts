import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
  validatePublicSupabaseUrl,
} from "../_utils/security";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
const MAX_PLAYERS = 8;

type JoinRoomRequest = {
  allowCreateRoom?: unknown;
  avatarDescription?: unknown;
  avatarUrl?: unknown;
  name?: unknown;
  roomCode?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isBadRequestError(error: unknown) {
  if (error instanceof SyntaxError) return true;
  if (!(error instanceof Error)) return false;

  return error.message === "Request must be JSON" || error.message === "Request body is too large";
}

function normalizePlayerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 40);
}

function arePlayerNamesEqual(firstName: string, secondName: string) {
  return firstName.trim().toLowerCase() === secondName.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "join-room", {
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<JoinRoomRequest>(request, 3_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const name = normalizePlayerName(sanitizeText(body.name, 40));
    const allowCreateRoom = body.allowCreateRoom === true;
    const avatarUrl = sanitizeText(body.avatarUrl, 600);
    const avatarDescription = sanitizeText(body.avatarDescription, 240);

    if (!roomCode || !ROOM_CODE_PATTERN.test(roomCode) || !name) {
      return jsonError("Valid room code and player name are required", 400);
    }

    if (avatarUrl && !validatePublicSupabaseUrl(avatarUrl)) {
      return jsonError("Invalid avatar URL", 400);
    }

    const { data: roomPlayers, error: roomPlayersError } = await supabase
      .from("players")
      .select("id, name")
      .eq("room_code", roomCode);

    if (roomPlayersError) throw roomPlayersError;

    const players = roomPlayers || [];

    if (players.length === 0 && !allowCreateRoom) {
      return jsonError("Game not found. Check the room code and try again.", 404);
    }

    if (players.length >= MAX_PLAYERS) {
      return jsonError("This room is full (8 players max).", 409);
    }

    const nameAlreadyTaken = players.some((player) => arePlayerNamesEqual(player.name, name));

    if (nameAlreadyTaken) {
      return jsonError(
        "That name is already taken in this room. Pick another name, or rejoin from the same device you used before.",
        409
      );
    }

    const isFirstPlayer = players.length === 0;

    const { data: newPlayer, error: insertError } = await supabase
      .from("players")
      .insert([
        {
          name,
          room_code: roomCode,
          avatar_url: avatarUrl || null,
          avatar_description: avatarDescription || null,
          points: 0,
          is_host: isFirstPlayer,
        },
      ])
      .select("id, name, is_host")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonError("That name was just taken in this room. Pick another name.", 409);
      }

      throw insertError;
    }

    return Response.json({
      isHost: Boolean(newPlayer.is_host),
      playerId: newPlayer.id,
      playerName: newPlayer.name,
    });
  } catch (error) {
    console.error("Failed to join room:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    return jsonError("Failed to join room", 500);
  }
}
