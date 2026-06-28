import {
  guardRequest,
  jsonError,
  normalizeRoomCode,
  parsePositiveInteger,
  routeError,
  supabaseAdmin,
} from "../_utils/api";
import {
  readJsonWithLimit,
} from "../_utils/security";

type ImageReportRequest = {
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  submissionId?: unknown;
};

export async function POST(request: Request) {
  try {
    const requestError = guardRequest(request, "image-report", 10);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<ImageReportRequest>(request, 2_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);

    if (!roomCode || !gameId || !playerId || !submissionId) {
      return jsonError("Valid room, game, player, and submission are required", 400);
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("id, name")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) return jsonError("Player not found in this room", 403);

    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("id, game_mode, image_style, prompt, prompt_source")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return jsonError("Game not found", 404);

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select("id, image_url, player_name, prompt")
      .eq("id", submissionId)
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (submissionError) throw submissionError;
    if (!submission?.image_url) return jsonError("Generated image not found", 404);

    const { error: reportError } = await supabaseAdmin
      .from("image_reports")
      .upsert(
        {
          game_id: gameId,
          game_mode: game.game_mode,
          image_style: game.image_style,
          prompt_source: game.prompt_source,
          reported_player_name: submission.player_name,
          reporter_name: player.name,
          room_code: roomCode,
          round_prompt: game.prompt,
          status: "open",
          submission_id: submissionId,
          submission_text: submission.prompt,
        },
        {
          onConflict: "submission_id,reporter_name",
        }
      );

    if (reportError) throw reportError;

    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error, "Failed to report image:", "Could not report image");
  }
}
