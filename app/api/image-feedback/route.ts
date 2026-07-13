import { getActiveImageModel, imageConfig } from "@/app/lib/imageConfig";
import {
  guardRequest,
  jsonError,
  normalizeRoomCode,
  parsePositiveInteger,
  routeError,
  supabaseAdmin,
  verifyRequestPlayer,
} from "../_utils/api";
import {
  readJsonWithLimit,
} from "../_utils/security";

type ImageFeedbackRating = "funny" | "meh" | "bad";

type ImageFeedbackRequest = {
  accessToken?: unknown;
  gameId?: unknown;
  playerId?: unknown;
  rating?: unknown;
  roomCode?: unknown;
  submissionId?: unknown;
};

const validRatings = new Set<ImageFeedbackRating>(["funny", "meh", "bad"]);

function parseRating(value: unknown): ImageFeedbackRating | null {
  if (typeof value !== "string") return null;

  return validRatings.has(value as ImageFeedbackRating)
    ? (value as ImageFeedbackRating)
    : null;
}

export async function POST(request: Request) {
  try {
    const requestError = guardRequest(request, "image-feedback", 30);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<ImageFeedbackRequest>(request, 2_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);
    const rating = parseRating(body.rating);

    if (!roomCode || !gameId || !playerId || !submissionId || !rating) {
      return jsonError("Valid room, game, player, submission, and rating are required", 400);
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

    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("id, game_mode, image_style, prompt_source")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return jsonError("Game not found", 404);

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select("id, image_url, player_name")
      .eq("id", submissionId)
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (submissionError) throw submissionError;
    if (!submission?.image_url) return jsonError("Generated image not found", 404);

    const { error: feedbackError } = await supabaseAdmin
      .from("image_feedback")
      .upsert(
        {
          game_id: gameId,
          game_mode: game.game_mode,
          image_model: getActiveImageModel(),
          image_provider: imageConfig.provider,
          image_style: game.image_style,
          prompt_source: game.prompt_source,
          rating,
          room_code: roomCode,
          rater_name: player.name,
          submission_id: submissionId,
          submission_player_name: submission.player_name,
        },
        {
          onConflict: "submission_id,rater_name",
        }
      );

    if (feedbackError) throw feedbackError;

    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error, "Failed to save image feedback:", "Could not save image feedback");
  }
}
