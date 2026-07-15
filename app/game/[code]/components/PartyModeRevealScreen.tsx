"use client";

import { useState } from "react";

const REACTION_EMOJIS: { emoji: string; label: string }[] = [
  { emoji: "\u{1F602}", label: "Laughing" },
  { emoji: "\u{2764}\u{FE0F}", label: "Love it" },
  { emoji: "\u{1F631}", label: "Shocked" },
  { emoji: "\u{1F525}", label: "Fire" },
  { emoji: "\u{1F44F}", label: "Clap" },
];

type PartyModeRevealScreenProps = {
  currentImageIndex: number;
  totalImages: number;
  secondsRemainingForImage: number;
  onReact: (emoji: string) => void;
};

export function PartyModeRevealScreen({
  currentImageIndex,
  totalImages,
  secondsRemainingForImage,
  onReact,
}: PartyModeRevealScreenProps) {
  const [lastTappedEmoji, setLastTappedEmoji] = useState<string | null>(null);

  function handleTap(emoji: string) {
    onReact(emoji);
    setLastTappedEmoji(emoji);
    window.setTimeout(() => setLastTappedEmoji((current) => (current === emoji ? null : current)), 400);
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[2rem] border-2 border-black bg-white p-8 text-center shadow-[8px_8px_0_#111827]">
      <p className="text-6xl">{"\u{1F440}"}</p>
      <div>
        <h2 className="text-3xl font-black">Watching on the big screen!</h2>
        <p className="mt-2 text-sm font-bold text-zinc-500">
          Image {currentImageIndex + 1} of {totalImages} &middot; next in {Math.ceil(secondsRemainingForImage)}s
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-rose-600 transition-all"
          style={{ width: `${((currentImageIndex + 1) / totalImages) * 100}%` }}
        />
      </div>

      <p className="text-sm font-bold text-zinc-500">React to what&apos;s on screen:</p>
      <div className="flex flex-wrap justify-center gap-3">
        {REACTION_EMOJIS.map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleTap(emoji)}
            aria-label={`React with ${label}`}
            title={label}
            className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-black bg-rose-50 text-3xl shadow-[3px_3px_0_#111827] transition active:scale-90 ${
              lastTappedEmoji === emoji ? "scale-110 bg-amber-100" : ""
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
