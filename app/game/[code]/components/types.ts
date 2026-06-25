export type GameMode = "classic" | "cards";
export type RoundDuration = number | "unlimited";

export type Player = {
  name: string;
  points: number;
  avatar_url: string | null;
  avatar_description?: string | null;
  is_host: boolean;
};

export type ScoreboardPlayer = {
  name: string;
  points: number;
  avatar_url: string | null;
};

export type RoundHistoryItem = {
  id: number;
  round_number: number;
  winner_name: string;
  winner_prompt: string;
  winner_image_url: string | null;
  gallery_thumbnail_url?: string | null;
};
