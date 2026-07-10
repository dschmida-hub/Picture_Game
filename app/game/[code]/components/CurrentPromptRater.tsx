import type { PromptRating } from "./types";

type CurrentPromptRaterProps = {
  prompt: string;
  currentRating: PromptRating | null;
  hasRated: boolean;
  isSaving: boolean;
  canRate: boolean;
  onRate: (rating: PromptRating) => void;
};

const ratingOptions: Array<{
  rating: PromptRating;
  label: string;
  hint: string;
  className: string;
}> = [
  {
    rating: "good",
    label: "Good",
    hint: "Keep this in rotation",
    className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  },
  {
    rating: "ehhh",
    label: "Ehhh",
    hint: "Playable, but not special",
    className: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
  },
  {
    rating: "bad",
    label: "Bad",
    hint: "Avoid this prompt",
    className: "bg-rose-100 text-rose-900 hover:bg-rose-200",
  },
];

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
    <div className="w-full rounded-2xl border-2 border-black bg-white/95 p-3 text-zinc-950 shadow-[6px_6px_0_#111827] backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">
            Prompt quality control
          </p>
          <p className="line-clamp-1 text-sm font-black text-zinc-950">{prompt}</p>
          {currentRating && (
            <p className="text-xs font-bold text-zinc-500">
              Current rating: {currentRating}. Ratings help decide what stays in future rounds.
            </p>
          )}
        </div>

        {hasRated ? (
          <p className="rounded-lg bg-emerald-100 px-4 py-2 text-center text-sm font-black text-emerald-800">
            Rating saved
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:w-[28rem]">
            {ratingOptions.map((option) => (
              <button
                key={option.rating}
                type="button"
                onClick={() => onRate(option.rating)}
                disabled={isSaving}
                title={option.hint}
                className={`rounded-xl px-3 py-2 text-left text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${option.className}`}
              >
                <span className="block text-sm">{option.label}</span>
                <span className="mt-0.5 block font-bold opacity-70">{option.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
