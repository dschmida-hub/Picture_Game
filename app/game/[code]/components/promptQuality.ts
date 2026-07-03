import { containsBannedContent } from "@/app/lib/contentPolicy";
import type { GameMode, PromptRating } from "./types";

const lowEffortPatterns = [
  /^(hi|hello|test|asdf|lol|idk|nothing|none)$/i,
  /^[?.!,\s]+$/,
];

function hasFillBlankCue(prompt: string) {
  return /_{2,}|\.{3,}|blank|fill in/i.test(prompt);
}

function hasClassicPromptCue(prompt: string) {
  return /\?|what|why|when|where|who|how|describe|invent|worst|best|most|least|unexpected|would you rather/i.test(
    prompt
  );
}

export function ratePrompt(prompt: string, gameMode: GameMode): PromptRating {
  const trimmedPrompt = prompt.trim();
  const wordCount = trimmedPrompt.split(/\s+/).filter(Boolean).length;

  if (!trimmedPrompt) return "ehhh";
  if (containsBannedContent(trimmedPrompt)) return "bad";
  if (lowEffortPatterns.some((pattern) => pattern.test(trimmedPrompt))) return "bad";
  if (trimmedPrompt.length < 18 || wordCount < 4) return "bad";
  if (trimmedPrompt.length > 150) return "ehhh";

  if (gameMode === "cards") {
    if (hasFillBlankCue(trimmedPrompt)) return "good";
    if (trimmedPrompt.length >= 40) return "ehhh";
    return "bad";
  }

  if (hasClassicPromptCue(trimmedPrompt)) return "good";
  if (wordCount >= 7) return "ehhh";

  return "bad";
}

export function getPromptRatingLabel(rating: PromptRating) {
  if (rating === "good") return "Good";
  if (rating === "ehhh") return "Ehhh";
  return "Bad";
}

export function getPromptRatingHint(rating: PromptRating, gameMode: GameMode) {
  if (rating === "good") {
    return "This should play well.";
  }

  if (rating === "ehhh") {
    return gameMode === "cards"
      ? "Could be fun, but a clearer blank usually plays better."
      : "Could work, but make it more specific or open-ended.";
  }

  return gameMode === "cards"
    ? "Try adding a clear blank, like ____ or an unfinished sentence."
    : "Try making it a full question or scenario players can riff on.";
}

export function getPromptRatingClasses(rating: PromptRating) {
  if (rating === "good") return "bg-green-100 text-green-700 border-green-300";
  if (rating === "ehhh") return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-700 border-red-300";
}
