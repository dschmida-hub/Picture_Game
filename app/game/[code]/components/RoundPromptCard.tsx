import type { GameMode } from "./types";

type RoundPromptCardProps = {
  gameMode: GameMode;
  prompt: string;
  imageStyle: string;
  timeRemainingSeconds?: number | null;
  expiredMessage?: string;
  activeTimerLabel?: string;
  skipVoteCount?: number;
  skipVotesNeeded?: number;
  hasVotedToSkip?: boolean;
  isVotingToSkip?: boolean;
  formatCountdown: (seconds: number) => string;
  getImageStyleLabel: (style: string) => string;
  onVoteToSkip?: () => void;
};

export function RoundPromptCard({
  gameMode,
  prompt,
  imageStyle,
  timeRemainingSeconds = null,
  expiredMessage = "Time's up — waiting for the host",
  activeTimerLabel = "Time remaining",
  skipVoteCount = 0,
  skipVotesNeeded = 0,
  hasVotedToSkip = false,
  isVotingToSkip = false,
  formatCountdown,
  getImageStyleLabel,
  onVoteToSkip,
}: RoundPromptCardProps) {
  const isCards = gameMode === "cards";
  const canShowSkipVote = Boolean(onVoteToSkip && skipVotesNeeded > 0);

  return (
    <div
      className={`w-full max-w-2xl rounded-3xl p-6 text-center shadow-xl ${
        isCards ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      <div
        className={`mb-3 text-sm font-extrabold tracking-wider ${
          isCards ? "text-gray-300" : "text-purple-600"
        }`}
      >
        {isCards ? "FILL IN THE BLANK" : "ROUND PROMPT"}
      </div>

      <h2 className="break-words text-3xl font-black leading-tight">{prompt}</h2>

      <p className={`mt-3 text-sm font-bold ${isCards ? "text-gray-300" : "text-purple-600"}`}>
        Art style: {getImageStyleLabel(imageStyle)}
      </p>

      {timeRemainingSeconds !== null && (
        <p className="mt-4 text-lg font-extrabold">
          {timeRemainingSeconds === 0
            ? expiredMessage
            : `${activeTimerLabel}: ${formatCountdown(timeRemainingSeconds)}`}
        </p>
      )}

      {canShowSkipVote && (
        <div
          className={`mt-5 rounded-2xl border p-3 ${
            isCards
              ? "border-white/15 bg-white/10 text-gray-200"
              : "border-orange-200 bg-orange-50 text-orange-950"
          }`}
        >
          <p className={`text-xs font-extrabold uppercase tracking-wider ${isCards ? "text-gray-300" : "text-orange-700"}`}>
            Not feeling this prompt?
          </p>

          <div className="mt-2 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onVoteToSkip}
              disabled={hasVotedToSkip || isVotingToSkip}
              className={`rounded-full px-4 py-2 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isCards
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}
            >
              {isVotingToSkip ? "Voting..." : hasVotedToSkip ? "Skip Vote Cast" : "Vote to Skip"}
            </button>

            <p className={`text-sm font-bold ${isCards ? "text-gray-300" : "text-orange-800"}`}>
              {skipVoteCount} / {skipVotesNeeded} skip votes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
