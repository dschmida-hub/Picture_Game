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
  accessToken?: unknown;
  allowCreateRoom?: unknown;
  avatarDescription?: unknown;
  avatarUrl?: unknown;
  name?: unknown;
  roomCode?: unknown;
  skipAutoHost?: unknown;
};

export async function POST(request: Request) {
  try {
    const requestError = guardRequest(request, "join-room", 20);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<JoinRoomRequest>(request, 3_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const name = normalizePlayerName(body.name);
    const allowCreateRoom = body.allowCreateRoom === true;
    const skipAutoHost = body.skipAutoHost === true;
    const avatarUrl = sanitizeText(body.avatarUrl, 600);
    const avatarDescription = sanitizeText(body.avatarDescription, 240);
    const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";

    if (!roomCode || !name) {
      return jsonError("Valid room code and player name are required", 400);
    }

    // Never trust a client-supplied user id - verify the token against
    // Supabase Auth itself. A failure here doesn't block the join (this
    // must never be the reason a real player can't get into a room); it
    // just means this player's browser won't be linked to a verified
    // identity, so direct-write RLS checks that key off room membership
    // won't recognize them until they have a valid session.
    let authUserId: string | null = null;
    if (accessToken) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
      if (userError) {
        console.error("Failed to verify anonymous session token:", userError);
      } else {
        authUserId = userData.user?.id ?? null;
      }
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
    // Party Mode rooms are created straight to TV Mode - the device that
    // clicked "Start Free Game" never joins as a player, so nobody is
    // "first" in the usual sense. skipAutoHost (set for links that came
    // from that flow) leaves the room hostless until someone explicitly
    // claims it via claim_host, instead of silently handing it to
    // whichever phone happens to scan the QR code first.
    const isHost = isFirstPlayer && !skipAutoHost;

    const { data: newPlayer, error: insertError } = await supabaseAdmin
      .from("players")
      .insert([
        {
          name,
          room_code: roomCode,
          avatar_url: avatarUrl || null,
          avatar_description: avatarDescription || null,
          points: 0,
          is_host: isHost,
          auth_user_id: authUserId,
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
