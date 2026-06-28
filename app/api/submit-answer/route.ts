import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  checkSameOrigin,
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
const MAX_ANSWER_LENGTH = 120;

type SubmitAnswerRequest = {
  answer?: unknown;
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
};

type DeleteSubmissionRequest = {
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  submissionId?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isBadRequestError(error: unknown) {
  if (error instanceof SyntaxError) return true;
  if (!(error instanceof Error)) return false;

  return error.message === "Request must be JSON" || error.message === "Request body is too large";
}

function parsePositiveInteger(value: unknown) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

async function loadPlayerAndGame({
  gameId,
  playerId,
  roomCode,
}: {
  gameId: number;
  playerId: number;
  roomCode: string;
}) {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", playerId)
    .eq("room_code", roomCode)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player) return { error: jsonError("Player not found in this room", 403) };

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, room_code, stage, submission_deadline")
    .eq("id", gameId)
    .eq("room_code", roomCode)
    .maybeSingle();

  if (gameError) throw gameError;
  if (!game) return { error: jsonError("Game not found", 404) };

  return { data: { game, player } };
}

export async function POST(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "submit-answer", {
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<SubmitAnswerRequest>(request, 2_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const answer = sanitizeText(body.answer, MAX_ANSWER_LENGTH);

    if (!roomCode || !ROOM_CODE_PATTERN.test(roomCode) || !gameId || !playerId || !answer) {
      return jsonError("Valid room, game, player, and answer are required", 400);
    }

    const context = await loadPlayerAndGame({ gameId, playerId, roomCode });
    if (context.error) return context.error;

    const { game, player } = context.data;

    if (game.stage !== "submitting") {
      return jsonError("This round is not accepting answers", 409);
    }

    if (game.submission_deadline && new Date(game.submission_deadline).getTime() <= Date.now()) {
      return jsonError("Time is up for this round", 409);
    }

    const { count, error: countError } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("player_name", player.name);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      return jsonError("You already submitted an answer for this round", 409);
    }

    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert([
        {
          room_code: roomCode,
          game_id: gameId,
          player_name: player.name,
          prompt: answer,
          image_url: null,
          gallery_thumbnail_url: null,
          image_caption: null,
        },
      ])
      .select("id")
      .single();

    if (insertError) throw insertError;

    return Response.json({ submissionId: submission.id });
  } catch (error) {
    console.error("Failed to submit answer:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    return jsonError("Failed to submit answer", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "delete-submission", {
      windowMs: 60_000,
      maxRequests: 20,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<DeleteSubmissionRequest>(request, 2_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);

    if (!roomCode || !ROOM_CODE_PATTERN.test(roomCode) || !gameId || !playerId || !submissionId) {
      return jsonError("Valid room, game, player, and submission are required", 400);
    }

    const context = await loadPlayerAndGame({ gameId, playerId, roomCode });
    if (context.error) return context.error;

    const { player } = context.data;

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId)
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("player_name", player.name)
      .is("image_url", null);

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete pending submission:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    return jsonError("Failed to delete pending submission", 500);
  }
}
