import { parseSubmission } from "./submissions";
import type { Player } from "./types";

type GeneratingScreenProps = {
  players: Player[];
  submissions: string[];
  loadingMessage: string;
  currentGalleryImage?: string;
  hasCurrentRoundImage: boolean;
  isGalleryImageVisible: boolean;
  isHost: boolean;
  isForcingStage: boolean;
  onForceReveal: () => void;
};

export function GeneratingScreen({
  players,
  submissions,
  loadingMessage,
  currentGalleryImage,
  hasCurrentRoundImage,
  isGalleryImageVisible,
  isHost,
  isForcingStage,
  onForceReveal,
}: GeneratingScreenProps) {
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

      <div className="relative z-50 flex min-h-full w-full flex-col items-center justify-center gap-5 p-6 py-10">
        <div className="animate-bounce text-6xl">🎨</div>
        <h2 className="text-3xl font-extrabold">Generating Images...</h2>
        <p className="max-w-md text-center text-lg">
          {loadingMessage || "Adding maximum chaos..."}
        </p>
        <p className="text-sm font-bold opacity-80">
          {submissions.length} / {players.length} ready
        </p>

        {(hasCurrentRoundImage || !currentGalleryImage) && (
          <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            {players.map((player) => {
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
                      <p className="truncate text-sm font-bold">{player.name} ✅</p>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-purple-800">
                        <div className="animate-pulse text-4xl">⏳</div>
                        <p className="mt-2 text-xs opacity-80">Generating...</p>
                      </div>
                      <p className="text-sm font-bold">{player.name}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isHost && submissions.length > 0 && (
          <button
            type="button"
            onClick={onForceReveal}
            disabled={isForcingStage}
            className="rounded-2xl bg-white px-6 py-3 font-extrabold text-purple-700 disabled:opacity-50"
          >
            {isForcingStage ? "Opening Reveal..." : "Reveal Submitted Images"}
          </button>
        )}
      </div>
    </div>
  );
}
