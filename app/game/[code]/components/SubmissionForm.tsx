import type { GameMode } from "./types";

type SubmissionFormProps = {
  gameMode: GameMode;
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

  return (
    <>
      <div
        className={`w-full max-w-xl rounded-3xl p-5 shadow-lg ${
          isCards ? "border-4 border-black bg-white" : "border border-gray-200 bg-white"
        }`}
      >
        <label className="mb-2 block text-sm font-bold text-purple-600">
          {isCards ? "Complete the prompt" : "Your Answer"}
        </label>
        <textarea
          value={submission}
          onChange={(event) => onSubmissionChange(event.target.value)}
          placeholder={isCards ? "Write the funniest possible fill-in..." : "Make your friends laugh..."}
          maxLength={120}
          disabled={isSubmissionTimeExpired}
          className="min-h-40 w-full resize-none rounded-2xl border-2 border-purple-300 p-4 text-lg focus:border-purple-500 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {isSubmissionTimeExpired
              ? "Time is up for this round."
              : isCards
                ? "Short, specific, and delightfully wrong."
                : "Think punchline, not paragraph."}
          </p>
          <p className="text-sm text-gray-500">{submission.length}/120</p>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isSubmitting || isSubmissionTimeExpired || !submission.trim()}
        className="rounded-2xl bg-blue-600 px-8 py-3 font-bold text-white shadow-lg disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : isCards ? "Lock In Fill" : "Lock In Answer"}
      </button>

      <div className="w-full max-w-xl rounded-2xl border border-purple-200 bg-purple-50 p-4 text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
          Waiting on
        </p>
        {waitingOnPlayerNames.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {waitingOnPlayerNames.map((playerName) => (
              <span key={playerName} className="rounded-full bg-white px-3 py-1 text-sm font-bold text-purple-700">
                {playerName}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-bold text-green-700">Everyone submitted!</p>
        )}
      </div>

      {isHost && submissionsCount > 0 && (
        <button
          type="button"
          onClick={onForceReveal}
          disabled={isForcingStage}
          className="font-bold text-purple-700 underline disabled:opacity-50"
        >
          {isForcingStage ? "Opening Reveal..." : "Reveal Submitted Images"}
        </button>
      )}

      {isHost && isSubmissionTimeExpired && submissionsCount === 0 && (
        <button
          type="button"
          onClick={onSkipRound}
          disabled={isAdvancing}
          className="font-bold text-purple-700 underline disabled:opacity-50"
        >
          {isAdvancing ? "Skipping..." : "Skip Empty Round"}
        </button>
      )}

      {isHost && (
        <button
          type="button"
          onClick={onReturnToLobby}
          disabled={isForcingStage}
          className="text-sm font-bold text-gray-500 underline disabled:opacity-50"
        >
          Back to Lobby
        </button>
      )}
    </>
  );
}
