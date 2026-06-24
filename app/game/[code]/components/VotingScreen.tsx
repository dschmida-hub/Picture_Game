type GameMode = "classic" | "cards";

type VotingScreenProps = {
  showHeader?: boolean;
  gameMode: GameMode;
  roundPrompt: string;
  roundImageStyle: string;
  votingTimeRemainingSeconds: number | null;
  isVotingTimeExpired: boolean;
  voteMessage: string;
  isHost: boolean;
  isForcingStage: boolean;
  hasVoted: boolean;
  playerName: string;
  submissions: string[];
  onEndVotingEarly: () => void;
  onVote: (answerText: string, submissionPlayerName: string) => void;
  onSaveImage: (imageUrl: string, imageCaption: string) => void;
  formatCountdown: (seconds: number) => string;
  getImageStyleLabel: (style: string) => string;
};

export function VotingScreen({
  showHeader = true,
  gameMode,
  roundPrompt,
  roundImageStyle,
  votingTimeRemainingSeconds,
  isVotingTimeExpired,
  voteMessage,
  isHost,
  isForcingStage,
  hasVoted,
  playerName,
  submissions,
  onEndVotingEarly,
  onVote,
  onSaveImage,
  formatCountdown,
  getImageStyleLabel,
}: VotingScreenProps) {
  const isCards = gameMode === "cards";

  return (
    <>
      {showHeader && <div className="w-full max-w-3xl space-y-3 text-center">
        <div
          className={`mx-auto w-full max-w-2xl rounded-3xl p-5 text-center shadow-xl ${
            isCards ? "bg-black text-white" : "bg-white"
          }`}
        >
          <div className={`mb-2 font-bold tracking-wider ${isCards ? "text-gray-300" : "text-purple-600"}`}>
            {isCards ? "🃏 FILL IN THE BLANK" : "🎯 ROUND PROMPT"}
          </div>
          <h2 className="text-3xl font-black">{roundPrompt}</h2>
          <p className={`mt-3 text-sm font-bold ${isCards ? "text-gray-300" : "text-purple-600"}`}>
            Art style: {getImageStyleLabel(roundImageStyle)}
          </p>
          {votingTimeRemainingSeconds !== null && (
            <p className="mt-4 text-lg font-extrabold">
              {isVotingTimeExpired
                ? "Voting time is up — waiting for the host"
                : `Vote now: ${formatCountdown(votingTimeRemainingSeconds)}`}
            </p>
          )}
        </div>

        {voteMessage && (
          <div className="rounded-xl border border-green-400 bg-green-100 px-4 py-3 text-green-700">
            {voteMessage}
          </div>
        )}

        {isHost && (
          <button
            type="button"
            onClick={onEndVotingEarly}
            disabled={isForcingStage}
            className="rounded-2xl bg-purple-700 px-6 py-3 font-extrabold text-white disabled:opacity-50"
          >
            {isForcingStage ? "Calculating Winner..." : "End Voting & Reveal Winner"}
          </button>
        )}
      </div>}

      <div className="grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
        {submissions.map((item, index) => {
          const [text, imageUrl, submissionPlayerName, imageCaption] = item.split("|||");
          const isOwnSubmission = submissionPlayerName === playerName;
          const isVoteUnavailable = hasVoted || isVotingTimeExpired || isOwnSubmission;

          return (
            <div
              key={index}
              onClick={() => {
                if (!isVoteUnavailable) onVote(text, submissionPlayerName);
              }}
              className={`overflow-hidden rounded-2xl border shadow-lg transition ${
                isVoteUnavailable
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:scale-[1.02] hover:shadow-2xl"
              }`}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={imageCaption || "A player submission"}
                  className="aspect-square w-full bg-gray-100 object-cover"
                />
              )}
              <div className="bg-white p-4">
                <p className="mb-4 text-center text-xl font-bold leading-relaxed">
                  {imageCaption || "Untitled Masterpiece"}
                </p>
                {!isVoteUnavailable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onVote(text, submissionPlayerName);
                    }}
                    className="w-full rounded-xl bg-black px-4 py-3 font-bold text-white"
                  >
                    Vote for This
                  </button>
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    {isOwnSubmission
                      ? "Your submission"
                      : isVotingTimeExpired
                        ? "Voting time is up"
                        : "Vote locked in"}
                  </p>
                )}

                {imageUrl && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSaveImage(imageUrl, imageCaption || "Untitled Masterpiece");
                    }}
                    className="mt-3 w-full rounded-xl bg-purple-600 px-4 py-2 text-white"
                  >
                    Save Image
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
