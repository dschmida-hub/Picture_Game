import {
  getPromptRatingClasses,
  getPromptRatingHint,
  getPromptRatingLabel,
} from "./promptQuality";
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
    <div className="w-full max-w-3xl rounded-3xl border border-white/20 bg-white p-5 text-black shadow-2xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600">
            Help rate the prompt library
          </p>
          <h3 className="mt-1 text-2xl font-black">Would this prompt play well?</h3>
        </div>

        <span className="w-fit rounded-full bg-purple-100 px-3 py-1 text-xs font-extrabold text-purple-700">
          {prompt.game_mode === "cards" ? "Fill in Blank" : "Classic"}
        </span>
      </div>

      <p className="mt-4 rounded-2xl bg-purple-50 p-4 text-lg font-bold leading-relaxed">
        {prompt.prompt}
      </p>

      {prompt.prompt_rating && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center md:justify-between">
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-extrabold ${getPromptRatingClasses(
              prompt.prompt_rating
            )}`}
          >
            Currently: {getPromptRatingLabel(prompt.prompt_rating)}
          </span>
          <p className="text-sm font-bold text-gray-600">
            {getPromptRatingHint(prompt.prompt_rating, prompt.game_mode)}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={() => onRate("good")}
          disabled={isSaving}
          className="rounded-2xl bg-green-600 px-4 py-3 font-extrabold text-white disabled:opacity-50"
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => onRate("ehhh")}
          disabled={isSaving}
          className="rounded-2xl bg-yellow-400 px-4 py-3 font-extrabold text-yellow-950 disabled:opacity-50"
        >
          Ehhh
        </button>
        <button
          type="button"
          onClick={() => onRate("bad")}
          disabled={isSaving}
          className="rounded-2xl bg-red-600 px-4 py-3 font-extrabold text-white disabled:opacity-50"
        >
          Bad
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={isSaving}
          className="rounded-2xl border border-gray-300 px-4 py-3 font-extrabold text-gray-600 disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
