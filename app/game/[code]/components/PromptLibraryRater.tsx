import { getPromptRatingClasses, getPromptRatingLabel } from "./promptQuality";
import type { PromptLibraryItem, PromptRating } from "./types";

type PromptLibraryRaterProps = {
  prompt: PromptLibraryItem | null;
  isSaving: boolean;
  onRate: (rating: PromptRating) => void;
  onSkip: () => void;
};

export function PromptLibraryRater({
  prompt,
  isSaving,
  onRate,
  onSkip,
}: PromptLibraryRaterProps) {
  if (!prompt) return null;

  return (
    <div className="w-full max-w-4xl rounded-2xl border border-white/20 bg-white/95 p-3 text-black shadow-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
              Quick prompt rating
            </p>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-extrabold text-purple-700">
              {prompt.game_mode === "cards" ? "Fill Blank" : "Classic"}
            </span>
            {prompt.prompt_rating && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${getPromptRatingClasses(
                  prompt.prompt_rating
                )}`}
              >
                {getPromptRatingLabel(prompt.prompt_rating)}
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug md:text-base">
            {prompt.prompt}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-2 md:w-[340px]">
        <button
          type="button"
          onClick={() => onRate("good")}
          disabled={isSaving}
          className="rounded-xl bg-green-600 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => onRate("ehhh")}
          disabled={isSaving}
          className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-extrabold text-yellow-950 disabled:opacity-50"
        >
          Ehhh
        </button>
        <button
          type="button"
          onClick={() => onRate("bad")}
          disabled={isSaving}
          className="rounded-xl bg-red-600 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"
        >
          Bad
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={isSaving}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-extrabold text-gray-600 disabled:opacity-50"
        >
          Skip
        </button>
        </div>
      </div>
    </div>
  );
}
