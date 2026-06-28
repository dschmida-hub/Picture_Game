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
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border-2 border-black bg-white/95 p-3 text-zinc-950 shadow-[6px_6px_0_#111827] backdrop-blur">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">
            Rate this round prompt
          </p>
          <p className="line-clamp-1 text-sm font-black text-zinc-950">{prompt}</p>
          {currentRating && (
            <p className="text-xs font-bold text-zinc-500">Current rating: {currentRating}</p>
          )}
        </div>

        {hasRated ? (
          <p className="rounded-lg bg-emerald-100 px-4 py-2 text-center text-sm font-black text-emerald-800">
            Rating saved
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:w-64">
            <button
              type="button"
              onClick={() => onRate("good")}
              disabled={isSaving}
              className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-black text-rose-800 hover:bg-rose-200 disabled:opacity-50"
            >
              Good
            </button>
            <button
              type="button"
              onClick={() => onRate("ehhh")}
              disabled={isSaving}
              className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-black text-zinc-800 hover:bg-zinc-200 disabled:opacity-50"
            >
              Ehhh
            </button>
            <button
              type="button"
              onClick={() => onRate("bad")}
              disabled={isSaving}
              className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-black text-amber-800 hover:bg-amber-200 disabled:opacity-50"
            >
              Bad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
