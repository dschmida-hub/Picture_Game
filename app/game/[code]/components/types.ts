export type GameMode = "classic" | "cards";
export type RoundDuration = number | "unlimited";
export type PromptRating = "good" | "ehhh" | "bad";

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

export type PromptSuggestion = {
  id: number;
  prompt: string;
  game_mode: GameMode;
  image_style: string | null;
  submitted_by: string;
  rating: PromptRating;
  vote_count: number;
  has_voted: boolean;
};

export type PromptLibraryItem = {
  id: number;
  prompt: string;
  game_mode: GameMode;
  source_table: "prompts" | "cah_prompts";
  prompt_rating: PromptRating | null;
};
