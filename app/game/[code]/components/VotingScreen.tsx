import { HelpTooltip } from "./HelpTooltip";
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
  onShareImage: (imageUrl: string, imageCaption: string) => void;
  onDeleteSubmission: (submissionId: number, submissionPlayerName: string) => void;
  onRateImage: (submissionId: number, rating: "funny" | "meh" | "bad") => void;
  onReportImage: (submissionId: number) => void;
  onRegenerateImage: (submissionId: number, submissionPlayerName: string) => void;
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
  onShareImage,
  onDeleteSubmission,
  onRateImage,
  onReportImage,
  onRegenerateImage,
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
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 shadow-[4px_4px_0_#111827] md:text-base">
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
              <div className="flex flex-col gap-2 rounded-3xl border-2 border-black bg-white p-3 shadow-[5px_5px_0_#111827]">
                <button
                  type="button"
                  onClick={onEndVotingEarly}
                  disabled={isForcingStage}
                  title="Close voting now and calculate the round winner."
                  className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {isForcingStage ? "Calculating..." : "End Voting"}
                </button>
                <button
                  type="button"
                  onClick={onReturnToLobby}
                  disabled={isForcingStage}
                  title="Return everyone to the lobby."
                  className="rounded-2xl border-2 border-black bg-white px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
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
            id,
            text,
            imageUrl,
            thumbnailUrl,
            playerName: submissionPlayerName,
            imageCaption,
          } = parseSubmission(item);
          const isOwnSubmission = submissionPlayerName === playerName;
          const isSelfVoteBlocked = isOwnSubmission && !allowSelfVoting;
          const isVoteUnavailable = hasVoted || isVotingTimeExpired || isSelfVoteBlocked;
          const displayImageUrl = thumbnailUrl || imageUrl;

          return (
            <div
              key={index}
              onClick={() => {
                if (!isVoteUnavailable) onVote(text, submissionPlayerName);
              }}
              className={`overflow-hidden rounded-[1.7rem] border-2 border-black bg-white shadow-[6px_6px_0_#111827] transition ${
                isVoteUnavailable
                  ? "cursor-not-allowed opacity-75"
                  : "cursor-pointer active:scale-[0.99] md:hover:-translate-y-0.5"
              }`}
            >
              <div className="relative">
                {displayImageUrl && (
                  <img
                    src={displayImageUrl}
                    alt={imageCaption || "A player submission"}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full bg-gray-100 object-cover"
                  />
                )}
                <div className="absolute left-3 top-3 rounded-full border border-white/30 bg-zinc-950/85 px-3 py-1 text-xs font-black text-white">
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
                    title="Vote for this image as the funniest of the round."
                    className="w-full rounded-2xl bg-rose-600 px-4 py-4 text-base font-black text-white shadow-[4px_4px_0_#111827]"
                  >
                    Vote for This
                  </button>
                ) : (
                  <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-center text-sm font-bold text-zinc-500">
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
                  <div className={`mt-3 grid grid-cols-1 gap-2 ${id ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onShareImage(imageUrl, imageCaption || "Untitled Masterpiece");
                      }}
                      title="Open your device share sheet for this image."
                      className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
                    >
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSaveImage(imageUrl, imageCaption || "Untitled Masterpiece");
                      }}
                      title="Download this image to your device."
                      className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Save
                    </button>
                    {id && (
                      <button
                        type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onReportImage(id);
                          }}
                          title="Flag this image so the host/admin can review it later."
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800"
                      >
                        Report
                      </button>
                    )}
                  </div>
                )}

                {id && (
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs font-black uppercase tracking-wider text-zinc-500">
                      Rate this image
                      <HelpTooltip text="This feedback helps you track which images are funny, meh, or bad for future tuning." />
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["funny", "Funny"],
                        ["meh", "Meh"],
                        ["bad", "Bad"],
                      ].map(([rating, label]) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRateImage(id, rating as "funny" | "meh" | "bad");
                          }}
                          title={`Rate this image as ${label}.`}
                          className="rounded-xl border border-zinc-200 bg-white px-2 py-2 text-xs font-black text-zinc-800 hover:bg-rose-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isHost && id && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRegenerateImage(id, submissionPlayerName);
                      }}
                      disabled={isForcingStage}
                      title="Ask the image model to remake this player's image."
                      className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSubmission(id, submissionPlayerName);
                      }}
                      disabled={isForcingStage}
                      title="Remove this submission from the round."
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
