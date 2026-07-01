import {
  arePlayerNamesEqual,
  guardRequest,
  jsonError,
  logGameEvent,
  normalizePlayerName,
  normalizeRoomCode,
  routeError,
  supabaseAdmin,
} from "../_utils/api";
import {
  readJsonWithLimit,
  sanitizeText,
  validatePublicSupabaseUrl,
} from "../_utils/security";

const MAX_PLAYERS = 8;

type JoinRoomRequest = {
  allowCreateRoom?: unknown;
  avatarDescription?: unknown;
  avatarUrl?: unknown;
  name?: unknown;
  roomCode?: unknown;
};

export async function POST(request: Request) {
  try {
    const requestError = guardRequest(request, "join-room", 20);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<JoinRoomRequest>(request, 3_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const name = normalizePlayerName(body.name);
    const allowCreateRoom = body.allowCreateRoom === true;
    const avatarUrl = sanitizeText(body.avatarUrl, 600);
    const avatarDescription = sanitizeText(body.avatarDescription, 240);

    if (!roomCode || !name) {
      return jsonError("Valid room code and player name are required", 400);
    }

    if (avatarUrl && !validatePublicSupabaseUrl(avatarUrl)) {
      return jsonError("Invalid avatar URL", 400);
    }

    const { data: roomPlayers, error: roomPlayersError } = await supabaseAdmin
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

    const { data: newPlayer, error: insertError } = await supabaseAdmin
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

    await logGameEvent(request, {
      eventName: isFirstPlayer && allowCreateRoom ? "game_created" : "player_joined",
      metadata: {
        allowCreateRoom,
        isHost: Boolean(newPlayer.is_host),
        playerCountBeforeJoin: players.length,
      },
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      roomCode,
      stage: "lobby",
    });

    return Response.json({
      isHost: Boolean(newPlayer.is_host),
      playerId: newPlayer.id,
      playerName: newPlayer.name,
    });
  } catch (error) {
    return routeError(error, "Failed to join room:", "Failed to join room");
  }
}
