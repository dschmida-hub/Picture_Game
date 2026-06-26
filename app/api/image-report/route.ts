import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

type ImageReportRequest = {
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  submissionId?: unknown;
};

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

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

export async function POST(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "image-report", {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<ImageReportRequest>(request, 2_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);

    if (!roomCode || !ROOM_CODE_PATTERN.test(roomCode) || !gameId || !playerId || !submissionId) {
      return jsonError("Valid room, game, player, and submission are required", 400);
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
      .select("id, game_mode, image_style, prompt, prompt_source")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return jsonError("Game not found", 404);

    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, image_url, player_name, prompt")
      .eq("id", submissionId)
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (submissionError) throw submissionError;
    if (!submission?.image_url) return jsonError("Generated image not found", 404);

    const { error: reportError } = await supabase
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
    console.error("Failed to report image:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    return jsonError("Could not report image", 500);
  }
}
