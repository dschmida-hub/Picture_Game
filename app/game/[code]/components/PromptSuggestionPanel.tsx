import type { GameMode, PromptSuggestion } from "./types";

type PromptSuggestionPanelProps = {
  playerName: string;
  suggestions: PromptSuggestion[];
  suggestionText: string;
  suggestionMode: GameMode;
  approvalVotesNeeded: number;
  isSubmittingSuggestion: boolean;
  onSuggestionTextChange: (value: string) => void;
  onSuggestionModeChange: (mode: GameMode) => void;
  onSubmitSuggestion: () => void;
  onVoteSuggestion: (suggestionId: number) => void;
};

export function PromptSuggestionPanel({
  playerName,
  suggestions,
  suggestionText,
  suggestionMode,
  approvalVotesNeeded,
  isSubmittingSuggestion,
  onSuggestionTextChange,
  onSuggestionModeChange,
  onSubmitSuggestion,
  onVoteSuggestion,
}: PromptSuggestionPanelProps) {
  return (
    <div className="w-full max-w-5xl rounded-3xl border border-purple-200 bg-white p-5 shadow-lg">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-purple-600">
            Player-made prompts
          </p>
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
          placeholder="Example: The worst thing to hear from your dentist is..."
          maxLength={160}
          className="min-h-24 resize-none rounded-2xl border-2 border-purple-200 p-3 focus:border-purple-600 focus:outline-none"
        />

        <select
          value={suggestionMode}
          onChange={(event) => onSuggestionModeChange(event.target.value as GameMode)}
          className="rounded-2xl border-2 border-purple-200 p-3 font-bold"
        >
          <option value="classic">Classic</option>
          <option value="cards">Fill in Blank</option>
        </select>

        <button
          type="button"
          onClick={onSubmitSuggestion}
          disabled={isSubmittingSuggestion || !suggestionText.trim() || !playerName}
          className="rounded-2xl bg-purple-600 px-5 py-3 font-extrabold text-white disabled:opacity-50"
        >
          {isSubmittingSuggestion ? "Submitting..." : "Submit"}
        </button>
      </div>

      <p className="mt-2 text-right text-xs font-bold text-gray-400">
        {suggestionText.length}/160
      </p>

      {suggestions.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {suggestions.map((suggestion) => {
            const isApproved = suggestion.vote_count >= approvalVotesNeeded;

            return (
              <div
                key={suggestion.id}
                className={`rounded-2xl border p-4 ${
                  isApproved ? "border-green-300 bg-green-50" : "border-purple-100 bg-purple-50"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-purple-700">
                    {suggestion.game_mode === "cards" ? "Fill in Blank" : "Classic"}
                  </span>
                  <span className={`text-xs font-extrabold ${isApproved ? "text-green-700" : "text-purple-700"}`}>
                    {isApproved ? "Approved" : `${suggestion.vote_count}/${approvalVotesNeeded} votes`}
                  </span>
                </div>

                <p className="font-bold leading-relaxed">{suggestion.prompt}</p>
                <p className="mt-2 text-xs text-gray-500">Suggested by {suggestion.submitted_by}</p>

                <button
                  type="button"
                  onClick={() => onVoteSuggestion(suggestion.id)}
                  disabled={suggestion.has_voted}
                  className="mt-3 w-full rounded-xl bg-black px-4 py-2 font-bold text-white disabled:bg-gray-300"
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
