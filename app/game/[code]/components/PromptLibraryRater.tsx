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
    <div className="w-full max-w-4xl rounded-xl bg-purple-950/50 p-3 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-white/70">
              Rate a prompt while you wait
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-extrabold text-white/80">
              {prompt.game_mode === "cards" ? "Fill Blank" : "Classic"}
            </span>
            {prompt.prompt_rating && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-extrabold text-white/70">
                Current: {prompt.prompt_rating}
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white/90">
            {prompt.prompt}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-4 gap-2 md:w-[340px]">
        <button
          type="button"
          onClick={() => onRate("good")}
          disabled={isSaving}
          className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-50"
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => onRate("ehhh")}
          disabled={isSaving}
          className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-50"
        >
          Ehhh
        </button>
        <button
          type="button"
          onClick={() => onRate("bad")}
          disabled={isSaving}
          className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-50"
        >
          Bad
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={isSaving}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/20 disabled:opacity-50"
        >
          Skip
        </button>
        </div>
      </div>
    </div>
  );
}
