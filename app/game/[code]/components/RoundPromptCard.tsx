import type { GameMode } from "./types";

type RoundPromptCardProps = {
  gameMode: GameMode;
  prompt: string;
  imageStyle: string;
  timeRemainingSeconds?: number | null;
  expiredMessage?: string;
  activeTimerLabel?: string;
  formatCountdown: (seconds: number) => string;
  getImageStyleLabel: (style: string) => string;
};

export function RoundPromptCard({
  gameMode,
  prompt,
  imageStyle,
  timeRemainingSeconds = null,
  expiredMessage = "Time's up — waiting for the host",
  activeTimerLabel = "Time remaining",
  formatCountdown,
  getImageStyleLabel,
}: RoundPromptCardProps) {
  const isCards = gameMode === "cards";

  return (
    <div
      className={`w-full max-w-2xl rounded-3xl p-6 text-center shadow-xl ${
        isCards ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      <div
        className={`mb-3 text-sm font-extrabold tracking-wider ${
          isCards ? "text-gray-300" : "text-purple-600"
        }`}
      >
        {isCards ? "FILL IN THE BLANK" : "ROUND PROMPT"}
      </div>

      <h2 className="break-words text-3xl font-black leading-tight">{prompt}</h2>

      <p className={`mt-3 text-sm font-bold ${isCards ? "text-gray-300" : "text-purple-600"}`}>
        Art style: {getImageStyleLabel(imageStyle)}
      </p>

      {timeRemainingSeconds !== null && (
        <p className="mt-4 text-lg font-extrabold">
          {timeRemainingSeconds === 0
            ? expiredMessage
            : `${activeTimerLabel}: ${formatCountdown(timeRemainingSeconds)}`}
        </p>
      )}
    </div>
  );
}
