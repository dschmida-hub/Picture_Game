import {
  getPromptRatingClasses,
  getPromptRatingHint,
  getPromptRatingLabel,
} from "./promptQuality";
import { HelpTooltip } from "./HelpTooltip";
import type { GameMode, PromptSuggestion } from "./types";

type PromptSuggestionPanelProps = {
  playerName: string;
  suggestions: PromptSuggestion[];
  suggestionText: string;
  suggestionMode: GameMode;
  hasSelectedGameMode: boolean;
  suggestionRating: PromptSuggestion["rating"];
  approvalVotesNeeded: number;
  isSubmittingSuggestion: boolean;
  onSuggestionTextChange: (value: string) => void;
  onSubmitSuggestion: () => void;
  onVoteSuggestion: (suggestionId: number) => void;
};

export function PromptSuggestionPanel({
  playerName,
  suggestions,
  suggestionText,
  suggestionMode,
  hasSelectedGameMode,
  suggestionRating,
  approvalVotesNeeded,
  isSubmittingSuggestion,
  onSuggestionTextChange,
  onSubmitSuggestion,
  onVoteSuggestion,
}: PromptSuggestionPanelProps) {
  const suggestionModeLabel = suggestionMode === "cards" ? "Fill in Blank" : "Classic";
  const isPromptPitchingDisabled = !hasSelectedGameMode;

  return (
    <div className="w-full max-w-5xl rounded-[2rem] border-2 border-black bg-white p-5 shadow-[8px_8px_0_#111827]">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-700">
              Player-made prompts
            </p>
            <HelpTooltip text="Players can pitch prompts in the lobby. If enough people vote one in, it can enter the room's prompt pool." />
          </div>
          <h3 className="text-2xl font-black">Pitch a prompt</h3>
          <p className="mt-1 text-sm text-gray-500">
            Prompts with {approvalVotesNeeded} vote{approvalVotesNeeded === 1 ? "" : "s"} can show up in this room.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
        <textarea
          value={suggestionText}
          onChange={(event) => onSuggestionTextChange(event.target.value)}
          placeholder={
            !hasSelectedGameMode
              ? "Choose a game mode first..."
              : suggestionMode === "cards"
              ? "Example: The real treasure was _____ all along."
              : "Example: The worst thing to hear from your dentist is..."
          }
          maxLength={160}
          disabled={isPromptPitchingDisabled}
          className="min-h-24 resize-none rounded-2xl border-2 border-black p-3 font-bold outline-none focus:border-rose-600 focus:shadow-[0_0_0_4px_rgba(225,29,72,0.16)] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
        />

        <div className="rounded-2xl border-2 border-black bg-rose-50 p-3">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-rose-700">
            Locked to
          </p>
          <p className="mt-1 font-black text-zinc-950">
            {hasSelectedGameMode ? suggestionModeLabel : "Choose mode first"}
          </p>
          <p className="mt-1 text-xs font-bold text-zinc-500">
            {hasSelectedGameMode ? "Follows the room mode." : "Classic or Fill in the Blank."}
          </p>
        </div>

        <button
          type="button"
          onClick={onSubmitSuggestion}
          disabled={isSubmittingSuggestion || isPromptPitchingDisabled || !suggestionText.trim() || !playerName}
          className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white shadow-[4px_4px_0_#111827] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmittingSuggestion ? "Submitting..." : "Submit"}
        </button>
      </div>

      <p className="mt-2 text-right text-xs font-bold text-gray-400">
        {suggestionText.length}/160
      </p>

      {!hasSelectedGameMode && (
        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-black text-amber-900">
          The host needs to choose Classic or Fill in the Blank before players can pitch prompts.
        </p>
      )}

      {hasSelectedGameMode && suggestionText.trim() && (
        <div className="mt-2 flex flex-col gap-1 rounded-2xl border border-rose-200 bg-rose-50 p-3 md:flex-row md:items-center md:justify-between">
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-extrabold ${getPromptRatingClasses(
              suggestionRating
            )}`}
          >
            {getPromptRatingLabel(suggestionRating)}
          </span>
          <p className="text-sm font-bold text-gray-600">
            {getPromptRatingHint(suggestionRating, suggestionMode)}
          </p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {suggestions.map((suggestion) => {
            const isApproved = suggestion.vote_count >= approvalVotesNeeded;

            return (
              <div
                key={suggestion.id}
                className={`rounded-2xl border p-4 ${
                  isApproved ? "border-emerald-300 bg-emerald-50" : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold text-zinc-800">
                      {suggestion.game_mode === "cards" ? "Fill in Blank" : "Classic"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-extrabold ${getPromptRatingClasses(
                        suggestion.rating
                      )}`}
                    >
                      {getPromptRatingLabel(suggestion.rating)}
                    </span>
                  </div>
                  <span className={`text-xs font-extrabold ${isApproved ? "text-emerald-700" : "text-rose-700"}`}>
                    {isApproved ? "Approved" : `${suggestion.vote_count}/${approvalVotesNeeded} votes`}
                  </span>
                </div>

                <p className="font-bold leading-relaxed">{suggestion.prompt}</p>
                <p className="mt-2 text-xs text-gray-500">Suggested by {suggestion.submitted_by}</p>

                <button
                  type="button"
                  onClick={() => onVoteSuggestion(suggestion.id)}
                  disabled={suggestion.has_voted}
                  className="mt-3 w-full rounded-xl bg-zinc-950 px-4 py-2 font-black text-white disabled:bg-gray-300"
                >
                  {suggestion.has_voted ? "Voted" : "Vote this in"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
