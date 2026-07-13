import {
  guardRequest,
  jsonError,
  logGameEvent,
  normalizeRoomCode,
  parsePositiveInteger,
  routeError,
  supabaseAdmin,
  verifyRequestPlayer,
} from "../_utils/api";
import {
  readJsonWithLimit,
  sanitizeText,
} from "../_utils/security";

type VoteRequest = {
  accessToken?: unknown;
  answerText?: unknown;
  gameId?: unknown;
  playerId?: unknown;
  roomCode?: unknown;
  votedForPlayerName?: unknown;
};

export async function POST(request: Request) {
  try {
    const requestError = guardRequest(request, "vote", 30);
    if (requestError) return requestError;

    const body = await readJsonWithLimit<VoteRequest>(request, 2_000);
    const roomCode = normalizeRoomCode(body.roomCode);
    const gameId = parsePositiveInteger(body.gameId);
    const playerId = parsePositiveInteger(body.playerId);
    const answerText = sanitizeText(body.answerText, 160);
    const votedForPlayerName = sanitizeText(body.votedForPlayerName, 40);

    if (
      !roomCode ||
      !gameId ||
      !playerId ||
      !answerText ||
      !votedForPlayerName
    ) {
      return jsonError("Valid room, game, player, and vote are required", 400);
    }

    const { data: voter, error: voterError } = await supabaseAdmin
      .from("players")
      .select("id, name, auth_user_id")
      .eq("id", playerId)
      .eq("room_code", roomCode)
      .maybeSingle();

    if (voterError) throw voterError;
    if (!voter) return jsonError("Player not found in this room", 403);

    if (!(await verifyRequestPlayer({ accessToken: body.accessToken, authUserId: voter.auth_user_id }))) {
      return jsonError("Not authorized to act as this player", 403);
    }

    const { data: game, error: gameError } = await supabaseAdmin
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

    const { data: players, error: playersError } = await supabaseAdmin
      .from("players")
      .select("id, name")
      .eq("room_code", roomCode);

    if (playersError) throw playersError;

    const allowSelfVoting = (players || []).length === 2;

    if (voter.name === votedForPlayerName && !allowSelfVoting) {
      return jsonError("You can't vote for your own submission", 403);
    }

    const { data: targetSubmission, error: targetSubmissionError } = await supabaseAdmin
      .from("submissions")
      .select("id, player_name, prompt")
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("player_name", votedForPlayerName)
      .eq("prompt", answerText)
      .maybeSingle();

    if (targetSubmissionError) throw targetSubmissionError;
    if (!targetSubmission) return jsonError("That submission was not found", 404);

    const { data: existingVote, error: existingVoteError } = await supabaseAdmin
      .from("votes")
      .select("id")
      .eq("game_id", gameId)
      .eq("room_code", roomCode)
      .eq("voter_name", voter.name)
      .maybeSingle();

    if (existingVoteError) throw existingVoteError;
    if (existingVote) return jsonError("You already voted this round", 409);

    const voteValue = `${targetSubmission.player_name}: ${targetSubmission.prompt}`;

    const { error: insertError } = await supabaseAdmin.from("votes").insert([
      {
        room_code: roomCode,
        game_id: gameId,
        voter_name: voter.name,
        voted_for: voteValue,
      },
    ]);

    if (insertError) throw insertError;

    await logGameEvent(request, {
      eventName: "vote_submitted",
      gameId,
      metadata: {
        votedForPlayerName: targetSubmission.player_name,
      },
      playerId,
      playerName: voter.name,
      roomCode,
      stage: game.stage,
    });

    const { count: submissionCount, error: submissionCountError } = await supabaseAdmin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("room_code", roomCode);

    if (submissionCountError) throw submissionCountError;

    const { count: voteCount, error: voteCountError } = await supabaseAdmin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("room_code", roomCode);

    if (voteCountError) throw voteCountError;

    const isWinnerStage = Boolean(submissionCount && voteCount && voteCount >= submissionCount);

    if (isWinnerStage) {
      const { error: stageError } = await supabaseAdmin
        .from("games")
        .update({ stage: "winner" })
        .eq("id", gameId)
        .eq("room_code", roomCode);

      if (stageError) throw stageError;

      await logGameEvent(request, {
        eventName: "game_completed",
        gameId,
        metadata: {
          voteCount: voteCount || 0,
          submissionCount: submissionCount || 0,
        },
        playerId,
        playerName: voter.name,
        roomCode,
        stage: "winner",
      });
    }

    return Response.json({
      stage: isWinnerStage ? "winner" : "reveal",
      voteCount: voteCount || 0,
    });
  } catch (error) {
    return routeError(error, "Failed to vote:", "Failed to vote");
  }
}
