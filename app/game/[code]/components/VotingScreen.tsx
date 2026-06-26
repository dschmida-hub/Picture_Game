import { RoundPromptCard } from "./RoundPromptCard";
import { WaitingOnList } from "./WaitingOnList";
import { parseSubmission } from "./submissions";
import type { GameMode } from "./types";

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
  allowSelfVoting: boolean;
  playerName: string;
  submissions: string[];
  waitingOnVoteNames: string[];
  onEndVotingEarly: () => void;
  onReturnToLobby: () => void;
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
  allowSelfVoting,
  playerName,
  submissions,
  waitingOnVoteNames,
  onEndVotingEarly,
  onReturnToLobby,
  onVote,
  onSaveImage,
  formatCountdown,
  getImageStyleLabel,
}: VotingScreenProps) {
  return (
    <>
      {showHeader && (
        <div className="w-full max-w-4xl space-y-3 text-center">
          <RoundPromptCard
            gameMode={gameMode}
            prompt={roundPrompt}
            imageStyle={roundImageStyle}
            timeRemainingSeconds={votingTimeRemainingSeconds}
            expiredMessage="Voting time is up — waiting for the host"
            activeTimerLabel="Vote now"
            formatCountdown={formatCountdown}
            getImageStyleLabel={getImageStyleLabel}
          />

          {voteMessage && (
            <div className="rounded-2xl border border-green-400 bg-green-100 px-4 py-3 text-sm font-extrabold text-green-700 md:text-base">
              {voteMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
            <WaitingOnList
              title="Waiting on votes"
              names={waitingOnVoteNames}
              emptyMessage="All votes are in!"
            />

            {isHost && (
              <div className="flex flex-col gap-2 rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">
                <button
                  type="button"
                  onClick={onEndVotingEarly}
                  disabled={isForcingStage}
                  className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  {isForcingStage ? "Calculating..." : "End Voting"}
                </button>
                <button
                  type="button"
                  onClick={onReturnToLobby}
                  disabled={isForcingStage}
                  className="rounded-2xl border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-extrabold text-purple-700 disabled:opacity-50"
                >
                  Back to Lobby
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {submissions.map((item, index) => {
          const {
            text,
            imageUrl,
            playerName: submissionPlayerName,
            imageCaption,
          } = parseSubmission(item);
          const isOwnSubmission = submissionPlayerName === playerName;
          const isSelfVoteBlocked = isOwnSubmission && !allowSelfVoting;
          const isVoteUnavailable = hasVoted || isVotingTimeExpired || isSelfVoteBlocked;

          return (
            <div
              key={index}
              onClick={() => {
                if (!isVoteUnavailable) onVote(text, submissionPlayerName);
              }}
              className={`overflow-hidden rounded-3xl border bg-white shadow-lg transition ${
                isVoteUnavailable
                  ? "cursor-not-allowed opacity-75"
                  : "cursor-pointer active:scale-[0.99] md:hover:scale-[1.02] md:hover:shadow-2xl"
              }`}
            >
              <div className="relative">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={imageCaption || "A player submission"}
                    className="aspect-square w-full bg-gray-100 object-cover"
                  />
                )}
                <div className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-extrabold text-white">
                  Choice {index + 1}
                </div>
              </div>

              <div className="p-4">
                <p className="mb-4 text-center text-lg font-black leading-snug text-gray-950 md:text-xl">
                  {imageCaption || "Untitled Masterpiece"}
                </p>

                {!isVoteUnavailable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onVote(text, submissionPlayerName);
                    }}
                    className="w-full rounded-2xl bg-black px-4 py-4 text-base font-extrabold text-white"
                  >
                    Vote for This
                  </button>
                ) : (
                  <p className="rounded-2xl bg-gray-100 px-4 py-3 text-center text-sm font-bold text-gray-500">
                    {isOwnSubmission
                      ? allowSelfVoting
                        ? "Vote locked in"
                        : "Your submission"
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
                    className="mt-3 w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-extrabold text-white"
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
