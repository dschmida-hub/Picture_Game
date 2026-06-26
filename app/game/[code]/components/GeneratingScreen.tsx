import { CurrentPromptRater } from "./CurrentPromptRater";
import { parseSubmission } from "./submissions";
import type { Player, PromptRating } from "./types";

type GeneratingScreenProps = {
  players: Player[];
  submissions: string[];
  loadingMessage: string;
  currentGalleryImage?: string;
  hasCurrentRoundImage: boolean;
  isGalleryImageVisible: boolean;
  isHost: boolean;
  isForcingStage: boolean;
  waitingOnSubmissionNames: string[];
  waitingOnImageNames: string[];
  roundPrompt: string;
  currentPromptRating: PromptRating | null;
  hasRatedCurrentPrompt: boolean;
  isRatingCurrentPrompt: boolean;
  canRateCurrentPrompt: boolean;
  onForceReveal: () => void;
  onReturnToLobby: () => void;
  onRateCurrentPrompt: (rating: PromptRating) => void;
};

function AnonymousProgressCard({
  title,
  waitingCount,
  readyMessage,
  waitingMessage,
}: {
  title: string;
  waitingCount: number;
  readyMessage: string;
  waitingMessage: string;
}) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 p-4 text-center text-white">
      <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">{title}</p>
      {waitingCount > 0 ? (
        <p className="mt-2 text-lg font-black">{waitingMessage}</p>
      ) : (
        <p className="mt-2 text-sm font-bold opacity-90">{readyMessage}</p>
      )}
    </div>
  );
}

export function GeneratingScreen({
  players,
  submissions,
  loadingMessage,
  currentGalleryImage,
  hasCurrentRoundImage,
  isGalleryImageVisible,
  isHost,
  isForcingStage,
  waitingOnSubmissionNames,
  waitingOnImageNames,
  roundPrompt,
  currentPromptRating,
  hasRatedCurrentPrompt,
  isRatingCurrentPrompt,
  canRateCurrentPrompt,
  onForceReveal,
  onReturnToLobby,
  onRateCurrentPrompt,
}: GeneratingScreenProps) {
  const waitingForAnswersCount = waitingOnSubmissionNames.length;
  const waitingForImagesCount = waitingOnImageNames.length;
  const submittedCount = submissions.length;
  const readyImageCount = submissions.filter((item) => Boolean(parseSubmission(item).imageUrl)).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-purple-700 text-white">
      {!hasCurrentRoundImage && currentGalleryImage && (
        <div className="absolute inset-0 bg-purple-950">
          <img
            src={currentGalleryImage}
            alt="A past winning image"
            className="h-full w-full object-contain transition-opacity duration-500"
            style={{ opacity: isGalleryImageVisible ? 1 : 0 }}
          />
          <div className="absolute inset-0 bg-purple-950/70" />
        </div>
      )}

      <div className="relative z-50 flex min-h-full w-full flex-col items-center justify-center gap-5 p-6 pb-28 pt-10">
        <div className="animate-bounce text-6xl">🎨</div>
        <h2 className="text-3xl font-extrabold">Generating Images...</h2>
        <p className="max-w-md text-center text-lg">
          {loadingMessage || "Adding maximum chaos..."}
        </p>
        <p className="text-sm font-bold opacity-80">
          {submittedCount} / {players.length} answers submitted · {readyImageCount} images ready
        </p>

        {waitingForAnswersCount > 0 ? (
          <AnonymousProgressCard
            title="Waiting for answers"
            waitingCount={waitingForAnswersCount}
            readyMessage="Everyone answered!"
            waitingMessage={`${waitingForAnswersCount} answer${
              waitingForAnswersCount === 1 ? "" : "s"
            } still missing`}
          />
        ) : (
          <AnonymousProgressCard
            title="Still generating"
            waitingCount={waitingForImagesCount}
            readyMessage="All images are ready!"
            waitingMessage={`${waitingForImagesCount} image${
              waitingForImagesCount === 1 ? "" : "s"
            } still cooking`}
          />
        )}

        {(hasCurrentRoundImage || !currentGalleryImage) && (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            {players.map((player, index) => {
              const playerSubmission = submissions.find((item) => {
                return parseSubmission(item).playerName === player.name;
              });
              const { text, imageUrl } = playerSubmission
                ? parseSubmission(playerSubmission)
                : { text: "", imageUrl: "" };

              return (
                <div
                  key={player.name}
                  className="rounded-2xl border border-white/20 bg-purple-900/60 p-3 text-center"
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={text}
                        className="mb-2 aspect-square w-full rounded-xl object-cover"
                      />
                      <p className="truncate text-sm font-bold">Image {index + 1} ready ✅</p>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-purple-800">
                        <div className="animate-pulse text-4xl">⏳</div>
                        <p className="mt-2 text-xs opacity-80">Generating...</p>
                      </div>
                      <p className="text-sm font-bold">Image {index + 1} pending</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isHost && (
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            {submissions.length > 0 && (
              <button
                type="button"
                onClick={onForceReveal}
                disabled={isForcingStage}
                className="rounded-2xl bg-white px-6 py-3 font-extrabold text-purple-700 disabled:opacity-50"
              >
                {isForcingStage ? "Opening Reveal..." : "Skip Pending + Reveal"}
              </button>
            )}
            <button
              type="button"
              onClick={onReturnToLobby}
              disabled={isForcingStage}
              className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 font-extrabold text-white disabled:opacity-50"
            >
              Back to Lobby
            </button>
          </div>
        )}
      </div>

      <CurrentPromptRater
        prompt={roundPrompt}
        currentRating={currentPromptRating}
        hasRated={hasRatedCurrentPrompt}
        isSaving={isRatingCurrentPrompt}
        canRate={canRateCurrentPrompt}
        onRate={onRateCurrentPrompt}
      />
    </div>
  );
}
