import type { ContentRating, GameMode, PromptRating } from "../components/types";

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

const PG13_PROMPT_PATTERN =
  /\b(ass|butt|poop|pooping|toilet|fart|farting|pee|peeing|vomit|puke|barf|drunk|beer|wine|liquor|hangover|mom|mommy|mother-in-law|dating|kiss|crush|hot tub)\b/i;

export const confettiPieces = Array.from({ length: 28 }, (_, index) => ({
  color: ["#9810fa", "#facc15", "#ec4899", "#22c55e", "#38bdf8"][index % 5],
  delay: `${(index % 7) * 0.14}s`,
  left: `${(index * 37) % 100}%`,
  rotation: `${(index * 53) % 360}deg`,
}));

export function normalizeImageStyle(style: string | null | undefined) {
  const normalizedStyle = (style || "cartoon")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliases: Record<string, string> = {
    colorful_cartoon: "cartoon",
    claymation: "clay_animation",
    clay: "clay_animation",
    children_picture_book: "childrens_picture_book",
    childrens_book: "childrens_picture_book",
    childrens_picturebook: "childrens_picture_book",
    lego: "lego_stop_motion",
    lego_stopmotion: "lego_stop_motion",
    low_budget_90s: "low_budget_90s_cgi",
    nineties_cgi: "low_budget_90s_cgi",
    renaissance: "renaissance_painting",
  };

  return aliases[normalizedStyle] || normalizedStyle || "cartoon";
}

export function resolveImageStyle(promptStyle: string | null, selectedStyle: string) {
  return normalizeImageStyle(selectedStyle === "prompt" ? promptStyle || "cartoon" : selectedStyle);
}

export function normalizeContentRating(rating: string | null | undefined): ContentRating {
  return rating === "pg13" ? "pg13" : "everyone";
}

export function isPromptAllowedForContentRating(prompt: string, contentRating: ContentRating) {
  if (contentRating === "pg13") return true;
  return !PG13_PROMPT_PATTERN.test(prompt);
}

export function getContentRatingLabel(contentRating: ContentRating) {
  return contentRating === "pg13" ? "PG-13" : "Everyone";
}

export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function getImageStyleLabel(style: string) {
  const normalizedStyle = normalizeImageStyle(style);
  const labels: Record<string, string> = {
    cartoon: "Colorful Cartoon",
    comic_book: "Comic Book",
    clay_animation: "Clay Animation",
    storybook: "Storybook",
    pixel_art: "Pixel Art",
    puppet_show: "Puppet Show",
    low_budget_90s_cgi: "Low Budget 90s CGI",
    childrens_picture_book: "Children's Picture Book",
    lego_stop_motion: "LEGO Stop-Motion",
    minecraft: "Minecraft",
    renaissance_painting: "Renaissance Painting",
  };

  if (labels[normalizedStyle]) return labels[normalizedStyle];

  return normalizedStyle.split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
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
