import type { GameMode, PromptRating } from "../components/types";

export type PromptSource = GameMode | `custom_${GameMode}`;

export type PromptOption = {
  id: number;
  prompt: string;
  image_style: string | null;
  prompt_rating?: PromptRating | null;
  source: PromptSource;
  rating: PromptRating;
};

export const MAX_PLAYERS = 8;
export const ROOM_LIFETIME_HOURS = 24;

export const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  color: ["#9810fa", "#facc15", "#ec4899", "#22c55e", "#38bdf8"][index % 5],
  delay: `${(index % 7) * 0.14}s`,
  left: `${(index * 37) % 100}%`,
  rotation: `${(index * 53) % 360}deg`,
}));

export function resolveImageStyle(promptStyle: string | null, selectedStyle: string) {
  return selectedStyle === "prompt" ? promptStyle || "cartoon" : selectedStyle;
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function getImageStyleLabel(style: string) {
  return style.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export function pickBestRatedPromptDeck(prompts: PromptOption[]) {
  const goodPrompts = prompts.filter((prompt) => prompt.rating === "good");
  if (goodPrompts.length > 0) return goodPrompts;

  const okayPrompts = prompts.filter((prompt) => prompt.rating === "ehhh");
  if (okayPrompts.length > 0) return okayPrompts;

  return prompts;
}

export function getPromptRatingTable(promptSource: PromptSource | null) {
  if (promptSource === "classic") return "prompts";
  if (promptSource === "cards") return "cah_prompts";
  return null;
}

export function normalizePlayerName(playerName: string) {
  return playerName.trim().replace(/\s+/g, " ");
}

export function arePlayerNamesEqual(firstName: string, secondName: string) {
  return normalizePlayerName(firstName).toLowerCase() === normalizePlayerName(secondName).toLowerCase();
}

export function getRoomExpiresAt(createdAt: string | null) {
  if (!createdAt) return null;

  return new Date(new Date(createdAt).getTime() + ROOM_LIFETIME_HOURS * 60 * 60 * 1000);
}

export function formatRoomExpiration(createdAt: string | null) {
  const expiresAt = getRoomExpiresAt(createdAt);

  if (!expiresAt) {
    return "Room expires 24 hours after the first round starts.";
  }

  const now = Date.now();
  const msRemaining = expiresAt.getTime() - now;

  if (msRemaining <= 0) return "Room expired. Start a fresh room soon.";

  const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));

  if (hoursRemaining <= 1) return "Room expires in under 1 hour.";

  return `Room expires in about ${hoursRemaining} hours.`;
}
