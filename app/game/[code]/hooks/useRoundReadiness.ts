import { parseSubmission } from "../components/submissions";
import type { Player } from "../components/types";

export function useRoundReadiness({
  currentPlayerName,
  players,
  submissions,
  votedPlayerNames,
}: {
  currentPlayerName: string;
  players: Player[];
  submissions: string[];
  votedPlayerNames: string[];
}) {
  const parsedSubmissions = submissions.map((item) => parseSubmission(item));
  const hasSubmitted = parsedSubmissions.some((submission) => submission.playerName === currentPlayerName);
  const hasCurrentRoundImage = parsedSubmissions.some((submission) => Boolean(submission.imageUrl));
  const submittedPlayerNames = new Set(parsedSubmissions.map((submission) => submission.playerName));
  const imageReadyPlayerNames = new Set(
    parsedSubmissions
      .filter((submission) => Boolean(submission.imageUrl))
      .map((submission) => submission.playerName)
  );
  const votedPlayerNameSet = new Set(votedPlayerNames);

  return {
    hasCurrentRoundImage,
    hasSubmitted,
    waitingOnImageNames: players
      .filter((player) => submittedPlayerNames.has(player.name) && !imageReadyPlayerNames.has(player.name))
      .map((player) => player.name),
    waitingOnSubmissionNames: players
      .filter((player) => !submittedPlayerNames.has(player.name))
      .map((player) => player.name),
    waitingOnVoteNames: players
      .filter((player) => submittedPlayerNames.has(player.name) && !votedPlayerNameSet.has(player.name))
      .map((player) => player.name),
  };
}
