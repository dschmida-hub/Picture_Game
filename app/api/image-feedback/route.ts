import { createClient } from "@supabase/supabase-js";
import { getActiveImageModel, imageConfig } from "@/app/lib/imageConfig";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

type ImageFeedbackRating = "funny" | "meh" | "bad";

type ImageFeedbackRequest = {
  gameId?: unknown;
  playerId?: unknown;
  rating?: unknown;
  roomCode?: unknown;
  submissionId?: unknown;
};

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
const validRatings = new Set<ImageFeedbackRating>(["funny", "meh", "bad"]);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parsePositiveInteger(value: unknown) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function isBadRequestError(error: unknown) {
  if (error instanceof SyntaxError) return true;
  if (!(error instanceof Error)) return false;

  return error.message === "Request must be JSON" || error.message === "Request body is too large";
}

function parseRating(value: unknown): ImageFeedbackRating | null {
  if (typeof value !== "string") return null;

  return validRatings.has(value as ImageFeedbackRating)
    ? (value as ImageFeedbackRating)
    : null;
}

export async function POST(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "image-feedback", {
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<ImageFeedbackRequest>(request, 2_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);
    const rating = parseRating(body.rating);

    if (!roomCode || !ROOM_CODE_PATTERN.test(roomCode) || !gameId || !playerId || !submissionId || !rating) {
      return jsonError("Valid room, game, player, submission, and rating are required", 400);
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, name")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (playerError) throw playerError;
    if (!player) return jsonError("Player not found in this room", 403);

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, game_mode, image_style, prompt_source")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return jsonError("Game not found", 404);

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, image_url, player_name")
      .eq("id", submissionId)
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (submissionError) throw submissionError;
    if (!submission?.image_url) return jsonError("Generated image not found", 404);

    const { error: feedbackError } = await supabase
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
    console.error("Failed to save image feedback:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    return jsonError("Could not save image feedback", 500);
  }
}
