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

type VoteRequest = {
  answerText?: unknown;
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  votedForPlayerName?: unknown;
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

export async function POST(request: Request) {
  try {
    const originError = checkSameOrigin(request);
    if (originError) return originError;

    const rateLimitError = checkRateLimit(request, "vote", {
      windowMs: 60_000,
      maxRequests: 30,
    });
    if (rateLimitError) return rateLimitError;

    const body = await readJsonWithLimit<VoteRequest>(request, 2_000);
    const roomCode = sanitizeText(body.roomCode, 12).toUpperCase();
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const answerText = sanitizeText(body.answerText, 160);
    const votedForPlayerName = sanitizeText(body.votedForPlayerName, 40);

    if (
      !roomCode ||
      !ROOM_CODE_PATTERN.test(roomCode) ||
      !gameId ||
      !playerId ||
      !answerText ||
      !votedForPlayerName
    ) {
      return jsonError("Valid room, game, player, and vote are required", 400);
    }

    const { data: voter, error: voterError } = await supabase
      .from("players")
      .select("id, name")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (voterError) throw voterError;
    if (!voter) return jsonError("Player not found in this room", 403);

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, room_code, stage, voting_deadline")
      .eq("id", gameId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (gameError) throw gameError;
    if (!game) return jsonError("Game not found", 404);

    if (game.stage !== "reveal") {
      return jsonError("This round is not accepting votes", 409);
    }

    if (game.voting_deadline && new Date(game.voting_deadline).getTime() <= Date.now()) {
      return jsonError("Voting time is up", 409);
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name")
      .eq("room_code", roomCode);

    if (playersError) throw playersError;

    const allowSelfVoting = (players || []).length === 2;

    if (voter.name === votedForPlayerName && !allowSelfVoting) {
      return jsonError("You can't vote for your own submission", 403);
    }

    const { data: targetSubmission, error: targetSubmissionError } = await supabase
      .from("submissions")
      .select("id, player_name, prompt")
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("player_name", votedForPlayerName)
      .eq("prompt", answerText)
      .maybeSingle();

    if (targetSubmissionError) throw targetSubmissionError;
    if (!targetSubmission) return jsonError("That submission was not found", 404);

    const { data: existingVote, error: existingVoteError } = await supabase
      .from("votes")
      .select("id")
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("voter_name", voter.name)
      .maybeSingle();

    if (existingVoteError) throw existingVoteError;
    if (existingVote) return jsonError("You already voted this round", 409);

    const voteValue = `${targetSubmission.player_name}: ${targetSubmission.prompt}`;

    const { error: insertError } = await supabase.from("votes").insert([
      {
        room_code: roomCode,
        game_id: gameId,
        voter_name: voter.name,
        voted_for: voteValue,
      },
    ]);

    if (insertError) throw insertError;

    const { count: submissionCount, error: submissionCountError } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("room_code", roomCode);

    if (submissionCountError) throw submissionCountError;

    const { count: voteCount, error: voteCountError } = await supabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("room_code", roomCode);

    if (voteCountError) throw voteCountError;

    const isWinnerStage = Boolean(submissionCount && voteCount && voteCount >= submissionCount);

    if (isWinnerStage) {
      const { error: stageError } = await supabase
        .from("games")
        .update({ stage: "winner" })
        .eq("id", gameId)
        .eq("room_code", roomCode);

      if (stageError) throw stageError;
    }

    return Response.json({
      stage: isWinnerStage ? "winner" : "reveal",
      voteCount: voteCount || 0,
    });
  } catch (error) {
    console.error("Failed to vote:", error);

    if (isBadRequestError(error)) {
      return jsonError(error instanceof Error ? error.message : "Invalid request", 400);
    }

    return jsonError("Failed to vote", 500);
  }
}
