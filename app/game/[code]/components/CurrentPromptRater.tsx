import type { PromptRating } from "./types";

type CurrentPromptRaterProps = {
  prompt: string;
  currentRating: PromptRating | null;
  hasRated: boolean;
  isSaving: boolean;
  canRate: boolean;
  onRate: (rating: PromptRating) => void;
};

export function CurrentPromptRater({
  prompt,
  currentRating,
  hasRated,
  isSaving,
  canRate,
  onRate,
}: CurrentPromptRaterProps) {
  if (!canRate || !prompt) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-xl bg-black/70 p-3 text-white shadow-2xl backdrop-blur">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/60">
            Rate this round prompt
          </p>
          <p className="line-clamp-1 text-sm font-bold text-white/90">{prompt}</p>
          {currentRating && (
            <p className="text-xs font-bold text-white/50">Current rating: {currentRating}</p>
          )}
        </div>

        {hasRated ? (
          <p className="rounded-lg bg-white/15 px-4 py-2 text-center text-sm font-extrabold">
            Rating saved
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:w-64">
            <button
              type="button"
              onClick={() => onRate("good")}
              disabled={isSaving}
              className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25 disabled:opacity-50"
            >
              Good
            </button>
            <button
              type="button"
              onClick={() => onRate("ehhh")}
              disabled={isSaving}
              className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25 disabled:opacity-50"
            >
              Ehhh
            </button>
            <button
              type="button"
              onClick={() => onRate("bad")}
              disabled={isSaving}
              className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25 disabled:opacity-50"
            >
              Bad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
