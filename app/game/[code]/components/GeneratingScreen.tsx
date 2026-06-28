import type { ReactNode } from "react";
import { CurrentPromptRater } from "./CurrentPromptRater";
import { HelpTooltip } from "./HelpTooltip";
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
  hostDebugPanel?: ReactNode;
  isRatingCurrentPrompt: boolean;
  canRateCurrentPrompt: boolean;
  onForceReveal: () => void;
  onReturnToLobby: () => void;
  onRateCurrentPrompt: (rating: PromptRating) => void;
};

function SparkIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-9 w-9">
      <path
        fill="currentColor"
        d="M24 3l4.9 13.1L42 21l-13.1 4.9L24 39l-4.9-13.1L6 21l13.1-4.9L24 3Z"
      />
      <path fill="currentColor" d="M39 31l1.9 5.1L46 38l-5.1 1.9L39 45l-1.9-5.1L32 38l5.1-1.9L39 31Z" opacity=".7" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="h-10 w-10 animate-spin text-rose-600">
      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="5" opacity=".2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="5"
        d="M36 20A16 16 0 0 0 20 4"
      />
    </svg>
  );
}

function ImageSkeleton({ imageNumber }: { imageNumber: number }) {
  return (
    <>
      <div className="relative flex aspect-square w-full overflow-hidden rounded-[1.15rem] border border-dashed border-rose-300 bg-rose-50">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-rose-100 via-white to-sky-100" />
        <div className="absolute inset-x-6 top-8 h-5 rounded-full bg-white/80" />
        <div className="absolute left-6 top-20 h-24 w-24 rounded-3xl bg-white/70" />
        <div className="absolute bottom-8 right-6 h-28 w-32 rounded-3xl bg-white/70" />
        <div className="relative z-10 m-auto flex flex-col items-center rounded-2xl border-2 border-black bg-white/90 px-5 py-4 shadow-[4px_4px_0_#111827]">
          <SpinnerIcon />
          <p className="mt-3 text-sm font-black text-zinc-800">Generating</p>
          <p className="mt-1 text-xs font-bold text-zinc-500">Image {imageNumber}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-200" />
        <div className="h-7 w-20 animate-pulse rounded-full bg-rose-100" />
      </div>
    </>
  );
}

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
    <div className="rounded-3xl border-2 border-black bg-white p-4 text-center shadow-[6px_6px_0_#111827]">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">{title}</p>
      {waitingCount > 0 ? (
        <p className="mt-2 text-xl font-black text-zinc-950">{waitingMessage}</p>
      ) : (
        <p className="mt-2 text-sm font-extrabold text-emerald-700">{readyMessage}</p>
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
  hostDebugPanel,
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
  const allAnswersSubmitted = players.length > 0 && submittedCount >= players.length && waitingForAnswersCount === 0;
  const allImagesReady = allAnswersSubmitted && readyImageCount >= players.length && waitingForImagesCount === 0;
  const shouldShowPastImage = !hasCurrentRoundImage && currentGalleryImage;
  const progressPercent = players.length ? Math.round((readyImageCount / players.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#fff7ed] text-zinc-950">
      {shouldShowPastImage && (
        <div className="pointer-events-none fixed inset-0">
          <img
            src={currentGalleryImage}
            alt="A past winning image"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: isGalleryImageVisible ? 1 : 0 }}
          />
          <div className="absolute inset-0 bg-[#fff7ed]/88 backdrop-blur-sm" />
        </div>
      )}

      <div className="pointer-events-none fixed -left-20 top-16 h-52 w-52 rounded-full bg-rose-300/35 blur-3xl" />
      <div className="pointer-events-none fixed -right-20 bottom-24 h-64 w-64 rounded-full bg-sky-300/40 blur-3xl" />

      <div className="relative z-50 mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 pb-36 pt-5 sm:px-6 lg:px-8">
        {isHost && hostDebugPanel && <div className="w-full">{hostDebugPanel}</div>}

        <section className="rounded-[2rem] border-2 border-black bg-white p-5 shadow-[8px_8px_0_#111827] sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-black bg-rose-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-rose-800">
                <span className="text-rose-600">
                  <SparkIcon />
                </span>
                Studio is cooking
              </div>

              <h2 className="text-4xl font-black leading-none tracking-tight text-zinc-950 sm:text-5xl">
                {allImagesReady ? "Images ready." : "Making the chaos."}
              </h2>

              <p className="mt-3 max-w-2xl text-base font-bold text-zinc-600 sm:text-lg">
                {loadingMessage || "Adding maximum chaos..."}
              </p>
            </div>

            <div className="rounded-3xl border-2 border-black bg-zinc-950 p-4 text-white shadow-[5px_5px_0_#fb7185] md:min-w-56">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-200">Round progress</p>
                <HelpTooltip text="Progress is based on how many players have finished generating an image for this round." />
              </div>
              <p className="mt-2 text-3xl font-black">{progressPercent}%</p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-bold text-white/80">
                {submittedCount}/{players.length} answers · {readyImageCount} images
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
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
              title={allImagesReady ? "Ready to reveal" : "Still generating"}
              waitingCount={waitingForImagesCount}
              readyMessage={
                allImagesReady
                  ? "All images are ready. Host can reveal the round."
                  : "All images are ready!"
              }
              waitingMessage={`${waitingForImagesCount} image${
                waitingForImagesCount === 1 ? "" : "s"
              } still cooking`}
            />
          )}

          <div className="rounded-3xl border-2 border-black bg-sky-100 p-4 shadow-[6px_6px_0_#111827]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-800">Current prompt</p>
            <p className="mt-2 line-clamp-2 text-lg font-black leading-tight text-zinc-950">{roundPrompt}</p>
          </div>
        </div>

        {(hasCurrentRoundImage || !currentGalleryImage) && (
          <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player, index) => {
              const playerSubmission = submissions.find((item) => {
                return parseSubmission(item).playerName === player.name;
              });
              const { text, imageUrl, thumbnailUrl } = playerSubmission
                ? parseSubmission(playerSubmission)
                : { text: "", imageUrl: "", thumbnailUrl: "" };
              const displayImageUrl = thumbnailUrl || imageUrl;

              return (
                <div
                  key={player.name}
                  className="overflow-hidden rounded-[1.7rem] border-2 border-black bg-white p-3 shadow-[6px_6px_0_#111827]"
                >
                  {displayImageUrl ? (
                    <>
                      <img
                        src={displayImageUrl}
                        alt={text || `Generated image ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full rounded-[1.15rem] border border-zinc-200 object-cover"
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-zinc-950">Image {index + 1}</p>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                          Ready
                        </span>
                      </div>
                    </>
                  ) : (
                    <ImageSkeleton imageNumber={index + 1} />
                  )}
                </div>
              );
            })}
          </section>
        )}

        {isHost && (
          <div className="sticky bottom-5 z-[55] mx-auto flex w-full max-w-xl flex-col gap-3 rounded-3xl border-2 border-black bg-white/95 p-3 shadow-[6px_6px_0_#111827] backdrop-blur sm:flex-row">
            {submissions.length > 0 && (
              <button
                type="button"
                onClick={onForceReveal}
                disabled={isForcingStage}
                title={allImagesReady ? "Reveal all finished images for voting." : "Reveal the images that are ready and skip pending players."}
                className="min-h-12 flex-1 rounded-2xl bg-rose-600 px-5 py-3 font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isForcingStage
                  ? "Opening Reveal..."
                  : allImagesReady
                    ? "Reveal Images"
                    : "Skip Pending + Reveal"}
              </button>
            )}
            <button
              type="button"
              onClick={onReturnToLobby}
              disabled={isForcingStage}
              title="Return everyone to the lobby so the host can change settings or restart."
              className="min-h-12 flex-1 rounded-2xl border-2 border-black bg-white px-5 py-3 font-black text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
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
