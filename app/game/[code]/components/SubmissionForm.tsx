import { HelpTooltip } from "./HelpTooltip";
import { WaitingOnList } from "./WaitingOnList";
import type { ContentRating, GameMode } from "./types";

type SubmissionFormProps = {
  gameMode: GameMode;
  contentRating: ContentRating;
  submission: string;
  isSubmitting: boolean;
  isSubmissionTimeExpired: boolean;
  isHost: boolean;
  submissionsCount: number;
  waitingOnPlayerNames: string[];
  isForcingStage: boolean;
  isAdvancing: boolean;
  onSubmissionChange: (value: string) => void;
  onSubmit: () => void;
  onForceReveal: () => void;
  onSkipRound: () => void;
  onReturnToLobby: () => void;
};

export function SubmissionForm({
  gameMode,
  contentRating,
  submission,
  isSubmitting,
  isSubmissionTimeExpired,
  isHost,
  submissionsCount,
  waitingOnPlayerNames,
  isForcingStage,
  isAdvancing,
  onSubmissionChange,
  onSubmit,
  onForceReveal,
  onSkipRound,
  onReturnToLobby,
}: SubmissionFormProps) {
  const isCards = gameMode === "cards";
  const ratingHint =
    contentRating === "pg13"
      ? "PG-13 is on: roasts and bathroom-level chaos are fair game, but keep it non-explicit."
      : "Everyone mode is on: keep it clean enough for the whole table.";

  return (
    <>
      <div
        className={`w-full max-w-xl rounded-[2rem] border-2 border-black bg-white p-5 shadow-[8px_8px_0_#111827] ${
          isCards ? "rotate-[-0.5deg]" : ""
        }`}
      >
        <label className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-rose-700">
          {isCards ? "Complete the prompt" : "Your Answer"}
          <HelpTooltip
            text={
              isCards
                ? "Write only the fill-in-the-blank part. Keep it short so the image idea stays clear."
                : `Write a short image idea or punchline. Mention yourself (I/me/my) or a player's name to put their avatar in the picture. ${ratingHint}`
            }
          />
        </label>
        <textarea
          value={submission}
          onChange={(event) => onSubmissionChange(event.target.value)}
          placeholder={isCards ? "Write the funniest possible fill-in..." : "Make your friends laugh..."}
          maxLength={120}
          disabled={isSubmissionTimeExpired}
          className="min-h-40 w-full resize-none rounded-2xl border-2 border-black p-4 text-lg font-bold outline-none transition focus:border-rose-600 focus:shadow-[0_0_0_4px_rgba(225,29,72,0.16)] disabled:bg-zinc-100"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-500">
            {isSubmissionTimeExpired
              ? "Time is up for this round."
              : isCards
                ? `Short, specific, and delightfully wrong. ${ratingHint}`
                : `Think punchline, not paragraph. ${ratingHint}`}
          </p>
          <p className="text-sm font-black text-zinc-500">{submission.length}/120</p>
        </div>
        <p className="mt-2 text-xs font-bold text-zinc-400">
          Tip: say &quot;I&quot;/&quot;me&quot; or a player&apos;s name to put their avatar in the picture.
        </p>
      </div>

      <button
        onClick={onSubmit}
        disabled={isSubmitting || isSubmissionTimeExpired || !submission.trim()}
        className="rounded-2xl bg-rose-600 px-8 py-4 font-black text-white shadow-[5px_5px_0_#111827] transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : isCards ? "Lock In Fill" : "Lock In Answer"}
      </button>

      <WaitingOnList
        title="Waiting on"
        names={waitingOnPlayerNames}
        emptyMessage="Everyone submitted!"
      />

      {isHost && submissionsCount > 0 && (
        <button
          type="button"
          onClick={onForceReveal}
          disabled={isForcingStage}
          className="font-black text-rose-700 underline disabled:opacity-50"
        >
          {isForcingStage ? "Opening Reveal..." : "Reveal Submitted Images"}
        </button>
      )}

      {isHost && isSubmissionTimeExpired && submissionsCount === 0 && (
        <button
          type="button"
          onClick={onSkipRound}
          disabled={isAdvancing}
          className="font-black text-rose-700 underline disabled:opacity-50"
        >
          {isAdvancing ? "Skipping..." : "Skip Empty Round"}
        </button>
      )}

      {isHost && (
        <button
          type="button"
          onClick={onReturnToLobby}
          disabled={isForcingStage}
          className="text-sm font-black text-zinc-500 underline disabled:opacity-50"
        >
          Back to Lobby
        </button>
      )}
    </>
  );
}
