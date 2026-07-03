import { containsBannedContent } from "@/app/lib/contentPolicy";
import {
  guardRequest,
  jsonError,
  logGameEvent,
  normalizeRoomCode,
  parsePositiveInteger,
  routeError,
  supabaseAdmin,
} from "../_utils/api";
import {
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

const MAX_ANSWER_LENGTH = 120;
const IMAGE_REPORT_STRIKE_LIMIT = 3;

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

async function loadPlayerAndGame({
  gameId,
  playerId,
  roomCode,
}: {
  gameId: number;
  playerId: number;
  roomCode: string;
}) {
  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .select("id, name")
    .eq("id", playerId)
    .eq("room_code", roomCode)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player) return { error: jsonError("Player not found in this room", 403) };

  const { data: game, error: gameError } = await supabaseAdmin
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
    const requestError = guardRequest(request, "submit-answer", 20);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<SubmitAnswerRequest>(request, 2_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const answer = sanitizeText(body.answer, MAX_ANSWER_LENGTH);

    if (!roomCode || !gameId || !playerId || !answer) {
      return jsonError("Valid room, game, player, and answer are required", 400);
    }

    if (containsBannedContent(answer)) {
      return jsonError("That answer isn't allowed. Please try something else.", 400);
    }

    const context = await loadPlayerAndGame({ gameId, playerId, roomCode });
    if (context.error) return context.error;

    const { game, player } = context.data;

    if (game.stage !== "submitting") {
      return jsonError("This round is not accepting answers", 409);
    }

    const { count: reportCount, error: reportCountError } = await supabaseAdmin
      .from("image_reports")
      .select("id", { count: "exact", head: true })
      .eq("room_code", roomCode)
      .eq("reported_player_name", player.name)
      .neq("status", "dismissed");

    if (reportCountError) throw reportCountError;

    if ((reportCount || 0) >= IMAGE_REPORT_STRIKE_LIMIT) {
      return jsonError("You've been restricted from submitting in this room due to repeated image reports", 403);
    }

    if (game.submission_deadline && new Date(game.submission_deadline).getTime() <= Date.now()) {
      return jsonError("Time is up for this round", 409);
    }

    const { count, error: countError } = await supabaseAdmin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("player_name", player.name);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      return jsonError("You already submitted an answer for this round", 409);
    }

    const { data: submission, error: insertError } = await supabaseAdmin
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

    await logGameEvent(request, {
      eventName: "answer_submitted",
      gameId,
      metadata: {
        answerLength: answer.length,
      },
      playerId,
      playerName: player.name,
      roomCode,
      stage: game.stage,
    });

    return Response.json({ submissionId: submission.id });
  } catch (error) {
    return routeError(error, "Failed to submit answer:", "Failed to submit answer");
  }
}

export async function DELETE(request: Request) {
  try {
    const requestError = guardRequest(request, "delete-submission", 20);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<DeleteSubmissionRequest>(request, 2_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const submissionId = parsePositiveInteger(body.submissionId);

    if (!roomCode || !gameId || !playerId || !submissionId) {
      return jsonError("Valid room, game, player, and submission are required", 400);
    }

    const context = await loadPlayerAndGame({ gameId, playerId, roomCode });
    if (context.error) return context.error;

    const { player } = context.data;

    const { error } = await supabaseAdmin
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
    return routeError(error, "Failed to delete pending submission:", "Failed to delete pending submission");
  }
}
